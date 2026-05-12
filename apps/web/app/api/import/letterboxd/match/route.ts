import { db, sql } from '@bts/db';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * E-45 — match Letterboxd watch entries against curated productions.
 * Body: { entries: Array<{ title: string; year: number | null }> }.
 * Returns the same array enriched with optional production_slug,
 * data_tier, and a basic match score.
 */

type Entry = { title: string; year: number | null };
type Match = Entry & {
  production_slug: string | null;
  production_title: string | null;
  data_tier: string | null;
  release_year: number | null;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, { namespace: 'import:letterboxd', limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const entries = (body as { entries?: unknown }).entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return Response.json({ error: 'entries required (non-empty array)' }, { status: 400 });
  }
  if (entries.length > 5000) {
    return Response.json({ error: 'max 5000 entries per request' }, { status: 400 });
  }

  // Normalize the input. Skip empties.
  const cleaned: Entry[] = entries
    .filter((e: unknown): e is { title: string; year: unknown } =>
      typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).title === 'string')
    .map((e) => ({
      title: e.title,
      year: typeof e.year === 'number' ? e.year : (typeof e.year === 'string' && /^\d{4}$/.test(e.year) ? Number(e.year) : null),
    }));

  // Pull every production once (~10k rows) so we match in-memory; cheap
  // enough to skip a per-entry DB roundtrip.
  type Row = { slug: string; title: string; release_year: number | null; data_tier: string };
  const all = await db.execute<Row>(sql`
    SELECT slug, title, release_year, data_tier::text FROM productions
  `);

  // Build a multimap: normalized-title → list of rows.
  const byTitle = new Map<string, Row[]>();
  for (const row of all) {
    const k = normalize(row.title);
    const list = byTitle.get(k) ?? [];
    list.push(row);
    byTitle.set(k, list);
  }

  const matches: Match[] = cleaned.map((e) => {
    const candidates = byTitle.get(normalize(e.title)) ?? [];
    if (candidates.length === 0) {
      return { ...e, production_slug: null, production_title: null, data_tier: null, release_year: null };
    }
    // Prefer year match within ±1 year; else the only candidate; else first.
    let pick = candidates[0];
    if (e.year != null) {
      const yearMatch = candidates.find((c) => c.release_year != null && Math.abs(c.release_year - e.year!) <= 1);
      if (yearMatch) pick = yearMatch;
    }
    return {
      ...e,
      production_slug: pick!.slug,
      production_title: pick!.title,
      data_tier: pick!.data_tier,
      release_year: pick!.release_year,
    };
  });

  // Summary counts.
  const counts = {
    total: matches.length,
    matched: matches.filter((m) => m.production_slug !== null).length,
    curated: matches.filter((m) => m.data_tier === 'curated').length,
    unmatched: matches.filter((m) => m.production_slug === null).length,
  };

  return Response.json({ matches, counts });
}
