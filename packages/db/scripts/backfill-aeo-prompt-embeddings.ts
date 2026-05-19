// Backfill `aeo_prompts.text_embedding` with OpenAI text-embedding-3-small
// (1536-d, matches /ask + keyframes). Idempotent: only fetches for rows
// where text_embedding IS NULL.
//
// Usage:
//   OPENAI_API_KEY=sk-... pnpm --filter @bts/db exec tsx scripts/backfill-aeo-prompt-embeddings.ts
//
// Optional:
//   AEO_EMBEDDING_BATCH=20   # rows per OpenAI request (max 256 per the API)
//   DRY_RUN=1                # count only, no API calls, no writes

import 'dotenv/config';
import { db, sql } from '../src/index.ts';

const key = process.env.OPENAI_API_KEY;
const batchSize = clampInt(process.env.AEO_EMBEDDING_BATCH, 1, 256, 20);
const DRY_RUN = process.env.DRY_RUN === '1';

if (!key && !DRY_RUN) {
  console.error('[!] OPENAI_API_KEY required (or set DRY_RUN=1)');
  process.exit(1);
}

const todo = await db.execute<{ id: string; prompt_text: string }>(sql`
  SELECT id::text AS id, prompt_text
  FROM aeo_prompts
  WHERE text_embedding IS NULL
    AND deprecated_on IS NULL
  ORDER BY created_at
`);

console.log(`[i] prompts needing embedding: ${todo.length}`);
if (todo.length === 0) {
  console.log('[+] nothing to do');
  process.exit(0);
}
if (DRY_RUN) {
  console.log('[dry-run] not calling OpenAI');
  process.exit(0);
}

let done = 0;
for (let i = 0; i < todo.length; i += batchSize) {
  const batch = todo.slice(i, i + batchSize);
  const inputs = batch.map((r) => r.prompt_text);

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: inputs, encoding_format: 'float' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
  // OpenAI returns one embedding per input, ordered by `index`.
  json.data.sort((a, b) => a.index - b.index);

  for (let k = 0; k < batch.length; k++) {
    const row = batch[k]!;
    const emb = json.data[k]?.embedding;
    if (!emb || emb.length !== 1536) {
      throw new Error(`embedding length mismatch for prompt id=${row.id}`);
    }
    // pgvector accepts the canonical text form '[v1,v2,...]'.
    const vec = `[${emb.join(',')}]`;
    await db.execute(sql`
      UPDATE aeo_prompts
      SET text_embedding = ${vec}::vector
      WHERE id = ${row.id}::uuid
    `);
    done++;
  }
  console.log(`[+] batch ${i / batchSize + 1}: ${done}/${todo.length}`);
}

console.log(`[+] backfill complete — ${done} prompts embedded`);
process.exit(0);

function clampInt(raw: string | undefined, min: number, max: number, dflt: number): number {
  if (raw == null) return dflt;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
