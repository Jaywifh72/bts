import {
  pgTable, bigserial, bigint, integer, text, timestamp, jsonb, index, unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productionDataTierEnum } from './productions.ts';

/**
 * Migration 0087 — craft_decision_trees + craft_decision_options.
 * Generic editorial framework for "when to choose X vs Y" across crafts.
 */

export const craftDecisionTrees = pgTable('craft_decision_trees', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  craft: text('craft').notNull(),
  title: text('title').notNull(),
  question: text('question').notNull(),
  summary: text('summary'),
  decisionFactors: text('decision_factors').array().notNull().default(sql`'{}'`),
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
  craftIdx: index('craft_decision_trees_craft_idx').on(t.craft),
}));

export const craftDecisionOptions = pgTable('craft_decision_options', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  treeId: bigint('tree_id', { mode: 'number' })
    .notNull()
    .references(() => craftDecisionTrees.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  label: text('label').notNull(),
  summary: text('summary'),
  whenToChoose: text('when_to_choose').array().notNull().default(sql`'{}'`),
  pros: text('pros').array().notNull().default(sql`'{}'`),
  cons: text('cons').array().notNull().default(sql`'{}'`),
  costBand: text('cost_band'),
  complexityBand: text('complexity_band'),
  exampleFilms: text('example_films').array().notNull().default(sql`'{}'`),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  treeIdx: index('craft_decision_options_tree_idx').on(t.treeId),
  uniq: unique('craft_decision_options_unique').on(t.treeId, t.slug),
}));
