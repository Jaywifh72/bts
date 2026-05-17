import { pgTable, text, timestamp, uuid, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth.ts';

/**
 * Admin "these two rows are NOT actually the same entity" dismissals
 * for the duplicate-candidates view. (slug_low, slug_high) is sorted
 * alphabetically so the pair is canonical regardless of which row
 * appears as "a" on the page.
 */
export const ignoredDuplicates = pgTable(
  'ignored_duplicates',
  {
    tableName: text('table_name').notNull(),
    slugLow: text('slug_low').notNull(),
    slugHigh: text('slug_high').notNull(),
    ignoredAt: timestamp('ignored_at', { withTimezone: true }).notNull().defaultNow(),
    ignoredBy: uuid('ignored_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tableName, t.slugLow, t.slugHigh] }),
    slugOrder: check('ignored_duplicates_slug_order', sql`${t.slugLow} < ${t.slugHigh}`),
  }),
);
