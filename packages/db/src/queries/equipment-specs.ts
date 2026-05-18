import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * Spec-browser projection — flattens equipment_items + series +
 * manufacturer + a few hot spec keys into a sortable / filterable row
 * suited for the `/equipment/specs` cross-cut surface.
 *
 * The full JSONB stays on the row for the per-item detail click-through.
 */
export type SpecBrowserRow = {
  item_slug: string;
  item_name: string;
  series_slug: string;
  series_name: string;
  manufacturer_slug: string;
  manufacturer_name: string;
  category: string;
  year_introduced: number | null;
  // Common projected hot keys (null when not in JSONB).
  dynamic_range_stops: number | null;
  max_frame_rate_fps: number | null;
  native_iso: unknown;
  sensor_size: string | null;
  weight_kg: number | null;
  // Lens projection.
  focal_length_mm: number | null;
  max_aperture_t: number | null;
  is_anamorphic: boolean | null;
  // Lighting projection.
  cri: number | null;
  cct_min_k: number | null;
  cct_max_k: number | null;
  power_watts: number | null;
  // Untyped JSONB on the row — for click-through detail.
  specs: Record<string, unknown>;
};

export async function listSpecBrowserRows(
  db: SeedDb = defaultDb,
  opts: { category?: string; limit?: number } = {},
): Promise<SpecBrowserRow[]> {
  const limit = opts.limit ?? 300;
  const catFilter = opts.category && opts.category !== 'all'
    ? sql`AND es.category = ${opts.category}::equipment_series_category_enum`
    : sql``;
  return db.execute<SpecBrowserRow>(sql`
    SELECT
      ei.slug AS item_slug,
      ei.name AS item_name,
      es.slug AS series_slug,
      es.name AS series_name,
      em.slug AS manufacturer_slug,
      em.name AS manufacturer_name,
      es.category::text AS category,
      (ei.specs ->> 'year_introduced')::int AS year_introduced,
      (ei.specs ->> 'dynamic_range_stops')::real AS dynamic_range_stops,
      (ei.specs ->> 'max_frame_rate_fps')::real AS max_frame_rate_fps,
      ei.specs -> 'native_iso' AS native_iso,
      ei.specs ->> 'sensor_size' AS sensor_size,
      (ei.specs ->> 'weight_kg')::real AS weight_kg,
      (ei.specs ->> 'focal_length_mm')::real AS focal_length_mm,
      (ei.specs ->> 'max_aperture_t')::real AS max_aperture_t,
      (ei.specs ->> 'is_anamorphic')::boolean AS is_anamorphic,
      (ei.specs ->> 'cri')::real AS cri,
      (ei.specs ->> 'cct_min_k')::int AS cct_min_k,
      (ei.specs ->> 'cct_max_k')::int AS cct_max_k,
      (ei.specs ->> 'power_watts')::real AS power_watts,
      ei.specs AS specs
    FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE jsonb_typeof(ei.specs) = 'object' AND ei.specs <> '{}'::jsonb
      ${catFilter}
    ORDER BY em.name, es.name, ei.name
    LIMIT ${limit}
  `);
}
