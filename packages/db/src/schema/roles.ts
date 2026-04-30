import { pgTable, smallserial, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { roleCategoryEnum } from './enums.ts';

export const roles = pgTable('roles', {
  id: smallserial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  aliases: text('aliases').array().notNull().default(sql`ARRAY[]::text[]`),
  category: roleCategoryEnum('category').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  categoryIdx: index('roles_category_idx').on(t.category),
  aliasesGinIdx: index('roles_aliases_gin_idx').using('gin', t.aliases),
}));
