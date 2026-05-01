import {
  pgTable, bigserial, bigint, smallserial, smallint,
  integer, text, timestamp, primaryKey, unique, index,
} from 'drizzle-orm/pg-core';
import {
  vfxCreditRoleEnum,
  vfxTechniqueCategoryEnum,
  sourceConfidenceEnum,
} from './enums.ts';
import { productions } from './productions.ts';
import { sources } from './sources.ts';

export const vfxHouses = pgTable('vfx_houses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country'),
  foundedYear: integer('founded_year'),
  website: text('website'),
  wikidataId: text('wikidata_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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
  id: smallserial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: vfxTechniqueCategoryEnum('category').notNull(),
});

export const productionVfxTechniques = pgTable('production_vfx_techniques', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  techniqueId: smallint('technique_id')
    .notNull()
    .references(() => vfxTechniques.id, { onDelete: 'restrict' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.techniqueId] }),
  productionIdx: index('production_vfx_techniques_production_idx').on(t.productionId),
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
