import { bigserial, bigint, boolean, index, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { productions } from './productions.ts';

export const productionLocations = pgTable('production_locations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  region: text('region'),
  country: text('country'),
  latitude: numeric('latitude', { precision: 9, scale: 6 }),
  longitude: numeric('longitude', { precision: 9, scale: 6 }),
  isStudio: boolean('is_studio').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionIdx: index('production_locations_production_idx').on(t.productionId),
  // 0050 — natural-key unique so seeds can use a single-statement
  // INSERT … ON CONFLICT (production_id, name) DO UPDATE instead of the
  // two-roundtrip SELECT-then-UPDATE-or-INSERT workaround.
  naturalKey: unique('production_locations_natural_key').on(t.productionId, t.name),
}));
