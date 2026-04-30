import {
  pgTable, bigserial, bigint, text, integer, timestamp, jsonb, unique, index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  equipmentManufacturerKindEnum,
  equipmentSeriesCategoryEnum,
  equipmentItemStatusEnum,
} from './enums.ts';

export const equipmentManufacturers = pgTable('equipment_manufacturers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  kind: equipmentManufacturerKindEnum('kind').notNull(),
  country: text('country'),
  foundedYear: integer('founded_year'),
  website: text('website'),
  description: text('description'),
  wikidataId: text('wikidata_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const equipmentSeries = pgTable('equipment_series', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' })
    .notNull()
    .references(() => equipmentManufacturers.id, { onDelete: 'restrict' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: equipmentSeriesCategoryEnum('category').notNull(),
  yearIntroduced: integer('year_introduced'),
  yearDiscontinued: integer('year_discontinued'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  manufacturerCategoryIdx: index('equipment_series_manuf_cat_idx').on(t.manufacturerId, t.category),
}));

export const equipmentItems = pgTable('equipment_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  seriesId: bigint('series_id', { mode: 'number' })
    .notNull()
    .references(() => equipmentSeries.id, { onDelete: 'restrict' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  modelNumber: text('model_number'),
  yearIntroduced: integer('year_introduced'),
  yearDiscontinued: integer('year_discontinued'),
  status: equipmentItemStatusEnum('status').notNull().default('active'),
  specs: jsonb('specs').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Required for the composite FK target in equipment_usage (Task 10):
  idSeriesUnique: unique('equipment_items_id_series_unique').on(t.id, t.seriesId),
  seriesIdx: index('equipment_items_series_idx').on(t.seriesId),
  statusIdx: index('equipment_items_status_idx').on(t.status),
  specsGinIdx: index('equipment_items_specs_gin_idx').using('gin', t.specs),
}));
