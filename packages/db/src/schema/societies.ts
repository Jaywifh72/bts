import {
  pgTable, bigserial, text, integer, timestamp, index,
} from 'drizzle-orm/pg-core';

/**
 * E-20 v1 — Cinematography societies lookup. Slug-keyed metadata for
 * the society codes already stored in `people.member_societies` (ASC,
 * BSC, AFC, ...). See migration 0058 for the design rationale.
 */
export const societies = pgTable('societies', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  // Uppercase short code matching the `people.member_societies` text[].
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  fullName: text('full_name').notNull(),
  country: text('country'),
  foundedYear: integer('founded_year'),
  website: text('website'),
  wikipediaUrl: text('wikipedia_url'),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(1000),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('societies_country_idx').on(t.country),
}));
