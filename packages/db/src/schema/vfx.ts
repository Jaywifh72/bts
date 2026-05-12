import {
  pgTable, bigserial, bigint, serial,
  integer, text, timestamp, jsonb, primaryKey, unique, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  vfxCreditRoleEnum,
  vfxTechniqueCategoryEnum,
  sourceConfidenceEnum,
  vfxHouseKindEnum,
} from './enums.ts';
import { productions } from './productions.ts';
import { sources } from './sources.ts';

export const vfxHouses = pgTable('vfx_houses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  // E-19: classify by operating model so /films and /vfx surfaces can
  // group ILM (full_service) from a one-shot boutique like Important
  // Looking Pirates from an in-house team like Marvel Studios VFX.
  kind: vfxHouseKindEnum('kind'),
  country: text('country'),
  foundedYear: integer('founded_year'),
  website: text('website'),
  wikidataId: text('wikidata_id').unique(),
  // 0037 editorial-page additions.
  summary: text('summary'),
  headquarters: text('headquarters'),
  parentCompany: text('parent_company'),
  employeeCount: integer('employee_count'),
  tagline: text('tagline'),
  careersUrl: text('careers_url'),
  reelUrl: text('reel_url'),
  // 0038 — JSONB array of `{ title, url, publication, kind }` editorial
  // pointers (Wikipedia, fxguide, studio about-pages, public interviews).
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vfxHouseOffices = pgTable('vfx_house_offices', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  vfxHouseId: bigint('vfx_house_id', { mode: 'number' })
    .notNull()
    .references(() => vfxHouses.id, { onDelete: 'cascade' }),
  city: text('city').notNull(),
  country: text('country'),
  isHeadquarters: integer('is_headquarters').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  houseCityUnq: unique('vfx_house_offices_vfx_house_id_city_key').on(t.vfxHouseId, t.city),
  houseIdx: index('vfx_house_offices_house_idx').on(t.vfxHouseId, t.sortOrder),
}));

export const vfxHouseHighlights = pgTable('vfx_house_highlights', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  vfxHouseId: bigint('vfx_house_id', { mode: 'number' })
    .notNull()
    .references(() => vfxHouses.id, { onDelete: 'cascade' }),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  editorialNote: text('editorial_note').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  houseProdUnq: unique('vfx_house_highlights_vfx_house_id_production_id_key').on(t.vfxHouseId, t.productionId),
  houseIdx: index('vfx_house_highlights_house_idx').on(t.vfxHouseId, t.sortOrder),
  // 0050 — reverse-lookup ("which highlights point at this production").
  productionIdx: index('vfx_house_highlights_production_idx').on(t.productionId),
}));

export const vfxCredits = pgTable('vfx_credits', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  vfxHouseId: bigint('vfx_house_id', { mode: 'number' })
    .notNull()
    .references(() => vfxHouses.id, { onDelete: 'restrict' }),
  shotCount: integer('shot_count'),
  role: vfxCreditRoleEnum('role').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionHouseUnq: unique('vfx_credits_production_house_unq').on(t.productionId, t.vfxHouseId),
  productionIdx: index('vfx_credits_production_idx').on(t.productionId),
  houseIdx: index('vfx_credits_house_idx').on(t.vfxHouseId),
}));

export const vfxTechniques = pgTable('vfx_techniques', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: vfxTechniqueCategoryEnum('category').notNull(),
});

export const productionVfxTechniques = pgTable('production_vfx_techniques', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  techniqueId: integer('technique_id')
    .notNull()
    .references(() => vfxTechniques.id, { onDelete: 'restrict' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.techniqueId] }),
  productionIdx: index('production_vfx_techniques_production_idx').on(t.productionId),
  // 0050 — reverse-lookup ("which productions use technique X").
  techniqueIdx: index('production_vfx_techniques_technique_idx').on(t.techniqueId),
}));

export const vfxHouseSources = pgTable('vfx_house_sources', {
  vfxHouseId: bigint('vfx_house_id', { mode: 'number' })
    .notNull()
    .references(() => vfxHouses.id, { onDelete: 'cascade' }),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: sourceConfidenceEnum('confidence').notNull(),
  claimQuote: text('claim_quote'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.vfxHouseId, t.sourceId] }),
  sourceIdx: index('vfx_house_sources_source_idx').on(t.sourceId),
}));
