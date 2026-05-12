import {
  bigserial, bigint, text, timestamp, pgTable, unique, index,
} from 'drizzle-orm/pg-core';
import { productions } from './productions.ts';

export const socialPostLog = pgTable('social_post_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  postedAt: timestamp('posted_at', { withTimezone: true }).notNull().defaultNow(),
  postUrl: text('post_url'),
  status: text('status').notNull(),
  error: text('error'),
}, (t) => ({
  prodChannelUnq: unique('social_post_log_production_id_channel_key')
    .on(t.productionId, t.channel),
  productionIdx: index('social_post_log_production_idx').on(t.productionId),
}));
