import {
  pgTable, pgEnum, bigserial, bigint, boolean, text, integer, timestamp,
  jsonb, primaryKey, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productionDataTierEnum } from './productions.ts';
import { productions } from './productions.ts';

/**
 * T2-3 — post-production houses (DI lab, color, sound mix, mastering).
 * No competitor models this; for working colorists / re-recording mixers,
 * Company 3 / FotoKem / Skywalker Sound are as recognizable as ILM is to
 * a VFX supervisor.
 */

export const postHouseKindEnum = pgEnum('post_house_kind', [
  'di_lab', 'color', 'sound_mix', 'sound_design', 'finishing', 'mastering', 'other',
]);

export const postHouseRoleEnum = pgEnum('post_house_role', [
  'di', 'color_grading', 'sound_mix', 'sound_design', 'finishing',
  'imax_remaster', 'mastering', 'other',
]);

export const postHouses = pgTable('post_houses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  kind: postHouseKindEnum('kind').notNull(),
  country: text('country'),
  city: text('city'),
  website: text('website'),
  foundedYear: integer('founded_year'),
  description: text('description'),
  // 0079 — format certifications + room counts.
  atmosCertified: boolean('atmos_certified').notNull().default(false),
  dolbyPremierCertified: boolean('dolby_premier_certified').notNull().default(false),
  imaxCertified: boolean('imax_certified').notNull().default(false),
  mixRoomCount: integer('mix_room_count'),
  hdrGrading: boolean('hdr_grading').notNull().default(false),
  specNotes: text('spec_notes'),
  // 0082 — VFX-house editorial parity.
  summary: text('summary'),
  tagline: text('tagline'),
  headquarters: text('headquarters'),
  parentCompany: text('parent_company'),
  employeeCount: integer('employee_count'),
  careersUrl: text('careers_url'),
  reelUrl: text('reel_url'),
  wikidataId: text('wikidata_id').unique(),
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
  kindIdx: index('post_houses_kind_idx').on(t.kind),
}));

export const productionPostHouses = pgTable('production_post_houses', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  postHouseId: bigint('post_house_id', { mode: 'number' })
    .notNull()
    .references(() => postHouses.id, { onDelete: 'restrict' }),
  role: postHouseRoleEnum('role').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.postHouseId, t.role] }),
  houseRoleIdx: index('production_post_houses_house_role_idx').on(t.postHouseId, t.role),
}));
