import { pgTable, bigserial, integer, text, date, timestamp, vector, numeric, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productionDataTierEnum } from './productions.ts';

export const people = pgTable('people', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  givenName: text('given_name'),
  familyName: text('family_name'),
  aliases: text('aliases').array().notNull().default(sql`ARRAY[]::text[]`),
  birthDate: date('birth_date'),
  deathDate: date('death_date'),
  country: text('country'),    // ISO-3166 alpha-2
  bio: text('bio'),
  memberSocieties: text('member_societies').array().notNull().default(sql`ARRAY[]::text[]`),
  // E-25: alumni-of strings populated from Wikidata P69 (educated_at).
  filmSchools: text('film_schools').array().notNull().default(sql`ARRAY[]::text[]`),
  imdbId: text('imdb_id').unique(),
  wikidataId: text('wikidata_id').unique(),
  // TMDb-sourced (added migration 0012). The unique index is partial
  // (WHERE tmdb_person_id IS NOT NULL) so legacy rows with NULL coexist.
  tmdbPersonId: integer('tmdb_person_id'),
  profilePath: text('profile_path'),
  // E-26: 1536-dim embedding from text-embedding-3-small over the
  // person's display_name + bio + primary role.
  embedding: vector('embedding', { dimensions: 1536 }),
  // 0053 — embedding model versioning (see productions schema).
  embeddingModel: text('embedding_model'),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),
  // 0042 — stunt-section phase 2 fields.
  stuntDisciplines: text('stunt_disciplines').array().notNull().default(sql`ARRAY[]::text[]`),
  heightCm: integer('height_cm'),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  performerUnion: text('performer_union'),
  doublesFor: text('doubles_for').array().notNull().default(sql`ARRAY[]::text[]`),
  trainingSchoolSlugs: text('training_school_slugs').array().notNull().default(sql`ARRAY[]::text[]`),
  stuntCompanySlug: text('stunt_company_slug'),
  // 0044 — phase 4 lineage: directed mentor → protégé edges stored
  // as mentor slugs on the protégé row. GIN-indexed for fast inverse
  // queries ("who did this person mentor?").
  mentorPersonSlugs: text('mentor_person_slugs').array().notNull().default(sql`ARRAY[]::text[]`),
  // Migration 0060 — entity-level provenance (mirrors productions).
  // The EntityProvenanceFooter component renders these fields on
  // /crew/[slug]; null curatedBy hides the byline cleanly.
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  stuntDisciplinesGin: index('people_stunt_disciplines_gin_idx').using('gin', t.stuntDisciplines),
  stuntCompanyIdx: index('people_stunt_company_idx').on(t.stuntCompanySlug)
    .where(sql`${t.stuntCompanySlug} IS NOT NULL`),
  dataTierIdx: index('people_data_tier_idx').on(t.dataTier),
}));
