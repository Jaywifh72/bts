import {
  pgTable, bigserial, bigint, text, timestamp, jsonb, index, unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';
import { people } from './people.ts';

/**
 * Migration 0089 — production_craft_dossiers.
 * Per-production deep-dive dossiers for PD / costume / makeup-hair.
 */
export const productionCraftDossiers = pgTable('production_craft_dossiers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  productionId: bigint('production_id', { mode: 'number' }).notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  craft: text('craft').notNull(),
  headline: text('headline').notNull(),
  leadCredit: text('lead_credit'),
  leadPersonId: bigint('lead_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  summary: text('summary'),
  body: text('body'),
  signatureLooks: text('signature_looks').array().notNull().default(sql`'{}'`),
  techniques: text('techniques').array().notNull().default(sql`'{}'`),
  referencesConsulted: text('references_consulted').array().notNull().default(sql`'{}'`),
  collaborators: text('collaborators').array().notNull().default(sql`'{}'`),
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
  craftIdx: index('production_craft_dossiers_craft_idx').on(t.craft),
  productionIdx: index('production_craft_dossiers_production_idx').on(t.productionId),
  leadIdx: index('production_craft_dossiers_lead_idx').on(t.leadPersonId),
  uniq: unique('production_craft_dossiers_unique').on(t.productionId, t.craft, t.leadCredit),
}));
