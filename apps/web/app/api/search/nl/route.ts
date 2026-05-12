import { NextResponse, type NextRequest } from 'next/server';
import { db, searchProductionsCombined } from '@bts/db';
import { extractFilters, MissingApiKeyError } from '@/lib/nl-extract';
import { rateLimit } from '@/lib/rate-limit';

/**
 * E-31 — natural-language search.
 *
 * Pipeline:
 *  1. Send the user's query to GPT-4o-mini with a strict JSON schema
 *     to extract typed filters (director / DP / year window / aspect /
 *     format / themes).
 *  2. If `themes` is non-empty, embed it via text-embedding-3-small.
 *  3. Run a combined SQL query that applies the structural filters
 *     (EXISTS clauses against crew_assignments + production_formats)
 *     and orders by cosine similarity to the theme embedding when set.
 *
 * Cost: roughly $0.0003 per query (mini extraction) + $0.00001
 * (theme embedding). The route is cached for 1 hour at the edge so
 * the same query embedded twice is free.
 */

export const runtime = 'nodejs';
export const revalidate = 3600;

const EMBED_ENDPOINT = 'https://api.openai.com/v1/embeddings';

async function embedThemes(text: string, key: string): Promise<number[] | null> {
  if (!text.trim()) return null;
  const res = await fetch(EMBED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text, encoding_format: 'float' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI embeddings ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0]?.embedding ?? null;
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, { namespace: 'search:nl', limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  if (q.length > 500) return NextResponse.json({ error: 'query_too_long' }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'embeddings_unavailable', detail: 'OPENAI_API_KEY not set on server' },
      { status: 503 },
    );
  }

  let filters;
  try {
    filters = await extractFilters(q);
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      return NextResponse.json({ error: 'embeddings_unavailable' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'extract_failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  let queryEmbedding: number[] | null = null;
  if (filters.themes.trim()) {
    try {
      queryEmbedding = await embedThemes(filters.themes, key);
    } catch (e) {
      // Soft-fail: structural filters still work without a theme rerank.
      console.error('theme embed failed, falling back to structural sort:', e);
    }
  }

  const results = await searchProductionsCombined(
    db,
    filters,
    queryEmbedding,
    filters.limit,
  );

  return NextResponse.json(
    { query: q, filters, count: results.length, results },
    {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
