import { bigserial, bigint, boolean, index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { awardOrgEnum } from './enums.ts';
import { productions } from './productions.ts';
import { people } from './people.ts';

export const productionAwards = pgTable('production_awards', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  awardOrg: awardOrgEnum('award_org').notNull(),
  category: text('category').notNull(),
  year: integer('year').notNull(),
  isWinner: boolean('is_winner').notNull().default(false),
  recipientPersonId: bigint('recipient_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionIdx: index('production_awards_production_idx').on(t.productionId, t.year),
  recipientIdx: index('production_awards_recipient_idx').on(t.recipientPersonId, t.year),
  // 0050 — NULLS NOT DISTINCT collapses production-level awards (Best Picture,
  // Best VFX team, etc.) where recipient_person_id IS NULL. Without it, seed
  // re-runs duplicated every NULL-recipient award.
  uniq: unique('production_awards_unique')
    .on(t.productionId, t.awardOrg, t.category, t.year, t.recipientPersonId)
    .nullsNotDistinct(),
}));
