import {
  bigserial, bigint, integer, text, timestamp, pgTable, unique, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { lightingRoleEnum } from './enums.ts';
import { scenes, equipmentUsage } from './scenes.ts';

/**
 * E-22 — per-scene lighting plot. A "setup" groups fixtures into a
 * named lighting configuration ("master coverage", "reverse on
 * Margot") with role classification, diffusion stack, color
 * temperature, and supervisor notes.
 *
 * `equipment_usage` stays the source of truth for "which fixture
 * was used on this scene". This table promotes a subset of those
 * usages into a structured plot.
 */
export const lightingSetups = pgTable('lighting_setups', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sceneId: bigint('scene_id', { mode: 'number' })
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  setupName: text('setup_name').notNull(),
  motivation: text('motivation'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sceneNameUnq: unique('lighting_setups_scene_setup_name_key').on(t.sceneId, t.setupName),
  sceneIdx: index('lighting_setups_scene_idx').on(t.sceneId, t.sortOrder),
}));

export const lightingSetupFixtures = pgTable('lighting_setup_fixtures', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  setupId: bigint('setup_id', { mode: 'number' })
    .notNull()
    .references(() => lightingSetups.id, { onDelete: 'cascade' }),
  equipmentUsageId: bigint('equipment_usage_id', { mode: 'number' })
    .notNull()
    .references(() => equipmentUsage.id, { onDelete: 'cascade' }),
  role: lightingRoleEnum('role').notNull(),
  diffusion: text('diffusion'),
  colorTempK: integer('color_temp_k'),
  intensityPct: integer('intensity_pct'),
  positionNotes: text('position_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  setupUsageUnq: unique('lighting_setup_fixtures_setup_id_equipment_usage_id_key')
    .on(t.setupId, t.equipmentUsageId),
  setupIdx: index('lighting_setup_fixtures_setup_idx').on(t.setupId),
  // 0050 — reverse-lookup ("which fixtures depend on this equipment_usage").
  equipmentUsageIdx: index('lighting_setup_fixtures_equipment_usage_idx').on(t.equipmentUsageId),
  roleIdx: index('lighting_setup_fixtures_role_idx').on(t.role),
  // Mirror SQL CHECK constraints for drizzle-introspect parity.
  colorTempCheck: check('lighting_setup_fixtures_color_temp_k_check',
    sql`${t.colorTempK} IS NULL OR ${t.colorTempK} BETWEEN 1500 AND 25000`),
  intensityCheck: check('lighting_setup_fixtures_intensity_pct_check',
    sql`${t.intensityPct} IS NULL OR ${t.intensityPct} BETWEEN 0 AND 100`),
}));
