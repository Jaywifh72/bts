import {
  pgTable, bigserial, bigint, text, integer, timestamp, date, boolean, numeric,
  primaryKey, unique, index, type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  productionTypeEnum,
  studioKindEnum,
  productionStudioRoleEnum,
} from './enums.ts';

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
});

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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  typeIdx: index('productions_type_idx').on(t.type),
  releaseYearIdx: index('productions_release_year_idx').on(t.releaseYear),
  parentIdx: index('productions_parent_idx').on(t.parentId),
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
