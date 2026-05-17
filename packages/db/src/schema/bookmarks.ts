import { pgTable, text, timestamp, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './auth.ts';

export const bookmarks = pgTable(
  'bookmarks',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    href: text('href').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.kind, t.slug] }),
    userAddedIdx: index('bookmarks_user_added_idx').on(t.userId, t.addedAt.desc()),
  }),
);
