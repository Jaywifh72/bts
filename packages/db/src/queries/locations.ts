import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type ProductionLocation = {
  id: number;
  name: string;
  region: string | null;
  country: string | null;
  /** WGS-84 decimal degrees, stringified by postgres-js for numeric columns. */
  latitude: string | null;
  longitude: string | null;
  is_studio: boolean;
  notes: string | null;
};

/**
 * E-23 — list shooting locations for a production. Studio rows last
 * (the sun planner can't help with soundstage shoots), exterior
 * locations first.
 */
export async function getProductionLocations(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionLocation[]> {
  return db.execute<ProductionLocation>(sql`
    SELECT id, name, region, country,
           latitude::text, longitude::text,
           is_studio, notes
    FROM production_locations
    WHERE production_id = ${productionId}
    ORDER BY is_studio ASC, name
  `);
}

/**
 * UX-audit Move 2 — single-location detail with parent-production
 * context. Powers /locations/[id] (the sun-arc page).
 */
export async function getLocationById(
  db: SeedDb = defaultDb,
  id: number,
): Promise<(ProductionLocation & {
  production_id: number;
  production_slug: string;
  production_title: string;
  production_year: number | null;
}) | null> {
  const [row] = await db.execute<ProductionLocation & {
    production_id: number;
    production_slug: string;
    production_title: string;
    production_year: number | null;
  }>(sql`
    SELECT pl.id, pl.name, pl.region, pl.country,
           pl.latitude::text, pl.longitude::text,
           pl.is_studio, pl.notes,
           p.id AS production_id,
           p.slug AS production_slug,
           p.title AS production_title,
           p.release_year::int AS production_year
    FROM production_locations pl
    JOIN productions p ON p.id = pl.production_id
    WHERE pl.id = ${id}
    LIMIT 1
  `);
  return row ?? null;
}

/**
 * UX-audit Move 2 — sibling locations on the same production. Powers
 * the "Other shooting locations" rail on /locations/[id].
 */
export async function getSiblingLocations(
  db: SeedDb = defaultDb,
  productionId: number,
  excludeId: number,
): Promise<ProductionLocation[]> {
  return db.execute<ProductionLocation>(sql`
    SELECT id, name, region, country,
           latitude::text, longitude::text,
           is_studio, notes
    FROM production_locations
    WHERE production_id = ${productionId} AND id <> ${excludeId}
    ORDER BY is_studio ASC, name
    LIMIT 12
  `);
}
