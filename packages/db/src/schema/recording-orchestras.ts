import {
  pgTable, bigserial, bigint, integer, text, timestamp, jsonb,
  primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productionDataTierEnum } from './productions.ts';
import { scoringStages } from './scoring-stages.ts';
import { scoreWorks } from './score-works.ts';

/**
 * Migration 0083 — recording orchestras as entities. LSO, VSSO,
 * Hollywood Studio Symphony, Boston Symphony, Skywalker, RPO.
 * Promotes the text-only score_works.recording_orchestra to a
 * citable, cross-cuttable surface.
 */
export const recordingOrchestras = pgTable('recording_orchestras', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  country: text('country'),
  city: text('city'),
  foundedYear: integer('founded_year'),
  musicDirector: text('music_director'),
  primaryScoringStageId: bigint('primary_scoring_stage_id', { mode: 'number' })
    .references(() => scoringStages.id, { onDelete: 'set null' }),
  ensembleSize: integer('ensemble_size'),
  specialties: text('specialties').array(),
  website: text('website'),
  wikidataId: text('wikidata_id').unique(),
  summary: text('summary'),
  tagline: text('tagline'),
  parentCompany: text('parent_company'),
  careersUrl: text('careers_url'),
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
  countryIdx: index('recording_orchestras_country_idx').on(t.country),
}));

export const scoreWorkOrchestras = pgTable('score_work_orchestras', {
  scoreWorkId: bigint('score_work_id', { mode: 'number' })
    .notNull()
    .references(() => scoreWorks.id, { onDelete: 'cascade' }),
  orchestraId: bigint('orchestra_id', { mode: 'number' })
    .notNull()
    .references(() => recordingOrchestras.id, { onDelete: 'restrict' }),
  ensembleSize: integer('ensemble_size'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.scoreWorkId, t.orchestraId] }),
  orchIdx: index('score_work_orchestras_orch_idx').on(t.orchestraId),
}));
