import {
  pgTable, bigserial, bigint, boolean, integer, numeric, text, timestamp, jsonb, index, unique, pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions } from './productions.ts';
import { scenes } from './scenes.ts';
import { vfxHouses } from './vfx.ts';
import { people } from './people.ts';

/**
 * Stunt section schema. Phase 1: companies + schools. Phase 2: people
 * extension columns (in people.ts). Phase 3: sequence-level detail —
 * the rigging breakdown layer that no other reference site catalogues
 * at this depth.
 */

export const stuntCompanies = pgTable('stunt_companies', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  foundedYear: integer('founded_year'),
  headquarters: text('headquarters'),
  country: text('country'),
  parentCompany: text('parent_company'),
  website: text('website'),
  reelUrl: text('reel_url'),
  careersUrl: text('careers_url'),
  founderNames: text('founder_names').array().notNull().default(sql`'{}'::text[]`),
  specialties: text('specialties').array().notNull().default(sql`'{}'::text[]`),
  memberCount: integer('member_count'),
  summary: text('summary'),
  tagline: text('tagline'),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  wikidataId: text('wikidata_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('stunt_companies_country_idx').on(t.country),
}));

export const stuntSchools = pgTable('stunt_schools', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  foundedYear: integer('founded_year'),
  headquarters: text('headquarters'),
  country: text('country'),
  website: text('website'),
  curriculumDisciplines: text('curriculum_disciplines').array().notNull().default(sql`'{}'::text[]`),
  summary: text('summary'),
  tagline: text('tagline'),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  wikidataId: text('wikidata_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  countryIdx: index('stunt_schools_country_idx').on(t.country),
}));

// ── Phase 3: stunt_sequences + stunt_sequence_credits ─────────────

export const stuntSequences = pgTable('stunt_sequences', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  sceneId: bigint('scene_id', { mode: 'number' })
    .references(() => scenes.id, { onDelete: 'set null' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  screenMinutes: numeric('screen_minutes', { precision: 4, scale: 2 }),
  disciplineTags: text('discipline_tags').array().notNull().default(sql`'{}'::text[]`),
  rigging: jsonb('rigging').notNull().default(sql`'{}'::jsonb`)
    .$type<{
      rigs?: Array<{ type: string; manufacturer?: string; capacity_lbs?: number; notes?: string }>;
      mounts?: string[];
      harness?: string;
      notes?: string;
    }>(),
  vehicle: jsonb('vehicle').$type<{
    picture_car?: { make: string; model: string; year?: number; modifications?: string[] };
    precision_driver_person_slug?: string;
    towing_rig?: string;
    prep_company?: string;
  } | null>(),
  vfxHandoffFrame: integer('vfx_handoff_frame'),
  vfxHandoffHouseId: bigint('vfx_handoff_house_id', { mode: 'number' })
    .references(() => vfxHouses.id, { onDelete: 'set null' }),
  safetyOfficerPersonId: bigint('safety_officer_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  safetyBulletinsFollowed: text('safety_bulletins_followed').array().notNull().default(sql`'{}'::text[]`),
  btsVideoUrl: text('bts_video_url'),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  prodSlugUnq: unique('stunt_sequences_production_id_slug_key').on(t.productionId, t.slug),
  productionIdx: index('stunt_sequences_production_idx').on(t.productionId, t.sortOrder),
  // 0050 — reverse-lookup paths.
  sceneIdx: index('stunt_sequences_scene_idx').on(t.sceneId).where(sql`${t.sceneId} IS NOT NULL`),
  vfxHandoffIdx: index('stunt_sequences_vfx_handoff_house_idx').on(t.vfxHandoffHouseId).where(sql`${t.vfxHandoffHouseId} IS NOT NULL`),
  safetyOfficerIdx: index('stunt_sequences_safety_officer_person_idx').on(t.safetyOfficerPersonId).where(sql`${t.safetyOfficerPersonId} IS NOT NULL`),
}));

// ── Phase 5: rigging glossary ─────────────────────────────────────

export const stuntRiggingCategoryEnum = pgEnum('stunt_rigging_category_enum', [
  'descender', 'wire', 'vehicle', 'fire', 'fall', 'fight', 'aerial', 'water',
]);

export const safetyBulletinCategoryEnum = pgEnum('safety_bulletin_category_enum', [
  'firearms', 'pyrotechnics', 'fire', 'animals', 'aerial',
  'vehicles', 'water', 'stunts_general', 'environmental', 'medical',
]);

export const safetyBulletins = pgTable('safety_bulletins', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  bulletinNumber: text('bulletin_number').notNull(),
  title: text('title').notNull(),
  category: safetyBulletinCategoryEnum('category').notNull(),
  governingBody: text('governing_body').notNull().default('SAG-AFTRA'),
  scope: text('scope').notNull(),
  summary: text('summary').notNull(),
  keyRequirements: jsonb('key_requirements').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ heading: string; detail: string }>>(),
  lastRevisionDate: text('last_revision_date'),
  canonicalPdfUrl: text('canonical_pdf_url'),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  relatedRiggingSlugs: text('related_rigging_slugs').array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  categoryIdx: index('safety_bulletins_category_idx').on(t.category, t.sortOrder),
  numberIdx: index('safety_bulletins_number_idx').on(t.bulletinNumber),
}));

export const stuntRiggingTechniques = pgTable('stunt_rigging_techniques', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: stuntRiggingCategoryEnum('category').notNull(),
  tagline: text('tagline').notNull(),
  mechanism: text('mechanism').notNull(),
  safetyConsiderations: text('safety_considerations'),
  sagAftraBulletin: text('sag_aftra_bulletin'),
  commonVariants: jsonb('common_variants').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ name: string; description: string }>>(),
  references: jsonb('references').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ title: string; url: string; publication?: string; kind?: string }>>(),
  photos: jsonb('photos').notNull().default(sql`'[]'::jsonb`)
    .$type<Array<{ url: string; caption: string; credit?: string }>>(),
  relatedDisciplineTags: text('related_discipline_tags').array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  categoryIdx: index('stunt_rigging_category_idx').on(t.category, t.sortOrder),
}));

export const stuntSequenceCredits = pgTable('stunt_sequence_credits', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sequenceId: bigint('sequence_id', { mode: 'number' })
    .notNull()
    .references(() => stuntSequences.id, { onDelete: 'cascade' }),
  // 0051 — restrict (matches crew_assignments). A person delete should
  // never silently erase the only credit row that documents who doubled
  // whom on which sequence.
  personId: bigint('person_id', { mode: 'number' })
    .notNull()
    .references(() => people.id, { onDelete: 'restrict' }),
  role: text('role').notNull(),
  doublingForPersonId: bigint('doubling_for_person_id', { mode: 'number' })
    .references(() => people.id, { onDelete: 'set null' }),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique('stunt_sequence_credits_sequence_id_person_id_role_key').on(t.sequenceId, t.personId, t.role),
  sequenceIdx: index('stunt_sequence_credits_sequence_idx').on(t.sequenceId, t.sortOrder),
  personIdx: index('stunt_sequence_credits_person_idx').on(t.personId),
  // 0050 — reverse-lookup ("who did this person double on a sequence credit").
  doublingForIdx: index('stunt_sequence_credits_doubling_for_person_idx').on(t.doublingForPersonId).where(sql`${t.doublingForPersonId} IS NOT NULL`),
}));

// ── Phase 8: company memberships + production-level doubling ───────

export const stuntCompanyMembers = pgTable('stunt_company_members', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => stuntCompanies.id, { onDelete: 'cascade' }),
  // 0051 — restrict.
  personId: bigint('person_id', { mode: 'number' })
    .notNull()
    .references(() => people.id, { onDelete: 'restrict' }),
  memberRole: text('member_role').notNull().default('member'),
  joinedYear: integer('joined_year'),
  leftYear: integer('left_year'),
  isPrincipal: boolean('is_principal').notNull().default(false),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique('stunt_company_members_company_id_person_id_key').on(t.companyId, t.personId),
  companyIdx: index('stunt_company_members_company_idx').on(t.companyId, t.isPrincipal, t.sortOrder),
  personIdx: index('stunt_company_members_person_idx').on(t.personId),
}));

export const stuntDoublingKindEnum = pgEnum('stunt_doubling_kind_enum', [
  'primary_double', 'utility_double', 'driver_double', 'fight_double',
  'aerial_double', 'water_double',
]);

export const stuntDoublingCredits = pgTable('stunt_doubling_credits', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  // 0051 — restrict for both person FKs. Editorial integrity: the
  // credit row is the only place the doubling relationship lives.
  doublerPersonId: bigint('doubler_person_id', { mode: 'number' })
    .notNull()
    .references(() => people.id, { onDelete: 'restrict' }),
  doubledPersonId: bigint('doubled_person_id', { mode: 'number' })
    .notNull()
    .references(() => people.id, { onDelete: 'restrict' }),
  kind: stuntDoublingKindEnum('kind').notNull().default('primary_double'),
  characterName: text('character_name'),
  notes: text('notes'),
  primarySequenceId: bigint('primary_sequence_id', { mode: 'number' })
    .references(() => stuntSequences.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique('stunt_doubling_credits_production_doubler_doubled_kind_key')
    .on(t.productionId, t.doublerPersonId, t.doubledPersonId, t.kind),
  productionIdx: index('stunt_doubling_credits_production_idx').on(t.productionId),
  doublerIdx: index('stunt_doubling_credits_doubler_idx').on(t.doublerPersonId),
  doubledIdx: index('stunt_doubling_credits_doubled_idx').on(t.doubledPersonId),
  // 0050 — reverse-lookup ("which doubling credits anchor on this stunt sequence").
  primarySequenceIdx: index('stunt_doubling_credits_primary_sequence_idx').on(t.primarySequenceId).where(sql`${t.primarySequenceId} IS NOT NULL`),
}));
