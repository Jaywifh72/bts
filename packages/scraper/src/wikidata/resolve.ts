import 'dotenv/config';
import { db, sql } from '@bts/db';
import { sparql, qidFromUri } from './client.ts';

/**
 * Resolves Wikidata QIDs for productions and people that already have an
 * IMDb ID but no `wikidata_id`. Wikidata's P345 (IMDb ID) statement is
 * widely populated for films and notable crew, so a single SPARQL query
 * per row reliably finds the Q-entity.
 *
 * This is the prerequisite for `wikidata:awards` and any other Wikidata
 * pipeline — without `wikidata_id` we have nothing to query.
 */

export type ResolveStats = {
  attempted: number;
  resolved: number;
  notFound: number;
  errors: number;
};

async function lookupQidByImdb(imdbId: string): Promise<string | null> {
  // Wikidata: ?entity wdt:P345 "<imdb-id>"
  const query = `
    SELECT ?entity WHERE {
      ?entity wdt:P345 "${imdbId.replace(/"/g, '')}" .
    }
    LIMIT 1
  `;
  const res = await sparql(query);
  const uri = res.results.bindings[0]?.entity?.value;
  return uri ? qidFromUri(uri) : null;
}

export async function resolveProductionWikidataIds(
  opts: { limit?: number } = {},
): Promise<ResolveStats> {
  const stats: ResolveStats = { attempted: 0, resolved: 0, notFound: 0, errors: 0 };
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; imdb_id: string; title: string }>(sql`
    SELECT id, imdb_id, title FROM productions
    WHERE imdb_id IS NOT NULL AND wikidata_id IS NULL
    ORDER BY popularity DESC NULLS LAST, id
    ${limitClause}
  `);

  console.log(`wikidata:resolve (productions) — ${targets.length} rows to resolve`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const qid = await lookupQidByImdb(row.imdb_id);
      if (!qid) {
        stats.notFound++;
        continue;
      }
      await db.execute(sql`
        UPDATE productions SET wikidata_id = ${qid}, updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.resolved++;
    } catch (e) {
      stats.errors++;
      console.error(`  ${row.title} (${row.imdb_id}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `wikidata:resolve (productions) done — attempted=${stats.attempted} resolved=${stats.resolved} not_found=${stats.notFound} errors=${stats.errors}`,
  );
  return stats;
}

export async function resolvePersonWikidataIds(
  opts: { limit?: number } = {},
): Promise<ResolveStats> {
  const stats: ResolveStats = { attempted: 0, resolved: 0, notFound: 0, errors: 0 };
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; imdb_id: string; display_name: string }>(sql`
    SELECT id, imdb_id, display_name FROM people
    WHERE imdb_id IS NOT NULL AND wikidata_id IS NULL
    ORDER BY id
    ${limitClause}
  `);

  console.log(`wikidata:resolve (people) — ${targets.length} rows to resolve`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const qid = await lookupQidByImdb(row.imdb_id);
      if (!qid) {
        stats.notFound++;
        continue;
      }
      await db.execute(sql`
        UPDATE people SET wikidata_id = ${qid}, updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.resolved++;
    } catch (e) {
      stats.errors++;
      console.error(`  ${row.display_name} (${row.imdb_id}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `wikidata:resolve (people) done — attempted=${stats.attempted} resolved=${stats.resolved} not_found=${stats.notFound} errors=${stats.errors}`,
  );
  return stats;
}
