import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type LightingFixture = {
  fixture_id: number;
  role: string;
  diffusion: string | null;
  color_temp_k: number | null;
  intensity_pct: number | null;
  position_notes: string | null;
  /** Flattened from equipment_usage → equipment_series → manufacturer. */
  manufacturer_name: string;
  series_name: string;
  series_slug: string;
  manufacturer_slug: string;
  item_name: string | null;
  item_slug: string | null;
  setup_label: string | null;
};

export type LightingSetup = {
  id: number;
  setup_name: string;
  motivation: string | null;
  notes: string | null;
  sort_order: number;
  scene_id: number;
  scene_slug: string;
  scene_title: string;
  fixtures: LightingFixture[];
};

/**
 * E-22 — fetch every lighting setup for a production with its
 * fixtures already grouped. Joins back to scenes so the caller can
 * render them under the matching scene block. Empty when no plot
 * has been curated for the production.
 */
export async function getProductionLightingSetups(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<LightingSetup[]> {
  const rows = await db.execute<{
    setup_id: number; setup_name: string; motivation: string | null;
    notes: string | null; sort_order: number;
    scene_id: number; scene_slug: string; scene_title: string;
    fixture_id: number | null; role: string | null;
    diffusion: string | null; color_temp_k: number | null;
    intensity_pct: number | null; position_notes: string | null;
    manufacturer_name: string | null; series_name: string | null;
    series_slug: string | null; manufacturer_slug: string | null;
    item_name: string | null; item_slug: string | null;
    setup_label: string | null;
  }>(sql`
    SELECT
      ls.id AS setup_id, ls.setup_name, ls.motivation, ls.notes, ls.sort_order,
      sc.id AS scene_id, sc.slug AS scene_slug, sc.title AS scene_title,
      lsf.id AS fixture_id, lsf.role::text AS role,
      lsf.diffusion, lsf.color_temp_k, lsf.intensity_pct, lsf.position_notes,
      em.name AS manufacturer_name, es.name AS series_name,
      es.slug AS series_slug, em.slug AS manufacturer_slug,
      ei.name AS item_name, ei.slug AS item_slug,
      eu.setup_label
    FROM lighting_setups ls
    JOIN scenes sc ON sc.id = ls.scene_id
    LEFT JOIN lighting_setup_fixtures lsf ON lsf.setup_id = ls.id
    LEFT JOIN equipment_usage eu ON eu.id = lsf.equipment_usage_id
    LEFT JOIN equipment_series es ON es.id = eu.equipment_series_id
    LEFT JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    WHERE sc.production_id = ${productionId}
    ORDER BY sc.position_in_runtime_seconds NULLS LAST, sc.id, ls.sort_order, ls.id, lsf.id
  `);

  // Group fixtures under their setup. Map keeps insertion order.
  const setups = new Map<number, LightingSetup>();
  for (const r of rows) {
    let s = setups.get(r.setup_id);
    if (!s) {
      s = {
        id: r.setup_id,
        setup_name: r.setup_name,
        motivation: r.motivation,
        notes: r.notes,
        sort_order: r.sort_order,
        scene_id: r.scene_id,
        scene_slug: r.scene_slug,
        scene_title: r.scene_title,
        fixtures: [],
      };
      setups.set(r.setup_id, s);
    }
    if (r.fixture_id != null && r.role != null) {
      s.fixtures.push({
        fixture_id: r.fixture_id,
        role: r.role,
        diffusion: r.diffusion,
        color_temp_k: r.color_temp_k,
        intensity_pct: r.intensity_pct,
        position_notes: r.position_notes,
        manufacturer_name: r.manufacturer_name ?? '—',
        series_name: r.series_name ?? '—',
        series_slug: r.series_slug ?? '',
        manufacturer_slug: r.manufacturer_slug ?? '',
        item_name: r.item_name,
        item_slug: r.item_slug,
        setup_label: r.setup_label,
      });
    }
  }
  return [...setups.values()];
}
