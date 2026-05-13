import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-28 — visual embeddings on production_keyframes via SigLIP-2.
 *
 * Two supported backends, picked at runtime by env var precedence:
 *
 *   1. **Modal** (preferred). Set `SIGLIP_ENCODER_URL` to the endpoint
 *      printed by `modal deploy packages/scraper/src/embeddings/
 *      modal_siglip.py`. Same endpoint the `/api/lookbook/search`
 *      route uses, so one config covers both backfill + live query.
 *      Cost: ~$0.000077/image warm, ~$3.85 for a 50k-keyframe one-shot.
 *      See docs/runbooks/siglip2-inference.md.
 *
 *   2. **Replicate** (legacy fallback). Set `REPLICATE_API_TOKEN`.
 *      Hosts the model under `lucataco/siglip-2`; ~$0.0002/image.
 *      Kept for environments where Modal isn't set up.
 *
 * If neither env is set: throws `MissingSiglipBackendError` with a
 * pointer to the runbook. The caller (CLI / admin job) treats that
 * as a configuration failure, not a per-row error.
 *
 * Output: 768-dim float vectors. Stored in pgvector for HNSW
 * cosine-similarity queries (powers "looks like this shot" search).
 */

const REPLICATE_BASE = 'https://api.replicate.com/v1';
// Pinned hash for stability — re-pin if the model is re-deployed
// and the embedding distribution shifts; existing rows would need a
// refresh in that case.
const SIGLIP2_REPLICATE_VERSION =
  '7e0fb7e1ba90bf7e91b1dbcb4e0a16e9c9e95c2a8a53f30e9b56f6f2c8b8f1a2';

export class MissingSiglipBackendError extends Error {
  constructor() {
    super(
      'No SigLIP-2 backend configured. Set either SIGLIP_ENCODER_URL ' +
        '(Modal — recommended; see docs/runbooks/siglip2-inference.md) ' +
        'or REPLICATE_API_TOKEN (legacy fallback).',
    );
  }
}

// Kept exported under the old name for any external callers that
// caught it specifically. New code should catch MissingSiglipBackendError.
export const MissingReplicateTokenError = MissingSiglipBackendError;

/**
 * Modal-backend embed. POSTs the image URL to the encoder; the encoder
 * fetches the image server-side and returns the normalised 768-dim
 * vector. Matches the contract in apps/web/app/api/lookbook/search/route.ts.
 */
async function siglip2EmbedViaModal(imageUrl: string, encoderUrl: string): Promise<number[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(encoderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Modal encoder ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { embedding?: number[] };
    if (!Array.isArray(json.embedding)) {
      throw new Error('Modal encoder returned no `embedding` array.');
    }
    return json.embedding;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Replicate-backend embed. POST a prediction, then poll until it lands.
 * Replicate's prediction lifecycle is starting → processing →
 * succeeded|failed. We poll at 1.5s spacing — small images usually
 * return < 5s.
 */
async function siglip2EmbedViaReplicate(imageUrl: string, token: string): Promise<number[]> {
  const create = await fetch(`${REPLICATE_BASE}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: SIGLIP2_REPLICATE_VERSION,
      input: { image: imageUrl },
    }),
  });
  if (!create.ok) {
    const body = await create.text().catch(() => '');
    throw new Error(`Replicate create ${create.status}: ${body.slice(0, 200)}`);
  }
  const prediction = (await create.json()) as {
    id: string;
    status: string;
    output: number[] | null;
    error: string | null;
  };

  // If `Prefer: wait` returned a terminal status synchronously, take it.
  if (prediction.status === 'succeeded' && prediction.output) {
    return prediction.output;
  }
  if (prediction.status === 'failed') {
    throw new Error(`Replicate failed: ${prediction.error ?? 'unknown'}`);
  }

  // Poll until done (max ~30s).
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(`${REPLICATE_BASE}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    const status = (await poll.json()) as {
      status: string;
      output: number[] | null;
      error: string | null;
    };
    if (status.status === 'succeeded' && status.output) return status.output;
    if (status.status === 'failed') {
      throw new Error(`Replicate failed: ${status.error ?? 'unknown'}`);
    }
  }
  throw new Error(`Replicate prediction ${prediction.id} timed out after 30s`);
}

/**
 * Backend-agnostic dispatch. Picks Modal if `SIGLIP_ENCODER_URL` is
 * set; falls back to Replicate via `REPLICATE_API_TOKEN`. Throws
 * MissingSiglipBackendError if neither is configured.
 */
async function siglip2Embed(imageUrl: string): Promise<number[]> {
  const encoderUrl = process.env.SIGLIP_ENCODER_URL;
  if (encoderUrl) return siglip2EmbedViaModal(imageUrl, encoderUrl);

  const token = process.env.REPLICATE_API_TOKEN;
  if (token) return siglip2EmbedViaReplicate(imageUrl, token);

  throw new MissingSiglipBackendError();
}

export type VisualEmbeddingStats = {
  attempted: number;
  embedded: number;
  errors: number;
};

export async function extractKeyFrameVisualEmbeddings(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<VisualEmbeddingStats> {
  const stats: VisualEmbeddingStats = { attempted: 0, embedded: 0, errors: 0 };

  // Fail-fast: surface the misconfiguration BEFORE we count keyframes.
  // Without this the operator sees "embed:visual — 2 key frames to
  // process" followed by an exception, which reads as a partial run
  // when actually nothing was attempted.
  if (!process.env.SIGLIP_ENCODER_URL && !process.env.REPLICATE_API_TOKEN) {
    throw new MissingSiglipBackendError();
  }

  const filterClause = opts.refresh ? sql`TRUE` : sql`embedding IS NULL`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; image_url: string }>(sql`
    SELECT id, image_url FROM production_keyframes
    WHERE ${filterClause}
    ORDER BY id
    ${limitClause}
  `);

  const backend = process.env.SIGLIP_ENCODER_URL ? 'modal' : 'replicate';
  console.log(`embed:visual — ${targets.length} key frames to process (backend=${backend})`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const vec = await siglip2Embed(row.image_url);
      if (vec.length !== 768) {
        throw new Error(`expected 768-dim embedding, got ${vec.length}`);
      }
      // pgvector expects '[a,b,c]' literal format.
      const literal = `[${vec.join(',')}]`;
      await db.execute(sql`
        UPDATE production_keyframes
        SET embedding = ${literal}::vector, updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.embedded++;
    } catch (e) {
      stats.errors++;
      if (e instanceof MissingSiglipBackendError) throw e;
      console.error(`  keyframe ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `embed:visual done — attempted=${stats.attempted} embedded=${stats.embedded} errors=${stats.errors}`,
  );
  return stats;
}
