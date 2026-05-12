import 'dotenv/config';
import { db, sql } from '@bts/db';
import { fetchPerson } from './client.ts';

/**
 * Targeted backfill: only fetches TMDb profile_path for people who have
 * a tmdb_person_id but no profile_path. Distinct from `enrichPersons`,
 * which only runs on rows missing a bio — many people have bios but no
 * profile_path because the TMDb response had a null profile_path at the
 * time, then TMDb later added one.
 *
 * Idempotent: re-running only hits rows still missing profile_path.
 * Pass --refresh to re-pull EVERY tmdb_person_id row (rate-limited).
 */

export type BackfillStats = {
  attempted: number;
  updated: number;
  still_null: number;
  errors: number;
};

export async function backfillProfilePaths(opts: { limit?: number; refresh?: boolean } = {}): Promise<BackfillStats> {
  const stats: BackfillStats = { attempted: 0, updated: 0, still_null: 0, errors: 0 };

  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    console.error('TMDB_READ_ACCESS_TOKEN not set; aborting.');
    return stats;
  }

  const targets = await db.execute<{ id: number; tmdb_person_id: number; display_name: string }>(sql`
    SELECT id, tmdb_person_id, display_name FROM people
    WHERE tmdb_person_id IS NOT NULL
      AND ${opts.refresh ? sql`TRUE` : sql`profile_path IS NULL`}
    ORDER BY id
    ${opts.limit ? sql`LIMIT ${opts.limit}` : sql``}
  `);

  console.log(`tmdb:profile-paths — ${targets.length} rows to backfill`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const person = await fetchPerson(row.tmdb_person_id);
      if (!person) {
        stats.errors++;
        continue;
      }
      if (!person.profile_path) {
        stats.still_null++;
      } else {
        await db.execute(sql`
          UPDATE people SET
            profile_path = ${person.profile_path},
            updated_at = NOW()
          WHERE id = ${row.id}
        `);
        stats.updated++;
      }
    } catch (e) {
      stats.errors++;
      console.error(
        `  ✗ tmdb_person_id=${row.tmdb_person_id} (${row.display_name}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (stats.attempted % 200 === 0) {
      console.log(`  ${stats.attempted}/${targets.length} — updated ${stats.updated}, still null on TMDb ${stats.still_null}, errors ${stats.errors}`);
    }
  }

  console.log(`tmdb:profile-paths done — attempted ${stats.attempted}, updated ${stats.updated}, still null on TMDb ${stats.still_null}, errors ${stats.errors}`);
  return stats;
}
