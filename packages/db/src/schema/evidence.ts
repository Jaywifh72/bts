import {
  bigserial, bigint, integer, text, timestamp, pgTable, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  evidenceKindEnum,
  evidenceReviewStatusEnum,
} from './enums.ts';
import { claims } from './claims.ts';
import { sources } from './sources.ts';

export const evidenceItems = pgTable('evidence_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  claimId: bigint('claim_id', { mode: 'number' })
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  sourceId: bigint('source_id', { mode: 'number' })
    .references(() => sources.id, { onDelete: 'set null' }),
  kind: evidenceKindEnum('kind').notNull(),
  reviewStatus: evidenceReviewStatusEnum('review_status').notNull().default('pending'),
  thumbnailUrl: text('thumbnail_url'),
  assetUrl: text('asset_url'),
  caption: text('caption'),
  rightsNote: text('rights_note'),
  createdBy: text('created_by'),
  timestampSeconds: integer('timestamp_seconds'),
  pageNumber: integer('page_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  claimIdx: index('evidence_items_claim_idx').on(t.claimId),
  sourceIdx: index('evidence_items_source_idx')
    .on(t.sourceId)
    .where(sql`${t.sourceId} IS NOT NULL`),
  kindIdx: index('evidence_items_kind_idx').on(t.kind),
  reviewIdx: index('evidence_items_review_status_idx').on(t.reviewStatus),
  timestampCheck: check('evidence_items_timestamp_seconds_check',
    sql`${t.timestampSeconds} IS NULL OR ${t.timestampSeconds} >= 0`),
  pageCheck: check('evidence_items_page_number_check',
    sql`${t.pageNumber} IS NULL OR ${t.pageNumber} > 0`),
}));
