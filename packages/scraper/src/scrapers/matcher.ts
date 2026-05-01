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
