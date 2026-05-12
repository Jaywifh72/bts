import 'dotenv/config';
import { db, sql } from '@bts/db';
import { fetchMovieReleaseDates, type TmdbReleaseDate } from './client.ts';

/**
 * T2-4: Pulls /movie/{id}/release_dates and stores the flattened result
 * on productions.release_dates (JSONB). Idempotent.
 *
 * Targeting: by default only rows whose release_dates is NULL (never
 * fetched). Pass `--refresh` to refetch every row that has a tmdb_id.
 *
 * Empty arrays are written as `[]` (not NULL) so we can distinguish
 * "fetched but TMDb has nothing" from "never fetched."
 */

export type ReleaseDatesStats = {
  attempted: number;
  updated: number;
  emptied: number;
  skipped: number;
};

export async function enrichReleaseDates(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<ReleaseDatesStats> {
  const stats: ReleaseDatesStats = { attempted: 0, updated: 0, emptied: 0, skipped: 0 };

  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    console.error('TMDB_READ_ACCESS_TOKEN not set; aborting.');
    return stats;
  }

  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;
  const filterClause = opts.refresh
    ? sql`tmdb_id IS NOT NULL`
    : sql`tmdb_id IS NOT NULL AND release_dates IS NULL`;

  const targets = await db.execute<{ id: number; tmdb_id: number; title: string }>(sql`
    SELECT id, tmdb_id, title FROM productions
    WHERE ${filterClause}
    ORDER BY popularity DESC NULLS LAST, id
    ${limitClause}
  `);

  console.log(`tmdb:release-dates — ${targets.length} rows to fetch (refresh=${!!opts.refresh})`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const dates: TmdbReleaseDate[] | null = await fetchMovieReleaseDates(row.tmdb_id);
      if (dates === null) {
        stats.skipped++;
        continue;
      }
      await db.execute(sql`
        UPDATE productions
        SET release_dates = ${JSON.stringify(dates)}::jsonb,
            updated_at = NOW()
        WHERE id = ${row.id}
      `);
      if (dates.length === 0) stats.emptied++;
      else stats.updated++;
    } catch (e) {
      stats.skipped++;
      console.error(`  ${row.title} (tmdb=${row.tmdb_id}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `tmdb:release-dates done — attempted=${stats.attempted} updated=${stats.updated} emptied=${stats.emptied} skipped=${stats.skipped}`,
  );
  return stats;
}
