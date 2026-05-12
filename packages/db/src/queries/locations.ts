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
