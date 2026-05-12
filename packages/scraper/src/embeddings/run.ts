import 'dotenv/config';
import { db, sql } from '@bts/db';
import { embedBatch, MissingApiKeyError } from './openai.ts';

/**
 * E-27 — populate `productions.embedding` and `people.embedding` from
 * curated text fields. We embed the title + synopsis + DP/director
 * names for productions, and display name + bio + primary role for
 * people. Concatenation is deliberately concise — OpenAI's
 * text-embedding-3-small encodes meaning well even on short inputs;
 * stuffing irrelevant boilerplate dilutes the vector.
 *
 * Idempotent: only rows where `embedding IS NULL` are processed unless
 * `--refresh` is passed.
 */

const BATCH_SIZE = 50;

export type EmbedStats = {
  attempted: number;
  embedded: number;
  skipped: number;
  errors: number;
};

function buildProductionInput(row: {
  title: string;
  synopsis: string | null;
  release_year: number | null;
  director: string | null;
  dp: string | null;
  primary_format: string | null;
}): string {
  const parts = [
    row.release_year ? `${row.title} (${row.release_year})` : row.title,
    row.synopsis,
    row.director ? `Directed by ${row.director}.` : null,
    row.dp ? `Cinematography by ${row.dp}.` : null,
    row.primary_format ? `Shot on ${row.primary_format}.` : null,
  ].filter(Boolean);
  return parts.join(' ').slice(0, 4000);
}

export async function embedProductions(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<EmbedStats> {
  const stats: EmbedStats = { attempted: 0, embedded: 0, skipped: 0, errors: 0 };
  const filterClause = opts.refresh ? sql`TRUE` : sql`p.embedding IS NULL`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  // Pull each row with its primary director + DP names + primary format
  // string in one query.
  const targets = await db.execute<{
    id: number;
    title: string;
    synopsis: string | null;
    release_year: number | null;
    director: string | null;
    dp: string | null;
    primary_format: string | null;
  }>(sql`
    SELECT
      p.id, p.title, p.synopsis, p.release_year,
      (SELECT ppl.display_name FROM crew_assignments ca
        JOIN people ppl ON ppl.id = ca.person_id
        JOIN roles r ON r.id = ca.role_id
        WHERE ca.production_id = p.id AND r.slug = 'director'
        ORDER BY ca.credit_order NULLS LAST LIMIT 1) AS director,
      (SELECT ppl.display_name FROM crew_assignments ca
        JOIN people ppl ON ppl.id = ca.person_id
        JOIN roles r ON r.id = ca.role_id
        WHERE ca.production_id = p.id AND r.slug = 'director-of-photography'
        ORDER BY ca.credit_order NULLS LAST LIMIT 1) AS dp,
      (SELECT pf.acquisition_format FROM production_formats pf
        WHERE pf.production_id = p.id AND pf.is_primary = true
        LIMIT 1) AS primary_format
    FROM productions p
    WHERE ${filterClause}
    ORDER BY p.popularity DESC NULLS LAST, p.id
    ${limitClause}
  `);

  console.log(`embed:productions — ${targets.length} rows to embed`);

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    stats.attempted += batch.length;
    const inputs = batch.map(buildProductionInput);
    try {
      const vectors = await embedBatch(inputs);
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]!;
        const vec = vectors[j];
        if (!vec) {
          stats.skipped++;
          continue;
        }
        // Postgres vector literal: `[0.1,0.2,...]` as a string cast to vector.
        const literal = `[${vec.join(',')}]`;
        await db.execute(sql`
          UPDATE productions SET embedding = ${literal}::vector, updated_at = NOW()
          WHERE id = ${row.id}
        `);
        stats.embedded++;
      }
      console.log(`  embedded ${stats.embedded}/${targets.length}`);
    } catch (e) {
      stats.errors += batch.length;
      if (e instanceof MissingApiKeyError) throw e;
      console.error(`  batch error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `embed:productions done — attempted=${stats.attempted} embedded=${stats.embedded} skipped=${stats.skipped} errors=${stats.errors}`,
  );
  return stats;
}

function buildPersonInput(row: {
  display_name: string;
  bio: string | null;
  primary_role: string | null;
  member_societies: string[];
}): string {
  const parts = [
    row.display_name,
    row.primary_role ?? null,
    row.member_societies.length > 0 ? `Member of ${row.member_societies.join(', ')}.` : null,
    row.bio,
  ].filter(Boolean);
  return parts.join(' ').slice(0, 4000);
}

export async function embedPeople(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<EmbedStats> {
  const stats: EmbedStats = { attempted: 0, embedded: 0, skipped: 0, errors: 0 };
  const filterClause = opts.refresh ? sql`TRUE` : sql`p.embedding IS NULL`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{
    id: number;
    display_name: string;
    bio: string | null;
    primary_role: string | null;
    member_societies: string[];
  }>(sql`
    SELECT
      p.id, p.display_name, p.bio, p.member_societies,
      (SELECT r.name FROM crew_assignments ca
        JOIN roles r ON r.id = ca.role_id
        WHERE ca.person_id = p.id
        GROUP BY r.id, r.name
        ORDER BY COUNT(*) DESC LIMIT 1) AS primary_role
    FROM people p
    WHERE ${filterClause}
    ORDER BY p.id
    ${limitClause}
  `);

  console.log(`embed:people — ${targets.length} rows to embed`);

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    stats.attempted += batch.length;
    const inputs = batch.map(buildPersonInput);
    try {
      const vectors = await embedBatch(inputs);
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]!;
        const vec = vectors[j];
        if (!vec) {
          stats.skipped++;
          continue;
        }
        const literal = `[${vec.join(',')}]`;
        await db.execute(sql`
          UPDATE people SET embedding = ${literal}::vector, updated_at = NOW()
          WHERE id = ${row.id}
        `);
        stats.embedded++;
      }
      console.log(`  embedded ${stats.embedded}/${targets.length}`);
    } catch (e) {
      stats.errors += batch.length;
      if (e instanceof MissingApiKeyError) throw e;
      console.error(`  batch error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `embed:people done — attempted=${stats.attempted} embedded=${stats.embedded} skipped=${stats.skipped} errors=${stats.errors}`,
  );
  return stats;
}
