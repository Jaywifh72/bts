import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type RentalHouseRow = {
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  founded_year: number | null;
  specialties: string[] | null;
  stocks_brands: string[] | null;
  branch_count: number | null;
  production_count: number;
};

export async function listRentalHouses(
  db: SeedDb = defaultDb,
  opts: { limit?: number } = {},
): Promise<RentalHouseRow[]> {
  const limit = opts.limit ?? 200;
  return db.execute<RentalHouseRow>(sql`
    SELECT rh.slug, rh.name, rh.city, rh.country, rh.founded_year,
           rh.specialties, rh.stocks_brands, rh.branch_count,
           COUNT(DISTINCT prh.production_id)::int AS production_count
    FROM rental_houses rh
    LEFT JOIN production_rental_houses prh ON prh.rental_house_id = rh.id
    GROUP BY rh.id
    ORDER BY production_count DESC, rh.name
    LIMIT ${limit}
  `);
}

export async function getRentalHouseBySlug(db: SeedDb = defaultDb, slug: string) {
  const rows = await db.execute<{
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
    stocks_brands: string[] | null;
    branch_count: number | null;
    references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
    curated_by: string | null;
    curated_by_url: string | null;
    last_verified_at: string | null;
    production_count: number;
  }>(sql`
    SELECT rh.id, rh.slug, rh.name, rh.city, rh.country, rh.headquarters,
           rh.founded_year, rh.parent_company, rh.employee_count,
           rh.website, rh.careers_url, rh.reel_url, rh.wikidata_id,
           rh.summary, rh.tagline, rh.specialties, rh.stocks_brands, rh.branch_count,
           COALESCE(rh.references, '[]'::jsonb) AS references,
           rh.curated_by, rh.curated_by_url, rh.last_verified_at::text,
           (SELECT COUNT(*)::int FROM production_rental_houses WHERE rental_house_id = rh.id) AS production_count
    FROM rental_houses rh
    WHERE rh.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listProductionsForRentalHouse(
  db: SeedDb = defaultDb,
  rentalHouseId: number,
  limit: number = 200,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    kit_type: string | null;
  }>(sql`
    SELECT p.slug, p.title, p.release_year, prh.kit_type
    FROM production_rental_houses prh
    JOIN productions p ON p.id = prh.production_id
    WHERE prh.rental_house_id = ${rentalHouseId}
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}
