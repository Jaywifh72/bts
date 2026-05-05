import 'dotenv/config';
import { db, sql } from '@bts/db';
import { fetchPerson } from './client.ts';

/**
 * T3-1 + T2-5: enrich `people` rows that have a tmdb_person_id but no
 * biography. Pulls bio, place_of_birth (used as country if we don't have
 * one), birthday, deathday, also_known_as (merged into aliases), imdb_id,
 * wikidata_id from TMDb's /person/{id} endpoint.
 *
 * Idempotent: rows that already have a bio are skipped. Pass
 * --refresh to re-pull everything.
 */

export type PersonsStats = {
  attempted: number;
  enriched: number;
  skipped: number;
};

export async function enrichPersons(opts: { limit?: number; refresh?: boolean } = {}): Promise<PersonsStats> {
  const stats: PersonsStats = { attempted: 0, enriched: 0, skipped: 0 };

  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    console.error('TMDB_READ_ACCESS_TOKEN not set; aborting.');
    return stats;
  }

  // Default: only people with tmdb_person_id and no bio. With --refresh,
  // walk every person with tmdb_person_id regardless.
  const targets = await db.execute<{ id: number; tmdb_person_id: number; display_name: string }>(sql`
    SELECT id, tmdb_person_id, display_name FROM people
    WHERE tmdb_person_id IS NOT NULL
      AND ${opts.refresh ? sql`TRUE` : sql`(bio IS NULL OR bio = '')`}
    ORDER BY id
    ${opts.limit ? sql`LIMIT ${opts.limit}` : sql``}
  `);

  console.log(`tmdb:persons — ${targets.length} rows to enrich`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const person = await fetchPerson(row.tmdb_person_id);
      if (!person) {
        stats.skipped++;
        continue;
      }

      // also_known_as → merge into aliases array (dedup)
      const aliasesLiteral =
        person.also_known_as.length > 0
          ? `{${person.also_known_as.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(',')}}`
          : null;

      // Country derivation: TMDb's place_of_birth is freeform text like
      // "Sydney, New South Wales, Australia". Take the last comma-separated
      // segment as a coarse country guess. Better than nothing; manual
      // curation can override later.
      const placeCountry =
        person.place_of_birth?.split(',').map((s) => s.trim()).pop() ?? null;

      await db.execute(sql`
        UPDATE people SET
          bio = COALESCE(NULLIF(bio, ''), ${person.biography}),
          birth_date = COALESCE(birth_date, ${person.birthday}::date),
          death_date = COALESCE(death_date, ${person.deathday}::date),
          country = COALESCE(country, ${placeCountry}),
          imdb_id = COALESCE(imdb_id, ${person.imdb_id}),
          wikidata_id = COALESCE(wikidata_id, ${person.wikidata_id ?? null}),
          profile_path = COALESCE(profile_path, ${person.profile_path}),
          aliases = CASE
            WHEN ${aliasesLiteral}::text[] IS NOT NULL
              THEN array(SELECT DISTINCT unnest(aliases || ${aliasesLiteral}::text[]))
            ELSE aliases
          END,
          updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.enriched++;
    } catch (e) {
      stats.skipped++;
      console.error(
        `  ✗ tmdb_person_id=${row.tmdb_person_id} (${row.display_name}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (stats.attempted % 100 === 0) {
      console.log(`  ${stats.attempted}/${targets.length} — enriched ${stats.enriched}, skipped ${stats.skipped}`);
    }
  }

  console.log(`tmdb:persons done — attempted ${stats.attempted}, enriched ${stats.enriched}, skipped ${stats.skipped}`);
  return stats;
}
