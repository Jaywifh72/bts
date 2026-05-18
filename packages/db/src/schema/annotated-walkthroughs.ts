import {
  pgTable, bigserial, bigint, integer, text, timestamp, jsonb, numeric, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';
import { people } from './people.ts';

/**
 * Migration 0090 — annotated_walkthroughs + walkthrough_beats.
 * Scene-level / cue-level / shot-level breakdowns with timestamped beats.
 */
export const annotatedWalkthroughs = pgTable('annotated_walkthroughs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  productionId: bigint('production_id', { mode: 'number' }).notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  headline: text('headline').notNull(),
  sceneLabel: text('scene_label'),
  leadCredit: text('lead_credit'),
  leadPersonId: bigint('lead_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  durationS: integer('duration_s'),
  summary: text('summary'),
  body: text('body'),
  tags: text('tags').array().notNull().default(sql`'{}'`),
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
  kindIdx: index('annotated_walkthroughs_kind_idx').on(t.kind),
  productionIdx: index('annotated_walkthroughs_production_idx').on(t.productionId),
  leadIdx: index('annotated_walkthroughs_lead_idx').on(t.leadPersonId),
}));

export const walkthroughBeats = pgTable('walkthrough_beats', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  walkthroughId: bigint('walkthrough_id', { mode: 'number' }).notNull()
    .references(() => annotatedWalkthroughs.id, { onDelete: 'cascade' }),
  timecode: text('timecode').notNull(),
  timecodeS: numeric('timecode_s', { precision: 10, scale: 3 }),
  durationS: numeric('duration_s', { precision: 10, scale: 3 }),
  beatKind: text('beat_kind'),
  label: text('label').notNull(),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  walkthroughIdx: index('walkthrough_beats_walkthrough_idx').on(t.walkthroughId),
  timecodeIdx: index('walkthrough_beats_timecode_idx').on(t.walkthroughId, t.timecodeS),
}));
