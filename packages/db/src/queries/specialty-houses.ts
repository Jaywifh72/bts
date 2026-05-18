import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * Shared queries for makeup_effects_houses + title_sequence_houses
 * (migration 0084). Both tables are structurally identical; same
 * functions handle both via the `table` parameter.
 */

export type SpecialtyHouseRow = {
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  founded_year: number | null;
  specialties: string[] | null;
  founders: string[] | null;
  production_count: number;
};

export async function listMakeupEffectsHouses(
  db: SeedDb = defaultDb, opts: { limit?: number } = {},
): Promise<SpecialtyHouseRow[]> {
  const limit = opts.limit ?? 200;
  return db.execute<SpecialtyHouseRow>(sql`
    SELECT meh.slug, meh.name, meh.city, meh.country, meh.founded_year,
           meh.specialties, meh.founders,
           COUNT(DISTINCT pmeh.production_id)::int AS production_count
    FROM makeup_effects_houses meh
    LEFT JOIN production_makeup_effects_houses pmeh ON pmeh.house_id = meh.id
    GROUP BY meh.id
    ORDER BY production_count DESC, meh.name
    LIMIT ${limit}
  `);
}

export async function listTitleSequenceHouses(
  db: SeedDb = defaultDb, opts: { limit?: number } = {},
): Promise<SpecialtyHouseRow[]> {
  const limit = opts.limit ?? 200;
  return db.execute<SpecialtyHouseRow>(sql`
    SELECT tsh.slug, tsh.name, tsh.city, tsh.country, tsh.founded_year,
           tsh.specialties, tsh.founders,
           COUNT(DISTINCT ptsh.production_id)::int AS production_count
    FROM title_sequence_houses tsh
    LEFT JOIN production_title_sequence_houses ptsh ON ptsh.house_id = tsh.id
    GROUP BY tsh.id
    ORDER BY production_count DESC, tsh.name
    LIMIT ${limit}
  `);
}

export type SpecialtyHouseDetail = {
  id: number;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  headquarters: string | null;
  founded_year: number | null;
  parent_company: string | null;
  employee_count: number | null;
  website: string | null;
  careers_url: string | null;
  reel_url: string | null;
  wikidata_id: string | null;
  summary: string | null;
  tagline: string | null;
  specialties: string[] | null;
  founders: string[] | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  curated_by: string | null;
  curated_by_url: string | null;
  last_verified_at: string | null;
  production_count: number;
};

export async function getMakeupEffectsHouseBySlug(db: SeedDb = defaultDb, slug: string) {
  const rows = await db.execute<SpecialtyHouseDetail>(sql`
    SELECT meh.id, meh.slug, meh.name, meh.city, meh.country, meh.headquarters,
           meh.founded_year, meh.parent_company, meh.employee_count,
           meh.website, meh.careers_url, meh.reel_url, meh.wikidata_id,
           meh.summary, meh.tagline, meh.specialties, meh.founders,
           COALESCE(meh.references, '[]'::jsonb) AS references,
           meh.curated_by, meh.curated_by_url, meh.last_verified_at::text,
           (SELECT COUNT(*)::int FROM production_makeup_effects_houses WHERE house_id = meh.id) AS production_count
    FROM makeup_effects_houses meh
    WHERE meh.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function getTitleSequenceHouseBySlug(db: SeedDb = defaultDb, slug: string) {
  const rows = await db.execute<SpecialtyHouseDetail>(sql`
    SELECT tsh.id, tsh.slug, tsh.name, tsh.city, tsh.country, tsh.headquarters,
           tsh.founded_year, tsh.parent_company, tsh.employee_count,
           tsh.website, tsh.careers_url, tsh.reel_url, tsh.wikidata_id,
           tsh.summary, tsh.tagline, tsh.specialties, tsh.founders,
           COALESCE(tsh.references, '[]'::jsonb) AS references,
           tsh.curated_by, tsh.curated_by_url, tsh.last_verified_at::text,
           (SELECT COUNT(*)::int FROM production_title_sequence_houses WHERE house_id = tsh.id) AS production_count
    FROM title_sequence_houses tsh
    WHERE tsh.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listProductionsForMakeupHouse(
  db: SeedDb = defaultDb, houseId: number, limit: number = 200,
) {
  return db.execute<{ slug: string; title: string; release_year: number | null; credited_use: string | null }>(sql`
    SELECT p.slug, p.title, p.release_year, pmeh.credited_use
    FROM production_makeup_effects_houses pmeh
    JOIN productions p ON p.id = pmeh.production_id
    WHERE pmeh.house_id = ${houseId}
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}

export async function listProductionsForTitleHouse(
  db: SeedDb = defaultDb, houseId: number, limit: number = 200,
) {
  return db.execute<{ slug: string; title: string; release_year: number | null; sequence_kind: string | null }>(sql`
    SELECT p.slug, p.title, p.release_year, ptsh.sequence_kind
    FROM production_title_sequence_houses ptsh
    JOIN productions p ON p.id = ptsh.production_id
    WHERE ptsh.house_id = ${houseId}
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}
