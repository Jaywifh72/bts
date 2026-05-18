import {
  pgTable, pgEnum, bigserial, bigint, integer, text, timestamp, boolean,
  date, unique, index, primaryKey,
} from 'drizzle-orm/pg-core';
import { productionDataTierEnum } from './productions.ts';
import { people } from './people.ts';
import { sources } from './sources.ts';
import { sourceConfidenceEnum } from './enums.ts';
import { scoreWorks } from './score-works.ts';

export const musicCueFunctionEnum = pgEnum('music_cue_function_enum', [
  'main_title', 'end_credits', 'theme_intro', 'theme_restatement',
  'transition', 'underscore', 'source', 'source_to_score', 'montage',
  'action_set_piece', 'reveal', 'emotional_beat', 'silence_to_score',
  'other',
]);

/**
 * Migration 0074 — cue-level catalog. Curated coverage target ~500 cues
 * across the top 50 films. Cues are scoped to a score_work_id so they
 * inherit composer + production context.
 */
export const musicCues = pgTable('music_cues', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  scoreWorkId: bigint('score_work_id', { mode: 'number' })
    .notNull()
    .references(() => scoreWorks.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  trackNumber: integer('track_number'),
  runtimeSeconds: integer('runtime_seconds'),
  sceneLabel: text('scene_label'),
  sceneMinute: integer('scene_minute'),
  cueFunction: musicCueFunctionEnum('cue_function').notNull().default('underscore'),
  keySignature: text('key_signature'),
  tempoBpm: integer('tempo_bpm'),
  instrumentationSummary: text('instrumentation_summary'),
  recordingSessionDate: date('recording_session_date'),
  listeningNotes: text('listening_notes'),
  notableFor: text('notable_for'),
  isFlagship: boolean('is_flagship').notNull().default(false),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  scoreSlugUnique: unique('music_cues_score_slug_unique').on(t.scoreWorkId, t.slug),
  scoreWorkIdx: index('music_cues_score_work_idx').on(t.scoreWorkId, t.trackNumber),
  flagshipIdx: index('music_cues_flagship_idx').on(t.isFlagship),
  functionIdx: index('music_cues_function_idx').on(t.cueFunction),
}));

export const musicCueSources = pgTable('music_cue_sources', {
  cueId: bigint('cue_id', { mode: 'number' })
    .notNull()
    .references(() => musicCues.id, { onDelete: 'cascade' }),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: sourceConfidenceEnum('confidence').notNull(),
  claimQuote: text('claim_quote'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.cueId, t.sourceId] }),
  sourceIdx: index('music_cue_sources_source_idx').on(t.sourceId),
}));

export const musicCuePerformers = pgTable('music_cue_performers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  cueId: bigint('cue_id', { mode: 'number' })
    .notNull()
    .references(() => musicCues.id, { onDelete: 'cascade' }),
  personId: bigint('person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  creditedAs: text('credited_as'),
  instrument: text('instrument').notNull(),
  isSoloist: boolean('is_soloist').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  cueIdx: index('music_cue_performers_cue_idx').on(t.cueId, t.sortOrder),
  personIdx: index('music_cue_performers_person_idx').on(t.personId),
}));
