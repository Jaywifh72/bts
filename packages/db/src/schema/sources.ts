import {
  pgTable, bigserial, bigint, integer, text, timestamp, date, primaryKey, index, uniqueIndex, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { sourceKindEnum, sourceConfidenceEnum } from './enums.ts';
import { productions } from './productions.ts';
import { scenes, equipmentUsage } from './scenes.ts';
import { crewAssignments } from './crew.ts';

export const sources = pgTable('sources', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  kind: sourceKindEnum('kind').notNull(),
  title: text('title').notNull(),
  publication: text('publication'),
  author: text('author'),
  publishedAt: date('published_at'),
  accessedAt: date('accessed_at'),
  url: text('url'),
  archiveUrl: text('archive_url'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastStatus: integer('last_status'),
  contentHash: text('content_hash'),
  canonicalUrl: text('canonical_url'),
  paywallStatus: text('paywall_status').notNull().default('unknown'),
  archiveStatus: text('archive_status').notNull().default('unknown'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Partial UNIQUE on url so duplicates dedup at insert when url is provided:
  urlUnq: uniqueIndex('sources_url_unq').on(t.url).where(sql`${t.url} IS NOT NULL`),
  kindIdx: index('sources_kind_idx').on(t.kind),
  publishedIdx: index('sources_published_idx').on(t.publishedAt),
  lastCheckedIdx: index('sources_last_checked_idx')
    .on(t.lastCheckedAt)
    .where(sql`${t.url} IS NOT NULL`),
  paywallStatusCheck: check('sources_paywall_status_check',
    sql`${t.paywallStatus} IN ('unknown', 'open', 'soft_paywall', 'hard_paywall', 'login_required')`),
  archiveStatusCheck: check('sources_archive_status_check',
    sql`${t.archiveStatus} IN ('unknown', 'not_needed', 'captured', 'missing', 'failed')`),
}));

// Helper: each call returns fresh column instances (Drizzle requires distinct
// column objects per table).
function attributionColumns() {
  return {
    sourceId: bigint('source_id', { mode: 'number' })
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    confidence: sourceConfidenceEnum('confidence').notNull(),
    claimQuote: text('claim_quote'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  };
}

export const productionSources = pgTable('production_sources', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  ...attributionColumns(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.sourceId] }),
  sourceIdx: index('production_sources_source_idx').on(t.sourceId),
}));

export const sceneSources = pgTable('scene_sources', {
  sceneId: bigint('scene_id', { mode: 'number' })
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  ...attributionColumns(),
}, (t) => ({
  pk: primaryKey({ columns: [t.sceneId, t.sourceId] }),
  sourceIdx: index('scene_sources_source_idx').on(t.sourceId),
}));

export const crewAssignmentSources = pgTable('crew_assignment_sources', {
  crewAssignmentId: bigint('crew_assignment_id', { mode: 'number' })
    .notNull()
    .references(() => crewAssignments.id, { onDelete: 'cascade' }),
  ...attributionColumns(),
}, (t) => ({
  pk: primaryKey({ columns: [t.crewAssignmentId, t.sourceId] }),
  sourceIdx: index('crew_assignment_sources_source_idx').on(t.sourceId),
}));

export const equipmentUsageSources = pgTable('equipment_usage_sources', {
  equipmentUsageId: bigint('equipment_usage_id', { mode: 'number' })
    .notNull()
    .references(() => equipmentUsage.id, { onDelete: 'cascade' }),
  ...attributionColumns(),
}, (t) => ({
  pk: primaryKey({ columns: [t.equipmentUsageId, t.sourceId] }),
  sourceIdx: index('equipment_usage_sources_source_idx').on(t.sourceId),
}));
