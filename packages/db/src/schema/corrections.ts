import { bigserial, bigint, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { correctionStatusEnum } from './enums.ts';
import { productions } from './productions.ts';

export const corrections = pgTable('corrections', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .references(() => productions.id, { onDelete: 'set null' }),
  pageUrl: text('page_url').notNull(),
  message: text('message').notNull(),
  email: text('email'),
  status: correctionStatusEnum('status').notNull().default('open'),
  triageNotes: text('triage_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusCreatedIdx: index('corrections_status_created_idx').on(t.status, t.createdAt),
  productionIdx: index('corrections_production_idx').on(t.productionId, t.createdAt),
}));
