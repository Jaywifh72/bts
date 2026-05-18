import {
  pgTable, bigserial, bigint, integer, text, timestamp, jsonb,
  primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions, productionDataTierEnum } from './productions.ts';

/**
 * Migration 0088 — Phase 2 facility-shape houses:
 *   costume_construction_houses
 *   music_supervision_agencies
 *   adr_studios
 */

export const costumeConstructionHouses = pgTable('costume_construction_houses', {
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
  founders: text('founders').array(),
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
  countryIdx: index('costume_construction_houses_country_idx').on(t.country),
}));

export const productionCostumeConstructionHouses = pgTable('production_costume_construction_houses', {
  productionId: bigint('production_id', { mode: 'number' }).notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  houseId: bigint('house_id', { mode: 'number' }).notNull()
    .references(() => costumeConstructionHouses.id, { onDelete: 'restrict' }),
  creditedUse: text('credited_use'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.houseId] }),
  houseIdx: index('production_costume_construction_houses_house_idx').on(t.houseId),
}));

export const musicSupervisionAgencies = pgTable('music_supervision_agencies', {
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
  founders: text('founders').array(),
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
  countryIdx: index('music_supervision_agencies_country_idx').on(t.country),
}));

export const productionMusicSupervisionAgencies = pgTable('production_music_supervision_agencies', {
  productionId: bigint('production_id', { mode: 'number' }).notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  agencyId: bigint('agency_id', { mode: 'number' }).notNull()
    .references(() => musicSupervisionAgencies.id, { onDelete: 'restrict' }),
  creditedUse: text('credited_use'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.agencyId] }),
  agencyIdx: index('production_music_supervision_agencies_agency_idx').on(t.agencyId),
}));

export const adrStudios = pgTable('adr_studios', {
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
  founders: text('founders').array(),
  roomCount: integer('room_count'),
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
  countryIdx: index('adr_studios_country_idx').on(t.country),
}));

export const productionAdrStudios = pgTable('production_adr_studios', {
  productionId: bigint('production_id', { mode: 'number' }).notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  studioId: bigint('studio_id', { mode: 'number' }).notNull()
    .references(() => adrStudios.id, { onDelete: 'restrict' }),
  creditedUse: text('credited_use'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.studioId] }),
  studioIdx: index('production_adr_studios_studio_idx').on(t.studioId),
}));
