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
      pcp.sort_order
    FROM production_color_pipelines pcp
    LEFT JOIN scenes sc ON sc.id = pcp.scene_id
    WHERE pcp.production_id = ${productionId}
    ORDER BY
      pcp.scene_id IS NOT NULL,           -- false (NULL) first
      sc.position_in_runtime_seconds NULLS LAST,
      pcp.sort_order, pcp.id
  `);
}
