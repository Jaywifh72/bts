import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type LensCoverageItem = {
  slug_path: string;
  manufacturer: string;
  series: string;
  item: string;
  focal_length_mm: number | null;
  image_circle_mm: number;
  is_anamorphic: boolean;
  anamorphic_squeeze: number | null;
};

/**
 * E-34 — every lens with a curated image_circle_mm. Used by the sensor
 * compatibility checker. Sorted by manufacturer/series/focal_length so
 * the picker stays cinematographer-friendly.
 */
export async function listLensCoverageItems(
  db: SeedDb = defaultDb,
): Promise<LensCoverageItem[]> {
  return db.execute<LensCoverageItem>(sql`
    SELECT
      em.slug || '/' || es.slug || '/' || ei.slug AS slug_path,
      em.name AS manufacturer,
      es.name AS series,
      ei.name AS item,
      (ei.specs->>'focal_length_mm')::numeric::float8 AS focal_length_mm,
      (ei.specs->>'image_circle_mm')::numeric::float8 AS image_circle_mm,
      COALESCE((ei.specs->>'is_anamorphic')::boolean, false) AS is_anamorphic,
      (ei.specs->>'anamorphic_squeeze')::numeric::float8 AS anamorphic_squeeze
    FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE es.category = 'lens_set'
      AND ei.specs ? 'image_circle_mm'
    ORDER BY em.name, es.name, (ei.specs->>'focal_length_mm')::numeric NULLS LAST, ei.name
  `);
}

export type LoadoutPickerItem = {
  /** Stable composite slug used in URL params: `manuf/series/item`. */
  slug_path: string;
  manufacturer_slug: string;
  series_slug: string;
  item_slug: string;
  manufacturer: string;
  series: string;
  item: string;
  category: string;
  /** Pulled from equipment_items.specs.weight_kg when present. */
  weight_kg: number | null;
};

/**
 * E-33 — flat picker list across every equipment_item, joined to its
 * series + manufacturer, sorted alphabetically within category for
 * dropdown consumption. Each row carries a `slug_path` ("arri/alexa-65/
 * 4k-lf") that's the canonical URL-state token for the loadout
 * calculator.
 *
 * Returns weight_kg when the item has it specced (~7 of 103 today;
 * the picker degrades to N/A for the rest).
 */
export async function listLoadoutPickerItems(
  db: SeedDb = defaultDb,
): Promise<LoadoutPickerItem[]> {
  return db.execute<LoadoutPickerItem>(sql`
    SELECT
      em.slug || '/' || es.slug || '/' || ei.slug AS slug_path,
      em.slug AS manufacturer_slug,
      es.slug AS series_slug,
      ei.slug AS item_slug,
      em.name AS manufacturer,
      es.name AS series,
      ei.name AS item,
      es.category::text AS category,
      (ei.specs->>'weight_kg')::numeric::float8 AS weight_kg
    FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    ORDER BY es.category, em.name, es.name, ei.name
  `);
}

/**
 * Resolve a list of `slug_path`s to full picker items. Used by the
 * calculator's server route when reading kit state out of URL params.
 */
export async function getLoadoutItemsByPaths(
  db: SeedDb = defaultDb,
  paths: readonly string[],
): Promise<LoadoutPickerItem[]> {
  if (paths.length === 0) return [];
  // Build VALUES list explicitly so we can keep the query parameterised
  // without an array-binding gymnastics dance.
  const triples = paths
    .map((p) => p.split('/'))
    .filter((parts) => parts.length === 3)
    .map(([m, s, i]) => sql`(${m}, ${s}, ${i})`);
  if (triples.length === 0) return [];
  return db.execute<LoadoutPickerItem>(sql`
    SELECT
      em.slug || '/' || es.slug || '/' || ei.slug AS slug_path,
      em.slug AS manufacturer_slug,
      es.slug AS series_slug,
      ei.slug AS item_slug,
      em.name AS manufacturer,
      es.name AS series,
      ei.name AS item,
      es.category::text AS category,
      (ei.specs->>'weight_kg')::numeric::float8 AS weight_kg
    FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    JOIN (VALUES ${sql.join(triples, sql`, `)}) AS picks(m, s, i)
      ON picks.m = em.slug AND picks.s = es.slug AND picks.i = ei.slug
    ORDER BY es.category, em.name, es.name, ei.name
  `);
}
