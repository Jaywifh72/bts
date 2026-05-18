import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type FacilityRow = {
  slug: string;
  name: string;
  country: string | null;
  city: string | null;
  headquarters: string | null;
  founded_year: number | null;
  parent_company: string | null;
  employee_count: number | null;
  website: string | null;
  careers_url: string | null;
  reel_url: string | null;
  summary: string | null;
  tagline: string | null;
  specialties: string[] | null;
  founders: string[] | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  data_tier: string;
  curated_by: string | null;
  curated_by_url: string | null;
  last_verified_at: string | null;
};

function listFromTable(table: 'costume_construction_houses' | 'music_supervision_agencies' | 'adr_studios') {
  return async (db: SeedDb = defaultDb, opts: { limit?: number } = {}): Promise<FacilityRow[]> => {
    const limit = opts.limit ?? 200;
    const t = sql.raw(table);
    return db.execute<FacilityRow>(sql`
      SELECT slug, name, country, city, headquarters, founded_year,
             parent_company, employee_count, website, careers_url, reel_url,
             summary, tagline, specialties, founders,
             COALESCE("references", '[]'::jsonb) AS "references",
             data_tier, curated_by, curated_by_url, last_verified_at
        FROM ${t}
       ORDER BY name
       LIMIT ${limit}
    `);
  };
}

function getFromTable(table: 'costume_construction_houses' | 'music_supervision_agencies' | 'adr_studios') {
  return async (db: SeedDb = defaultDb, slug: string): Promise<FacilityRow | null> => {
    const t = sql.raw(table);
    const rows = await db.execute<FacilityRow>(sql`
      SELECT slug, name, country, city, headquarters, founded_year,
             parent_company, employee_count, website, careers_url, reel_url,
             summary, tagline, specialties, founders,
             COALESCE("references", '[]'::jsonb) AS "references",
             data_tier, curated_by, curated_by_url, last_verified_at
        FROM ${t}
       WHERE slug = ${slug}
       LIMIT 1
    `);
    return rows[0] ?? null;
  };
}

export const listCostumeConstructionHouses = listFromTable('costume_construction_houses');
export const getCostumeConstructionHouseBySlug = getFromTable('costume_construction_houses');

export const listMusicSupervisionAgencies = listFromTable('music_supervision_agencies');
export const getMusicSupervisionAgencyBySlug = getFromTable('music_supervision_agencies');

export const listAdrStudios = listFromTable('adr_studios');
export const getAdrStudioBySlug = getFromTable('adr_studios');
