import 'dotenv/config';
import { db, sql } from '@bts/db';
import { sparql } from './client.ts';

/**
 * E-25 — backfill `people.film_schools` from Wikidata P69 (educated_at).
 *
 * For each person with a wikidata_id, fetch their educated_at statements
 * and resolve each target Q-entity to its English label. We store the
 * raw labels rather than QIDs since the column is text[] — display is
 * the only consumer for now. If we later need school detail pages we
 * promote to a `schools` table + join.
 *
 * Throttling: piggybacks on the existing SPARQL client's 2s spacing +
 * exponential backoff. Politeness wins over throughput here.
 */

export type EducationStats = {
  attempted: number;
  populated: number;
  empty: number;
  errors: number;
};

function buildQuery(wikidataId: string): string {
  return `
    SELECT ?schoolLabel WHERE {
      wd:${wikidataId} wdt:P69 ?school .
      ?school rdfs:label ?schoolLabel .
      FILTER(LANG(?schoolLabel) = "en")
    }
    LIMIT 10
  `;
}

export async function backfillEducationFromWikidata(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<EducationStats> {
  const stats: EducationStats = { attempted: 0, populated: 0, empty: 0, errors: 0 };

  // Default: only target rows with wikidata_id set and an empty
  // film_schools array. `--refresh` re-runs everything.
  const filterClause = opts.refresh
    ? sql`p.wikidata_id IS NOT NULL`
    : sql`p.wikidata_id IS NOT NULL AND COALESCE(array_length(p.film_schools, 1), 0) = 0`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; wikidata_id: string; display_name: string }>(sql`
    SELECT id, wikidata_id, display_name FROM people p
    WHERE ${filterClause}
    ORDER BY p.id
    ${limitClause}
  `);

  console.log(`wikidata:education — ${targets.length} people to scan (refresh=${!!opts.refresh})`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const result = await sparql(buildQuery(row.wikidata_id));
      const schools = result.results.bindings
        .map((b) => b.schoolLabel?.value)
        .filter((s): s is string => typeof s === 'string' && s.length > 0);

      if (schools.length === 0) {
        stats.empty++;
        continue;
      }
      // Dedupe (Wikidata sometimes returns multiple labels per school).
      const unique = Array.from(new Set(schools));
      // Postgres array literal with proper escaping for text values.
      const literal = `{${unique.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
      await db.execute(sql`
        UPDATE people SET film_schools = ${literal}::text[], updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.populated++;
    } catch (e) {
      stats.errors++;
      console.error(
        `  ${row.display_name} (${row.wikidata_id}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `wikidata:education done — attempted=${stats.attempted} populated=${stats.populated} empty=${stats.empty} errors=${stats.errors}`,
  );
  return stats;
}
