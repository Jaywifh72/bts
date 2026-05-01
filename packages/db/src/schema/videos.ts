import { bigserial, bigint, boolean, date, index, integer, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { videoSourceEnum, videoStatusEnum, videoCategoryEnum } from './enums.ts';
import { productions } from './productions.ts';

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
