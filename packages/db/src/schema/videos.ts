import { bigserial, bigint, boolean, date, index, integer, numeric, pgTable, text, timestamp, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  transcriptStatusEnum,
  videoAnnotationReviewStatusEnum,
  videoAnnotationTypeEnum,
  videoSourceEnum,
  videoStatusEnum,
  videoCategoryEnum,
} from './enums.ts';
import { productions } from './productions.ts';
import { claims } from './claims.ts';
import { evidenceItems } from './evidence.ts';

export const productionVideos = pgTable('production_videos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  source: videoSourceEnum('source').notNull(),
  externalId: text('external_id').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  channelName: text('channel_name'),
  channelId: text('channel_id'),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'),
  viewCount: integer('view_count'),
  publishedAt: date('published_at'),
  category: videoCategoryEnum('category').notNull(),
  confidenceScore: numeric('confidence_score', { precision: 4, scale: 3 }).notNull(),
  status: videoStatusEnum('status').notNull().default('pending'),
  categoryLocked: boolean('category_locked').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('production_videos_unique').on(t.productionId, t.source, t.externalId),
  index('production_videos_status_idx').on(t.productionId, t.status, t.category),
]);

export const productionVideoTranscripts = pgTable('production_video_transcripts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  videoId: bigint('video_id', { mode: 'number' })
    .notNull()
    .references(() => productionVideos.id, { onDelete: 'cascade' }),
  languageCode: text('language_code').notNull().default('en'),
  status: transcriptStatusEnum('status').notNull().default('pending'),
  sourceLabel: text('source_label'),
  fullText: text('full_text'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('production_video_transcripts_video_language_unq').on(t.videoId, t.languageCode),
  index('production_video_transcripts_status_idx').on(t.status),
]);

export const productionVideoTranscriptSegments = pgTable('production_video_transcript_segments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  transcriptId: bigint('transcript_id', { mode: 'number' })
    .notNull()
    .references(() => productionVideoTranscripts.id, { onDelete: 'cascade' }),
  startSeconds: integer('start_seconds').notNull(),
  endSeconds: integer('end_seconds'),
  text: text('text').notNull(),
  confidenceScore: numeric('confidence_score', { precision: 4, scale: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('production_video_transcript_segments_transcript_idx').on(t.transcriptId, t.startSeconds),
  check('production_video_transcript_segments_time_check',
    sql`${t.startSeconds} >= 0 AND (${t.endSeconds} IS NULL OR ${t.endSeconds} >= ${t.startSeconds})`),
]);

export const productionVideoChapters = pgTable('production_video_chapters', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  videoId: bigint('video_id', { mode: 'number' })
    .notNull()
    .references(() => productionVideos.id, { onDelete: 'cascade' }),
  startSeconds: integer('start_seconds').notNull(),
  endSeconds: integer('end_seconds'),
  title: text('title').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('production_video_chapters_video_start_unq').on(t.videoId, t.startSeconds),
  index('production_video_chapters_video_idx').on(t.videoId, t.startSeconds),
  check('production_video_chapters_time_check',
    sql`${t.startSeconds} >= 0 AND (${t.endSeconds} IS NULL OR ${t.endSeconds} >= ${t.startSeconds})`),
]);

export const productionVideoTimestampAnnotations = pgTable('production_video_timestamp_annotations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  videoId: bigint('video_id', { mode: 'number' })
    .notNull()
    .references(() => productionVideos.id, { onDelete: 'cascade' }),
  claimId: bigint('claim_id', { mode: 'number' })
    .references(() => claims.id, { onDelete: 'set null' }),
  evidenceItemId: bigint('evidence_item_id', { mode: 'number' })
    .references(() => evidenceItems.id, { onDelete: 'set null' }),
  annotationType: videoAnnotationTypeEnum('annotation_type').notNull(),
  reviewStatus: videoAnnotationReviewStatusEnum('review_status').notNull().default('pending'),
  startSeconds: integer('start_seconds').notNull(),
  endSeconds: integer('end_seconds'),
  label: text('label').notNull(),
  note: text('note'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('production_video_timestamp_annotations_video_idx').on(t.videoId, t.startSeconds),
  index('production_video_timestamp_annotations_claim_idx')
    .on(t.claimId)
    .where(sql`${t.claimId} IS NOT NULL`),
  // 0050 — reverse-lookup ("which annotations cite this evidence item").
  index('production_video_timestamp_annotations_evidence_idx')
    .on(t.evidenceItemId)
    .where(sql`${t.evidenceItemId} IS NOT NULL`),
  index('production_video_timestamp_annotations_status_idx').on(t.reviewStatus),
  index('production_video_timestamp_annotations_type_idx').on(t.annotationType),
  check('production_video_timestamp_annotations_time_check',
    sql`${t.startSeconds} >= 0 AND (${t.endSeconds} IS NULL OR ${t.endSeconds} >= ${t.startSeconds})`),
]);
