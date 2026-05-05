import { NextResponse, type NextRequest } from 'next/server';
import { db, search } from '@bts/db';

/**
 * T5-1 — autocomplete endpoint for the TopNav SearchBar. Debounced
 * client-side; this route just runs the existing trigram search with
 * a tighter per-category cap so the dropdown stays compact.
 *
 * Returns 8 results max. Bare-bones JSON so the wire payload stays small.
 */
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ results: [] }, { headers: cacheHeaders() });
  }
  // Cap each category at 3, total at 8.
  const all = await search(db, q, 3);
  const results = all.slice(0, 8).map((r) => ({
    category: r.category,
    display: r.display,
    subtitle: r.subtitle,
    href: r.href,
    score: r.score,
  }));
  return NextResponse.json({ results }, { headers: cacheHeaders() });
}

function cacheHeaders() {
  return {
    // 30s edge cache; suggestions don't need to be instantaneously fresh.
    'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
  };
}
