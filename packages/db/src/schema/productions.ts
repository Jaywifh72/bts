import {
  pgTable, pgEnum, bigserial, bigint, text, integer, timestamp, date, boolean, numeric,
  primaryKey, unique, index, jsonb, vector, type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  productionTypeEnum,
  studioKindEnum,
  productionStudioRoleEnum,
} from './enums.ts';

export const productionDataTierEnum = pgEnum('production_data_tier', ['curated', 'imported']);

/**
 * TMDb release-date types — matches the integer codes returned by TMDb's
 * /release_dates endpoint. Stored as a number in the JSONB column; UI
 * components map this to a human label.
 */
export type ReleaseDateType = 1 | 2 | 3 | 4 | 5 | 6;

export type ProductionReleaseDate = {
  /** ISO-3166-1 alpha-2 country code, e.g. 'US', 'GB', 'JP'. */
  country: string;
  /** 'YYYY-MM-DD' (TMDb returns ISO-8601 timestamps; we store the date portion only). */
  date: string;
  type: ReleaseDateType;
  certification?: string;
};

export const studios = pgTable('studios', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country'),
  kind: studioKindEnum('kind').notNull(),
  parentStudioId: bigint('parent_studio_id', { mode: 'number' })
    .references((): AnyPgColumn => studios.id, { onDelete: 'set null' }),
  wikidataId: text('wikidata_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // 0050 — reverse-lookup ("list child studios of a parent group").
  parentIdx: index('studios_parent_studio_idx').on(t.parentStudioId)
    .where(sql`${t.parentStudioId} IS NOT NULL`),
}));

export const productions = pgTable('productions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  type: productionTypeEnum('type').notNull(),
  parentId: bigint('parent_id', { mode: 'number' })
    .references((): AnyPgColumn => productions.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  originalTitle: text('original_title'),
  releaseYear: integer('release_year'),
  principalPhotographyStart: date('principal_photography_start'),
  principalPhotographyEnd: date('principal_photography_end'),
  runtimeMinutes: integer('runtime_minutes'),
  synopsis: text('synopsis'),
  tmdbId: integer('tmdb_id').unique(),
  imdbId: text('imdb_id').unique(),
  wikidataId: text('wikidata_id').unique(),
  // TMDb-sourced metadata (added migration 0012)
  genres: text('genres').array(),
  originalLanguage: text('original_language'),
  productionCountry: text('production_country'),
  popularity: numeric('popularity', { precision: 8, scale: 2 }),
  voteAverage: numeric('vote_average', { precision: 3, scale: 1 }),
  voteCount: integer('vote_count'),
  posterPath: text('poster_path'),
  backdropPath: text('backdrop_path'),
  tmdbCollectionId: integer('tmdb_collection_id'),
  tmdbCollectionName: text('tmdb_collection_name'),
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  // T1-3: bumped only by human review; bulk TMDb enrich does NOT touch this.
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  // 0054 — editorial bylines for E-E-A-T. Null on imported rows; set to
  // a name or pen-name on curated rows. `curated_by_url` optional link to
  // contributor profile / society listing.
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  // T2-4: TMDb release dates by region. Shape per release_dates.ts.
  releaseDates: jsonb('release_dates').$type<ProductionReleaseDate[]>(),
  // E-26: 1536-dim embedding from text-embedding-3-small over the
  // production's title + synopsis + DP/director credits. Backed by an
  // HNSW index for sub-100ms cosine-similarity retrieval.
  embedding: vector('embedding', { dimensions: 1536 }),
  // 0053 — embedding model versioning. `embedding_model` records WHICH
  // model produced the vector so re-embed sweeps can target stale rows
  // after a model rotation.
  embeddingModel: text('embedding_model'),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  typeIdx: index('productions_type_idx').on(t.type),
  releaseYearIdx: index('productions_release_year_idx').on(t.releaseYear),
  parentIdx: index('productions_parent_idx').on(t.parentId),
  dataTierIdx: index('productions_data_tier_idx').on(t.dataTier),
  popularityIdx: index('productions_popularity_idx').on(t.popularity),
  voteAverageIdx: index('productions_vote_average_idx').on(t.voteAverage),
}));

export const productionFormats = pgTable('production_formats', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  label: text('label'),
  aspectRatio: text('aspect_ratio').notNull(),
  acquisitionFormat: text('acquisition_format').notNull(),
  colorSpace: text('color_space'),
  frameRate: numeric('frame_rate', { precision: 5, scale: 2 }),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionIdx: index('production_formats_production_idx').on(t.productionId),
  primaryPerProductionIdx: index('production_formats_primary_idx')
    .on(t.productionId)
    .where(sql`${t.isPrimary} = true`),
  // 0050 — natural-key unique so ON CONFLICT DO NOTHING in seeds is genuinely
  // idempotent. NULLS NOT DISTINCT lets colorSpace/frameRate vary while still
  // collapsing duplicates on (production_id, aspect_ratio, acquisition_format).
  naturalKey: unique('production_formats_natural_key')
    .on(t.productionId, t.aspectRatio, t.acquisitionFormat),
}));

export const productionStudios = pgTable('production_studios', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  studioId: bigint('studio_id', { mode: 'number' })
    .notNull()
    .references(() => studios.id, { onDelete: 'restrict' }),
  role: productionStudioRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.studioId, t.role] }),
  studioRoleIdx: index('production_studios_studio_role_idx').on(t.studioId, t.role),
}));
