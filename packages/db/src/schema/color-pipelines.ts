import {
  bigserial, bigint, integer, text, timestamp, pgTable, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions } from './productions.ts';
import { scenes } from './scenes.ts';

/**
 * E-24 — per-production color pipeline. Captures the chain from
 * camera color science → IDT → working space → ODT → deliverable.
 * scene_id NULL = production-wide default. Per-scene rows flag
 * divergent scenes (e.g. a Super 16 mag inside a digital show).
 */
export const productionColorPipelines = pgTable('production_color_pipelines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  sceneId: bigint('scene_id', { mode: 'number' })
    .references(() => scenes.id, { onDelete: 'set null' }),
  pipelineName: text('pipeline_name').notNull(),
  cameraLog: text('camera_log'),
  cameraGamut: text('camera_gamut'),
  idt: text('idt'),
  workingSpace: text('working_space'),
  odt: text('odt'),
  deliverable: text('deliverable'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Two partial unique indexes — see migration 0029 — enforce one
  // production-default + one per-scene row. Drizzle introspect
  // surfaces those after the migration runs; we just declare the
  // ordinary list index here.
  productionIdx: index('production_color_pipelines_production_idx')
    .on(t.productionId, t.sortOrder),
}));
