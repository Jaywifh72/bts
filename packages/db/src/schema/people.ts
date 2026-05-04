import { pgTable, bigserial, integer, text, date, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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
  imdbId: text('imdb_id').unique(),
  wikidataId: text('wikidata_id').unique(),
  // TMDb-sourced (added migration 0012). The unique index is partial
  // (WHERE tmdb_person_id IS NOT NULL) so legacy rows with NULL coexist.
  tmdbPersonId: integer('tmdb_person_id'),
  profilePath: text('profile_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
