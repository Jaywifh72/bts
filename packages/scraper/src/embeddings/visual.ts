import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-28 — visual embeddings on production_keyframes via SigLIP-2.
 *
 * Replicate hosts the model under `lucataco/siglip-2`; we POST the
 * keyframe URL and get back a 768-dim float vector. Costs ~$0.0002
 * per image. Stored in pgvector for HNSW cosine-similarity queries
 * (powers "looks like this shot" search across the keyframe corpus).
 *
 * Requires REPLICATE_API_TOKEN. Without it, this throws with a
 * clear message — caller decides whether to skip the run.
 */

const REPLICATE_BASE = 'https://api.replicate.com/v1';
// Pinned hash for stability — re-pin if the model is re-deployed
// and the embedding distribution shifts; existing rows would need a
// refresh in that case.
const SIGLIP2_VERSION = 'lucataco/siglip-2:7e0fb7e1ba90bf7e91b1dbcb4e0a16e9c9e95c2a8a53f30e9b56f6f2c8b8f1a2';

export class MissingReplicateTokenError extends Error {
  constructor() {
    super('REPLICATE_API_TOKEN env var not set on server.');
  }
}

/**
 * POST a prediction, then poll until it lands. Replicate's prediction
 * lifecycle is starting → processing → succeeded|failed. We poll at
 * 1.5s spacing — small images usually return < 5s.
 */
async function siglip2Embed(imageUrl: string): Promise<number[]> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new MissingReplicateTokenError();

  const create = await fetch(`${REPLICATE_BASE}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: SIGLIP2_VERSION.split(':')[1],
      input: { image: imageUrl },
    }),
  });
  if (!create.ok) {
    const body = await create.text().catch(() => '');
    throw new Error(`Replicate create ${create.status}: ${body.slice(0, 200)}`);
  }
  const prediction = (await create.json()) as { id: string; status: string; output: number[] | null; error: string | null };

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
    const status = (await poll.json()) as { status: string; output: number[] | null; error: string | null };
    if (status.status === 'succeeded' && status.output) return status.output;
    if (status.status === 'failed') {
      throw new Error(`Replicate failed: ${status.error ?? 'unknown'}`);
    }
  }
  throw new Error(`Replicate prediction ${prediction.id} timed out after 30s`);
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
  const filterClause = opts.refresh ? sql`TRUE` : sql`embedding IS NULL`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; image_url: string }>(sql`
    SELECT id, image_url FROM production_keyframes
    WHERE ${filterClause}
    ORDER BY id
    ${limitClause}
  `);

  console.log(`embed:visual — ${targets.length} key frames to process`);

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
      if (e instanceof MissingReplicateTokenError) throw e;
      console.error(`  keyframe ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `embed:visual done — attempted=${stats.attempted} embedded=${stats.embedded} errors=${stats.errors}`,
  );
  return stats;
}
