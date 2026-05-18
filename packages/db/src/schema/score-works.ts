import {
  pgTable, bigserial, bigint, integer, text, timestamp, unique, index,
  primaryKey, customType,
} from 'drizzle-orm/pg-core';
import { productions, productionDataTierEnum } from './productions.ts';
import { people } from './people.ts';
import { scoringStages } from './scoring-stages.ts';
import { sources } from './sources.ts';
import { sourceConfidenceEnum } from './enums.ts';

/**
 * Postgres native bigint[] — drizzle's `bigint().array()` doesn't quite
 * cover the mode='number' case we want for co_composer_person_ids.
 */
const bigintArray = customType<{ data: number[]; driverData: string }>({
  dataType() { return 'bigint[]'; },
  fromDriver(value) {
    if (Array.isArray(value)) return value as unknown as number[];
    if (typeof value === 'string') {
      // postgres-js returns array literals as '{1,2,3}' on rare paths
      return value.slice(1, -1).split(',').filter(Boolean).map((n) => Number(n));
    }
    return [];
  },
});

/**
 * Migration 0073 — per-(production, composer) scoring metadata. One row per
 * composer credit, so co-composer pairs (Reznor/Ross, Glass/Foss) yield
 * two rows and the index page can rank composers cleanly.
 *
 * scoring_stage_id is a soft FK — when the recording venue is in our
 * catalog, link it; otherwise free-text `recording_location`.
 */
export const scoreWorks = pgTable('score_works', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  composerPersonId: bigint('composer_person_id', { mode: 'number' })
    .notNull()
    .references(() => people.id, { onDelete: 'restrict' }),
  coComposerPersonIds: bigintArray('co_composer_person_ids').notNull().default([]),
  scoringMixerPersonId: bigint('scoring_mixer_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  musicEditorPersonId: bigint('music_editor_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  scoringStageId: bigint('scoring_stage_id', { mode: 'number' })
    .references(() => scoringStages.id, { onDelete: 'set null' }),
  recordingOrchestra: text('recording_orchestra'),
  recordingLocation: text('recording_location'),
  // sessionDates is a daterange — drizzle has no first-class daterange type,
  // so we expose it as text on read. Writers should INSERT a daterange literal.
  sessionDates: text('session_dates'),
  cueCountEstimate: integer('cue_count_estimate'),
  runtimeMinutes: integer('runtime_minutes'),
  releaseLabel: text('release_label'),
  releaseFormat: text('release_format'),
  releaseUrl: text('release_url'),
  themesSummary: text('themes_summary'),
  summary: text('summary'),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionComposerUnique: unique('score_works_unique').on(t.productionId, t.composerPersonId),
  productionIdx: index('score_works_production_idx').on(t.productionId),
  composerIdx: index('score_works_composer_idx').on(t.composerPersonId),
  stageIdx: index('score_works_stage_idx').on(t.scoringStageId),
}));

export const scoreWorkSources = pgTable('score_work_sources', {
  scoreWorkId: bigint('score_work_id', { mode: 'number' })
    .notNull()
    .references(() => scoreWorks.id, { onDelete: 'cascade' }),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: sourceConfidenceEnum('confidence').notNull(),
  claimQuote: text('claim_quote'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.scoreWorkId, t.sourceId] }),
  sourceIdx: index('score_work_sources_source_idx').on(t.sourceId),
}));
