import { NextResponse, type NextRequest } from 'next/server';
import { db, sql } from '@bts/db';
import { rateLimit } from '@/lib/rate-limit';

/**
 * /api/lookbook/search — visual reverse search.
 *
 * Workflow:
 *   1. Client POSTs an image (multipart form field "image", or JSON {url}).
 *   2. We forward to the SigLIP-2 encoder at SIGLIP_ENCODER_URL → 768-dim vec.
 *   3. pgvector cosine-distance HNSW lookup against production_keyframes.embedding.
 *   4. Return top-K matches with production context.
 *
 * Fallback: when SIGLIP_ENCODER_URL is unset (no Modal deploy yet), respond
 * 503 with a documented error rather than crash. The /lookbook page handles
 * the "feature unavailable" state.
 *
 * Rate limit: 20/min/IP — modest because each call invokes paid GPU inference
 * on the encoder side.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;  // 8MB upload cap
const TOP_K = 24;

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { namespace: 'lookbook', limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const encoderUrl = process.env.SIGLIP_ENCODER_URL;
  if (!encoderUrl) {
    return NextResponse.json(
      {
        error: 'lookbook_unavailable',
        message: 'Visual search is not configured. Set SIGLIP_ENCODER_URL once the SigLIP-2 inference endpoint is deployed (see docs/runbooks/siglip2-inference.md).',
      },
      { status: 503 },
    );
  }

  // Two ingest paths: multipart file upload OR JSON {url: "<image-url>"}.
  let encoderPayload: { url?: string; b64?: string };
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('image');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'no image' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'image too large', maxBytes: MAX_BYTES }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    encoderPayload = { b64: bytes.toString('base64') };
  } else if (contentType.includes('application/json')) {
    const json = await req.json().catch(() => null);
    if (!json || typeof json.url !== 'string') {
      return NextResponse.json({ error: 'json body must include {url: string}' }, { status: 400 });
    }
    encoderPayload = { url: json.url };
  } else {
    return NextResponse.json(
      { error: 'unsupported content-type', expected: ['multipart/form-data', 'application/json'] },
      { status: 415 },
    );
  }

  // Call the encoder. 15s timeout — base SigLIP at A10G ~250ms warm, ~3s cold.
  let embedding: number[];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const encRes = await fetch(encoderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(encoderPayload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!encRes.ok) {
      return NextResponse.json(
        { error: 'encoder_failed', status: encRes.status },
        { status: 502 },
      );
    }
    const body = (await encRes.json()) as { embedding?: number[] };
    if (!Array.isArray(body.embedding) || body.embedding.length !== 768) {
      return NextResponse.json(
        { error: 'encoder_returned_invalid_embedding', dim: body.embedding?.length ?? 'missing' },
        { status: 502 },
      );
    }
    embedding = body.embedding;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'encoder_unreachable', detail: message },
      { status: 502 },
    );
  }

  // pgvector literal: '[0.1, 0.2, ...]'::vector
  const vectorLiteral = `[${embedding.join(',')}]`;
  const matches = await db.execute<{
    keyframe_id: number;
    production_id: number;
    production_slug: string;
    production_title: string;
    scene_slug: string | null;
    scene_title: string | null;
    image_url: string;
    distance: number;
  }>(sql`
    SELECT k.id AS keyframe_id,
           k.production_id,
           p.slug AS production_slug,
           p.title AS production_title,
           sc.slug AS scene_slug,
           sc.title AS scene_title,
           k.image_url,
           (k.embedding <=> ${vectorLiteral}::vector) AS distance
    FROM production_keyframes k
    JOIN productions p ON p.id = k.production_id
    LEFT JOIN scenes sc ON sc.id = k.scene_id
    WHERE k.embedding IS NOT NULL
    ORDER BY k.embedding <=> ${vectorLiteral}::vector
    LIMIT ${TOP_K}
  `);

  return NextResponse.json({
    matches,
    encoder: { model: 'siglip2-base-patch16-384', dim: 768 },
  });
}
