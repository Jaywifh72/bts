import {
  pgTable, bigserial, bigint, integer, text, timestamp, jsonb,
  primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';

/**
 * Migration 0083 — camera/lens/lighting/grip rental houses.
 * Panavision, Keslow Camera, Otto Nemenz, Fletcher Camera, Stray Angel,
 * ARRI Rental, etc. The companies DPs phone during prep — the rental
 * dimension distinct from gear manufacture.
 */
export const rentalHouses = pgTable('rental_houses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country'),
  city: text('city'),
  headquarters: text('headquarters'),
  foundedYear: integer('founded_year'),
  parentCompany: text('parent_company'),
  employeeCount: integer('employee_count'),
  website: text('website'),
  careersUrl: text('careers_url'),
  reelUrl: text('reel_url'),
  wikidataId: text('wikidata_id').unique(),
  summary: text('summary'),
  tagline: text('tagline'),
  specialties: text('specialties').array(),
  stocksBrands: text('stocks_brands').array(),
  branchCount: integer('branch_count'),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('rental_houses_country_idx').on(t.country),
}));

export const productionRentalHouses = pgTable('production_rental_houses', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  rentalHouseId: bigint('rental_house_id', { mode: 'number' })
    .notNull()
    .references(() => rentalHouses.id, { onDelete: 'restrict' }),
  kitType: text('kit_type'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.rentalHouseId, t.kitType] }),
  rentalIdx: index('production_rental_houses_rental_idx').on(t.rentalHouseId),
}));
