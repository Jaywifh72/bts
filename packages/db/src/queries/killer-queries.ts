import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * Q1: Every theatrical feature shot on ALEXA 65 with Panavision Sphero anamorphic, sorted by DP.
 * Expected for v1 seed: at least The Revenant.
 */
export async function findFeaturesShotOnAlexa65WithSphero(db: SeedDb = defaultDb) {
  return db.execute<{ title: string; slug: string; release_year: number | null; dp_name: string; dp_slug: string }>(sql`
    SELECT DISTINCT p.title, p.slug, p.release_year, ppl.display_name AS dp_name, ppl.slug AS dp_slug
    FROM productions p
    JOIN scenes sc ON sc.production_id = p.id
    JOIN equipment_usage eu_cam ON eu_cam.scene_id = sc.id
    JOIN equipment_series es_cam ON es_cam.id = eu_cam.equipment_series_id
    JOIN equipment_usage eu_lens ON eu_lens.scene_id = sc.id
    JOIN equipment_series es_lens ON es_lens.id = eu_lens.equipment_series_id
    JOIN crew_assignments ca ON ca.production_id = p.id
    JOIN roles r ON r.id = ca.role_id
    JOIN people ppl ON ppl.id = ca.person_id
    WHERE p.type = 'feature'
      AND es_cam.slug = 'arri-alexa-65-series'
      AND es_lens.slug = 'panavision-sphero-anamorphic'
      AND r.slug = 'director-of-photography'
    ORDER BY ppl.display_name
  `);
}

/**
 * Q2: What lenses did this DP use on this production?
 *
 * Includes manufacturer_slug so the consumer can build /gear/<manufacturer>/<series>/<item>
 * links without hard-coding any manufacturer.
 */
export async function findLensesByDpOnProduction(db: SeedDb, personSlug: string, productionSlug: string) {
  return db.execute<{
    series_slug: string; series_name: string;
    item_slug: string | null; item_name: string | null;
    manufacturer_slug: string;
  }>(sql`
    SELECT DISTINCT es.slug AS series_slug, es.name AS series_name,
                    ei.slug AS item_slug, ei.name AS item_name,
                    m.slug AS manufacturer_slug
    FROM productions p
    JOIN scenes sc ON sc.production_id = p.id
    JOIN equipment_usage eu ON eu.scene_id = sc.id
    JOIN equipment_series es ON es.id = eu.equipment_series_id
    JOIN equipment_manufacturers m ON m.id = es.manufacturer_id
    LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    JOIN crew_assignments ca ON ca.production_id = p.id
    JOIN roles r ON r.id = ca.role_id
    JOIN people ppl ON ppl.id = ca.person_id
    WHERE p.slug = ${productionSlug}
      AND ppl.slug = ${personSlug}
      AND r.slug = 'director-of-photography'
      AND es.category = 'lens_set'
    ORDER BY es.name, ei.name
  `);
}

/**
 * Q3: Every magic-hour exterior in {year} features, by lighting fixture.
 */
export async function findMagicHourExteriorLightingByYear(db: SeedDb, year: number) {
  return db.execute<{ title: string; slug: string; scene_title: string; lighting_series: string; lighting_item: string | null }>(sql`
    SELECT p.title, p.slug, sc.title AS scene_title,
           es.name AS lighting_series, ei.name AS lighting_item
    FROM productions p
    JOIN scenes sc ON sc.production_id = p.id
    JOIN equipment_usage eu ON eu.scene_id = sc.id
    JOIN equipment_series es ON es.id = eu.equipment_series_id
    LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    WHERE p.type = 'feature'
      AND p.release_year = ${year}
      AND sc.time_of_day = 'magic_hour'
      AND sc.interior_exterior = 'ext'
      AND es.category = 'lighting_fixture'
    ORDER BY p.title, sc.title
  `);
}
