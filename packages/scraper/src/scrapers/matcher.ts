import 'dotenv/config';
import Fuse from 'fuse.js';
import { db, sql } from '@bts/db';

type ProductionRow = { slug: string; title: string; release_year: number | null };

let _cache: ProductionRow[] | null = null;

async function loadProductions(): Promise<ProductionRow[]> {
  if (_cache) return _cache;
  const rows = await db.execute<ProductionRow>(sql`
    SELECT slug, title, release_year FROM productions ORDER BY release_year, title
  `);
  _cache = [...rows];
  return _cache;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Substring-match an article title to a curated production. Article
 * titles ("Foo Movie: VFX Breakdown") usually contain the production
 * name verbatim; this matcher avoids the false-positive class that
 * `matchProduction` (Fuse fuzzy) hits when the article shares a couple
 * of words with an unrelated production title.
 *
 * Algorithm:
 *  1. Normalize the article title (lowercase, strip punctuation).
 *  2. For each production: check if its (normalized) title appears as
 *     a whole-word substring of the article title.
 *  3. Skip productions with very short titles (< 4 chars after norm) —
 *     too generic, would match anywhere.
 *  4. Among multiple matches, prefer the longest match (more specific
 *     wins).
 *  5. If a year hint is provided, require it match release_year ± 1.
 */
export async function matchProductionByContext(
  articleTitle: string,
  yearHint: number | null,
): Promise<string | null> {
  const all = await loadProductions();
  const haystack = ` ${normalizeTitle(articleTitle)} `;

  let best: { slug: string; length: number } | null = null;
  for (const p of all) {
    const needle = normalizeTitle(p.title);
    if (needle.length < 4) continue;
    if (!haystack.includes(` ${needle} `)) continue;

    // Single-word titles (e.g. "Wonder", "Up", "It", "Her") false-match
    // too easily — "Wonder Man" article hits production "Wonder", "Up"
    // hits anywhere in prose. Require either ≥2 words OR an exact year
    // match for confidence.
    const wordCount = needle.split(/\s+/).filter(Boolean).length;
    if (wordCount < 2) {
      if (yearHint === null || p.release_year !== yearHint) continue;
    } else if (yearHint !== null && p.release_year !== null) {
      if (Math.abs(p.release_year - yearHint) > 1) continue;
    }

    if (!best || needle.length > best.length) {
      best = { slug: p.slug, length: needle.length };
    }
  }
  return best?.slug ?? null;
}

/**
 * Given a scraped film title and year, return the matching production_slug
 * or null if no confident match is found.
 *
 * Algorithm:
 *  1. Filter productions to exact release_year match (or all if year unknown).
 *  2. Run fuse.js fuzzy search on title with threshold 0.3.
 *  3. Accept only if exactly one candidate scores above threshold.
 */
export async function matchProduction(
  title: string,
  year: number | null,
): Promise<string | null> {
  const all = await loadProductions();
  const pool = year !== null ? all.filter((p) => p.release_year === year) : all;

  if (pool.length === 0) return null;

  const fuse = new Fuse(pool, {
    keys: ['title'],
    threshold: 0.3,
    includeScore: true,
  });

  const results = fuse.search(title);
  if (results.length === 1) return results[0]!.item.slug;
  if (results.length > 1) {
    // Accept only if top result score is significantly better than second
    const top = results[0]!.score ?? 1;
    const second = results[1]!.score ?? 1;
    if (top < 0.1 && second > top * 2) return results[0]!.item.slug;
  }
  return null;
}
