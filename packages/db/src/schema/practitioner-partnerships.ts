import {
  pgTable, bigserial, bigint, text, timestamp, jsonb, unique, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { people } from './people.ts';
import { productionDataTierEnum } from './productions.ts';

/**
 * Migration 0086 — long-term creative partnerships.
 *
 * Scorsese × Schoonmaker, Spielberg × Williams, Coens × Burwell.
 * Editorial fields are stored; film count + year range derived at
 * query time from crew_assignments.
 */
export const practitionerPartnerships = pgTable('practitioner_partnerships', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  primaryPersonId: bigint('primary_person_id', { mode: 'number' }).notNull()
    .references(() => people.id, { onDelete: 'cascade' }),
  partnerPersonId: bigint('partner_person_id', { mode: 'number' }).notNull()
    .references(() => people.id, { onDelete: 'cascade' }),
  partnerRole: text('partner_role').notNull(),
  arcSummary: text('arc_summary'),
  signatureFilms: text('signature_films').array().notNull().default(sql`'{}'::text[]`),
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
  partnershipUnique: unique('practitioner_partnerships_unique')
    .on(t.primaryPersonId, t.partnerPersonId, t.partnerRole),
  primaryIdx: index('practitioner_partnerships_primary_idx').on(t.primaryPersonId),
  partnerIdx: index('practitioner_partnerships_partner_idx').on(t.partnerPersonId),
}));
