import 'dotenv/config';

/**
 * E-27 — minimal OpenAI embeddings client. No SDK dependency; the API
 * is small enough that raw fetch is cleaner than another supply-chain
 * surface.
 *
 * Model: text-embedding-3-small. 1536 dims, $0.02/M tokens (May 2026).
 * Our corpus (~539 productions × ~100 tokens each, ~11k people × ~30
 * tokens) is well under $1 to fully embed.
 */

const ENDPOINT = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const MAX_BATCH = 100; // OpenAI accepts up to 2048 inputs per call; we batch smaller for memory

export class MissingApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY env var not set. Add it to packages/scraper/.env or apps/web/.env.local.');
  }
}

type EmbeddingResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
};

/**
 * Embed a batch of strings. Returns a parallel array of 1536-dim
 * vectors. Throws if any input is empty (OpenAI rejects those).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new MissingApiKeyError();
  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH) {
    // Recurse — keeps callers simple.
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      const slice = texts.slice(i, i + MAX_BATCH);
      const res = await embedBatch(slice);
      out.push(...res);
    }
    return out;
  }

  // OpenAI rejects empty strings; substitute a single space.
  const safe = texts.map((t) => (t.trim() ? t : ' '));

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, input: safe, encoding_format: 'float' }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as EmbeddingResponse;
  // Sort by index to guarantee order parallel to input.
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}
