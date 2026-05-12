import {
  pgTable, bigserial, bigint, integer, text, timestamp, unique, index,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  sceneInteriorExteriorEnum,
  sceneTimeOfDayEnum,
} from './enums.ts';
import { productions } from './productions.ts';
import { equipmentSeries, equipmentItems } from './equipment.ts';
import { crewAssignments } from './crew.ts';

export const scenes = pgTable('scenes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  sceneNumber: text('scene_number'),
  title: text('title').notNull(),
  synopsis: text('synopsis'),
  positionInRuntimeSeconds: integer('position_in_runtime_seconds'),
  interiorExterior: sceneInteriorExteriorEnum('interior_exterior'),
  timeOfDay: sceneTimeOfDayEnum('time_of_day'),
  location: text('location'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionSlugUnq: unique('scenes_production_slug_unq').on(t.productionId, t.slug),
  todIeIdx: index('scenes_tod_ie_idx').on(t.timeOfDay, t.interiorExterior),
}));

export const equipmentUsage = pgTable('equipment_usage', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sceneId: bigint('scene_id', { mode: 'number' })
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  equipmentSeriesId: bigint('equipment_series_id', { mode: 'number' })
    .notNull()
    .references(() => equipmentSeries.id, { onDelete: 'restrict' }),
  // equipment_item_id is nullable; when set, the composite FK below enforces
  // that the item belongs to this series.
  equipmentItemId: bigint('equipment_item_id', { mode: 'number' }),
  crewAssignmentId: bigint('crew_assignment_id', { mode: 'number' })
    .references(() => crewAssignments.id, { onDelete: 'set null' }),
  setupLabel: text('setup_label'),
  usageRole: text('usage_role'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Composite FK: when equipment_item_id is set, (item_id, series_id) must
  // match a row in equipment_items. RESTRICT on item delete.
  itemSeriesFk: foreignKey({
    columns: [t.equipmentItemId, t.equipmentSeriesId],
    foreignColumns: [equipmentItems.id, equipmentItems.seriesId],
    name: 'equipment_usage_item_series_fk',
  }).onDelete('restrict'),
  sceneIdx: index('equipment_usage_scene_idx').on(t.sceneId),
  seriesIdx: index('equipment_usage_series_idx').on(t.equipmentSeriesId),
  seriesSceneIdx: index('equipment_usage_series_scene_idx').on(t.equipmentSeriesId, t.sceneId),
  itemIdx: index('equipment_usage_item_idx')
    .on(t.equipmentItemId)
    .where(sql`${t.equipmentItemId} IS NOT NULL`),
  crewIdx: index('equipment_usage_crew_idx')
    .on(t.crewAssignmentId)
    .where(sql`${t.crewAssignmentId} IS NOT NULL`),
}));

// ─────────────────────────────────────────────────────────────────────
// 0055 — Production-level equipment attribution (parallel to scene-level).
//
// Lifts gear attribution out of scenes-only. 482/539 productions had no
// scenes seeded so couldn't surface gear via equipment_usage alone. This
// table is the per-production path; equipment_usage remains the per-scene
// path. Queries that surface "every film ARRI ALEXA 65 has shot" UNION
// both tables.
// ─────────────────────────────────────────────────────────────────────

export const productionEquipment = pgTable('production_equipment', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  equipmentSeriesId: bigint('equipment_series_id', { mode: 'number' })
    .notNull()
    .references(() => equipmentSeries.id, { onDelete: 'restrict' }),
  equipmentItemId: bigint('equipment_item_id', { mode: 'number' })
    .references(() => equipmentItems.id, { onDelete: 'restrict' }),
  /** 'primary' = main A-camera/key-light/etc, 'secondary' = B-cam/fill,
   *  'specialty' = single-sequence (e.g. Phantom for high-speed inserts). */
  role: text('role').notNull().default('primary'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  naturalKey: unique('production_equipment_natural_key')
    .on(t.productionId, t.equipmentSeriesId, t.equipmentItemId, t.role)
    .nullsNotDistinct(),
  productionIdx: index('production_equipment_production_idx').on(t.productionId),
  seriesIdx: index('production_equipment_series_idx').on(t.equipmentSeriesId),
  itemIdx: index('production_equipment_item_idx')
    .on(t.equipmentItemId)
    .where(sql`${t.equipmentItemId} IS NOT NULL`),
}));
