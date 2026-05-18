import {
  pgTable, bigserial, bigint, boolean, integer, text, timestamp, jsonb, primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';

/**
 * Theme F item F3a — scoring stages for the /music vendor panel.
 *
 * Shape mirrors post_houses for rendering parity. Scoring-specific
 * columns: capacity_orchestra / capacity_chorus.
 */

export const scoringStages = pgTable('scoring_stages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  facilityName: text('facility_name'),
  country: text('country'),
  city: text('city'),
  capacityOrchestra: integer('capacity_orchestra'),
  capacityChorus: integer('capacity_chorus'),
  website: text('website'),
  notes: text('notes'),
  // 0079 — booking + format specs.
  dayRateUsdMin: integer('day_rate_usd_min'),
  dayRateUsdMax: integer('day_rate_usd_max'),
  atmosCapable: boolean('atmos_capable').notNull().default(false),
  yearOpened: integer('year_opened'),
  console: text('console'),
  primaryMicChain: text('primary_mic_chain'),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  // F1-aligned provenance.
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('scoring_stages_country_idx').on(t.country),
  dataTierIdx: index('scoring_stages_data_tier_idx').on(t.dataTier),
}));

export const productionScoringStages = pgTable('production_scoring_stages', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  scoringStageId: bigint('scoring_stage_id', { mode: 'number' })
    .notNull()
    .references(() => scoringStages.id, { onDelete: 'restrict' }),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.scoringStageId] }),
  stageIdx: index('production_scoring_stages_stage_idx').on(t.scoringStageId),
}));
