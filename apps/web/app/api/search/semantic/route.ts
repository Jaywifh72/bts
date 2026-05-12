import { NextResponse, type NextRequest } from 'next/server';
import { db, searchProductionsByEmbedding } from '@bts/db';
import { rateLimit } from '@/lib/rate-limit';

/**
 * E-27 — semantic-search API. Takes `?q=...`, embeds it via OpenAI,
 * runs pgvector cosine-similarity against `productions.embedding`,
 * returns top-K. Cached at the edge for 1 hour because the same
 * query embedded twice will hit the same K-NN result.
 *
 * Falls back to 503 when OPENAI_API_KEY is unset; the existing
 * /api/search/suggest path still serves trigram autocomplete in that
 * case so the UI degrades gracefully.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const ENDPOINT = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';

async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, input: text, encoding_format: 'float' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0]?.embedding ?? null;
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, { namespace: 'search:semantic', limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  }
  if (q.length > 500) {
    return NextResponse.json({ error: 'query_too_long' }, { status: 400 });
  }

  let queryEmbedding: number[] | null;
  try {
    queryEmbedding = await embedQuery(q);
  } catch (e) {
    return NextResponse.json(
      { error: 'embed_failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
  if (!queryEmbedding) {
    return NextResponse.json(
      { error: 'embeddings_unavailable', detail: 'OPENAI_API_KEY not set on server' },
      { status: 503 },
    );
  }

  const results = await searchProductionsByEmbedding(db, queryEmbedding, 12);

  return NextResponse.json(
    { query: q, count: results.length, results },
    {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
