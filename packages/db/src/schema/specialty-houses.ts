import {
  pgTable, bigserial, bigint, integer, text, timestamp, jsonb,
  primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';

/**
 * Migration 0084 — two specialty fabrication / design houses that
 * share the same shape:
 *   makeup_effects_houses — KNB EFX, Legacy, Spectral, Tom Savini.
 *   title_sequence_houses — Imaginary Forces, Prologue, Mill+, Picturemill.
 *
 * Both follow the FacilityProfile editorial template.
 */

export const makeupEffectsHouses = pgTable('makeup_effects_houses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country'),
  city: text('city'),
  headquarters: text('headquarters'),
  foundedYear: integer('founded_year'),
  parentCompany: text('parent_company'),
  employeeCount: integer('employee_count'),
  website: text('website'),
  careersUrl: text('careers_url'),
  reelUrl: text('reel_url'),
  wikidataId: text('wikidata_id').unique(),
  summary: text('summary'),
  tagline: text('tagline'),
  specialties: text('specialties').array(),
  founders: text('founders').array(),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('makeup_effects_houses_country_idx').on(t.country),
}));

export const productionMakeupEffectsHouses = pgTable('production_makeup_effects_houses', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  houseId: bigint('house_id', { mode: 'number' })
    .notNull()
    .references(() => makeupEffectsHouses.id, { onDelete: 'restrict' }),
  creditedUse: text('credited_use'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.houseId] }),
  houseIdx: index('production_makeup_effects_houses_house_idx').on(t.houseId),
}));

export const titleSequenceHouses = pgTable('title_sequence_houses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country'),
  city: text('city'),
  headquarters: text('headquarters'),
  foundedYear: integer('founded_year'),
  parentCompany: text('parent_company'),
  employeeCount: integer('employee_count'),
  website: text('website'),
  careersUrl: text('careers_url'),
  reelUrl: text('reel_url'),
  wikidataId: text('wikidata_id').unique(),
  summary: text('summary'),
  tagline: text('tagline'),
  specialties: text('specialties').array(),
  founders: text('founders').array(),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('title_sequence_houses_country_idx').on(t.country),
}));

export const productionTitleSequenceHouses = pgTable('production_title_sequence_houses', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  houseId: bigint('house_id', { mode: 'number' })
    .notNull()
    .references(() => titleSequenceHouses.id, { onDelete: 'restrict' }),
  sequenceKind: text('sequence_kind'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.houseId, t.sequenceKind] }),
  houseIdx: index('production_title_sequence_houses_house_idx').on(t.houseId),
}));
