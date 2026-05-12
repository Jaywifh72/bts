import {
  bigserial, bigint, integer, text, timestamp, pgTable, unique, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  claimConfidenceEnum,
  claimConflictKindEnum,
  claimConflictResolutionStatusEnum,
  claimEntityTypeEnum,
  claimStatusEnum,
  claimTypeEnum,
} from './enums.ts';
import { sources } from './sources.ts';

export const claims = pgTable('claims', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  claimType: claimTypeEnum('claim_type').notNull(),
  statement: text('statement').notNull(),
  normalizedStatement: text('normalized_statement').notNull(),
  status: claimStatusEnum('status').notNull().default('candidate'),
  confidence: claimConfidenceEnum('confidence').notNull().default('inferred'),
  editorialNote: text('editorial_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  verifiedBy: text('verified_by'),
}, (t) => ({
  typeIdx: index('claims_type_idx').on(t.claimType),
  statusIdx: index('claims_status_idx').on(t.status),
  confidenceIdx: index('claims_confidence_idx').on(t.confidence),
  lastVerifiedIdx: index('claims_last_verified_idx').on(t.lastVerifiedAt),
}));

export const claimSources = pgTable('claim_sources', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  claimId: bigint('claim_id', { mode: 'number' })
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: claimConfidenceEnum('confidence').notNull(),
  quote: text('quote'),
  timestampSeconds: integer('timestamp_seconds'),
  pageNumber: integer('page_number'),
  urlFragment: text('url_fragment'),
  editorialNote: text('editorial_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  claimIdx: index('claim_sources_claim_idx').on(t.claimId),
  sourceIdx: index('claim_sources_source_idx').on(t.sourceId),
  timestampCheck: check('claim_sources_timestamp_seconds_check',
    sql`${t.timestampSeconds} IS NULL OR ${t.timestampSeconds} >= 0`),
  pageCheck: check('claim_sources_page_number_check',
    sql`${t.pageNumber} IS NULL OR ${t.pageNumber} > 0`),
}));

export const claimEntities = pgTable('claim_entities', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  claimId: bigint('claim_id', { mode: 'number' })
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  entityType: claimEntityTypeEnum('entity_type').notNull(),
  entityId: bigint('entity_id', { mode: 'number' }).notNull(),
  entitySlug: text('entity_slug'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  claimEntityUnq: unique('claim_entities_claim_entity_unq')
    .on(t.claimId, t.entityType, t.entityId),
  claimIdx: index('claim_entities_claim_idx').on(t.claimId),
  reverseIdx: index('claim_entities_reverse_idx').on(t.entityType, t.entityId),
}));

export const claimConflicts = pgTable('claim_conflicts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  claimAId: bigint('claim_a_id', { mode: 'number' })
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  claimBId: bigint('claim_b_id', { mode: 'number' })
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  conflictKind: claimConflictKindEnum('conflict_kind').notNull(),
  resolutionStatus: claimConflictResolutionStatusEnum('resolution_status')
    .notNull()
    .default('open'),
  resolutionNote: text('resolution_note'),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  claimAIdx: index('claim_conflicts_claim_a_idx').on(t.claimAId),
  claimBIdx: index('claim_conflicts_claim_b_idx').on(t.claimBId),
  statusIdx: index('claim_conflicts_resolution_status_idx').on(t.resolutionStatus),
  differentClaimsCheck: check('claim_conflicts_different_claims_check',
    sql`${t.claimAId} <> ${t.claimBId}`),
}));
