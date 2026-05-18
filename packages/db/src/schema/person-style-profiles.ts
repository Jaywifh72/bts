import {
  pgTable, bigserial, bigint, text, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { people } from './people.ts';
import { productionDataTierEnum } from './productions.ts';

/**
 * Migration 0085 — generic "learn from the greats" style profile.
 * Works for any practitioner (DP, colorist, editor, composer, etc).
 * Rendered by <StyleProfile /> on /crew/[slug].
 */
export const personStyleProfiles = pgTable('person_style_profiles', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  personId: bigint('person_id', { mode: 'number' }).notNull().unique()
    .references(() => people.id, { onDelete: 'cascade' }),
  philosophy: text('philosophy'),
  signatureTechniques: text('signature_techniques').array().notNull().default(sql`'{}'::text[]`),
  toolsOfChoice: text('tools_of_choice').array().notNull().default(sql`'{}'::text[]`),
  tells: text('tells'),
  processNotes: text('process_notes'),
  influences: text('influences').array().notNull().default(sql`'{}'::text[]`),
  careerArc: text('career_arc'),
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
  personIdx: index('person_style_profiles_person_idx').on(t.personId),
}));
