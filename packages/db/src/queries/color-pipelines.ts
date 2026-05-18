import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type ColorPipelineRow = {
  id: number;
  scene_id: number | null;
  scene_slug: string | null;
  scene_title: string | null;
  pipeline_name: string;
  camera_log: string | null;
  camera_gamut: string | null;
  idt: string | null;
  working_space: string | null;
  odt: string | null;
  deliverable: string | null;
  notes: string | null;
  sort_order: number;
  // 0080 — HDR delivery specs.
  hdr_format: string | null;
  hdr_peak_nits: number | null;
  dolby_vision_profile: string | null;
  mastering_display_nits: number | null;
  ambient_light_nits: number | null;
  color_chart: string | null;
  show_lut_filename: string | null;
  show_lut_url: string | null;
};

/**
 * E-24 — fetch every color pipeline for a production, default first
 * (scene_id NULL), then per-scene overrides ordered by scene timeline.
 */
export async function getProductionColorPipelines(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ColorPipelineRow[]> {
  return db.execute<ColorPipelineRow>(sql`
    SELECT
      pcp.id,
      pcp.scene_id,
      sc.slug AS scene_slug,
      sc.title AS scene_title,
      pcp.pipeline_name,
      pcp.camera_log,
      pcp.camera_gamut,
      pcp.idt,
      pcp.working_space,
      pcp.odt,
      pcp.deliverable,
      pcp.notes,
      pcp.sort_order,
      pcp.hdr_format,
      pcp.hdr_peak_nits,
      pcp.dolby_vision_profile,
      pcp.mastering_display_nits,
      pcp.ambient_light_nits,
      pcp.color_chart,
      pcp.show_lut_filename,
      pcp.show_lut_url
    FROM production_color_pipelines pcp
    LEFT JOIN scenes sc ON sc.id = pcp.scene_id
    WHERE pcp.production_id = ${productionId}
    ORDER BY
      pcp.scene_id IS NOT NULL,           -- false (NULL) first
      sc.position_in_runtime_seconds NULLS LAST,
      pcp.sort_order, pcp.id
  `);
}
