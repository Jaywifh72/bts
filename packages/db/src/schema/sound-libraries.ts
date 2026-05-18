import {
  pgTable, bigserial, bigint, integer, text, jsonb, timestamp, primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';
import { sources } from './sources.ts';
import { sourceConfidenceEnum } from './enums.ts';

/**
 * Migration 0075 — third-party SFX library catalog + per-production credits.
 * Sparse table; uniquely citable. Used by /sound/effects and the per-film
 * post-sound editorial block.
 */
export const soundLibraries = pgTable('sound_libraries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  publisher: text('publisher'),
  country: text('country'),
  foundedYear: integer('founded_year'),
  websiteUrl: text('website_url'),
  summary: text('summary'),
  specialties: text('specialties').array(),
  // 0082 — VFX-house editorial parity.
  tagline: text('tagline'),
  headquarters: text('headquarters'),
  parentCompany: text('parent_company'),
  employeeCount: integer('employee_count'),
  wikidataId: text('wikidata_id').unique(),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('sound_libraries_country_idx').on(t.country),
}));

export const productionSoundLibraries = pgTable('production_sound_libraries', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  libraryId: bigint('library_id', { mode: 'number' })
    .notNull()
    .references(() => soundLibraries.id, { onDelete: 'restrict' }),
  creditedUse: text('credited_use'),
  creditedIn: text('credited_in'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.libraryId] }),
  libIdx: index('production_sound_libraries_lib_idx').on(t.libraryId),
}));

export const productionSoundLibrarySources = pgTable('production_sound_library_sources', {
  productionId: bigint('production_id', { mode: 'number' }).notNull(),
  libraryId: bigint('library_id', { mode: 'number' }).notNull(),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: sourceConfidenceEnum('confidence').notNull(),
  claimQuote: text('claim_quote'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.libraryId, t.sourceId] }),
}));
