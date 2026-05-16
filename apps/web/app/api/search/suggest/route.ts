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
  // UX-audit Move 6 — prefix-mode filter so the ⌘K palette can route
  // `@text` to people, `#text` to sources, etc. Falls back to multi-category
  // when no `kind` filter is given.
  const kindParam = req.nextUrl.searchParams.get('kind') ?? '';
  if (q.length < 2) {
    return NextResponse.json({ results: [] }, { headers: cacheHeaders() });
  }
  // Cap each category at 3 (8 total for the unfiltered case, 8 for filtered).
  const all = await search(db, q, kindParam ? 8 : 3);
  const filtered = kindParam
    ? all.filter((r) => r.category === kindParam)
    : all;
  const results = filtered.slice(0, 8).map((r) => ({
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
