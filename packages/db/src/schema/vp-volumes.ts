import {
  pgTable, bigserial, bigint, integer, text, boolean, timestamp,
  numeric, jsonb, primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';
import { sources } from './sources.ts';
import { sourceConfidenceEnum } from './enums.ts';

/**
 * Migration 0078 — virtual production LED-volume / ICVFX stage catalog.
 * Stagecraft (ILM), MARS (Pinewood), Volume 51 (Disney), Lux Machina,
 * etc. The citable cross-cut nobody else aggregates for the VP-era VFX
 * audience.
 */
export const vpVolumes = pgTable('vp_volumes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  facilityName: text('facility_name'),
  operator: text('operator'),
  country: text('country'),
  city: text('city'),
  ledBrand: text('led_brand'),
  ledPitchMm: numeric('led_pitch_mm', { precision: 4, scale: 2 }),
  wallWidthM: numeric('wall_width_m', { precision: 5, scale: 2 }),
  wallHeightM: numeric('wall_height_m', { precision: 5, scale: 2 }),
  ceilingPresent: boolean('ceiling_present').notNull().default(false),
  ceilingHeightM: numeric('ceiling_height_m', { precision: 5, scale: 2 }),
  trackingSystem: text('tracking_system'),
  renderEngine: text('render_engine'),
  colorPipeline: text('color_pipeline'),
  completionYear: integer('completion_year'),
  atmosCapable: boolean('atmos_capable').notNull().default(false),
  websiteUrl: text('website_url'),
  summary: text('summary'),
  // 0082 — VFX-house editorial parity.
  tagline: text('tagline'),
  headquarters: text('headquarters'),
  parentCompany: text('parent_company'),
  employeeCount: integer('employee_count'),
  wikidataId: text('wikidata_id').unique(),
  careersUrl: text('careers_url'),
  reelUrl: text('reel_url'),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('vp_volumes_country_idx').on(t.country),
  operatorIdx: index('vp_volumes_operator_idx').on(t.operator),
}));

export const productionVpVolumes = pgTable('production_vp_volumes', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  volumeId: bigint('volume_id', { mode: 'number' })
    .notNull()
    .references(() => vpVolumes.id, { onDelete: 'restrict' }),
  creditedUse: text('credited_use'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.volumeId] }),
  volumeIdx: index('production_vp_volumes_volume_idx').on(t.volumeId),
}));

export const productionVpVolumeSources = pgTable('production_vp_volume_sources', {
  productionId: bigint('production_id', { mode: 'number' }).notNull(),
  volumeId: bigint('volume_id', { mode: 'number' }).notNull(),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: sourceConfidenceEnum('confidence').notNull(),
  claimQuote: text('claim_quote'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.volumeId, t.sourceId] }),
}));
