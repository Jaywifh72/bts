import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type SoundLibraryRow = {
  slug: string;
  name: string;
  publisher: string | null;
  country: string | null;
  website_url: string | null;
  summary: string | null;
  specialties: string[] | null;
  production_count: number;
};

export async function listSoundLibraries(
  db: SeedDb = defaultDb,
  opts: { withCreditsOnly?: boolean; limit?: number } = {},
): Promise<SoundLibraryRow[]> {
  const withCreditsOnly = opts.withCreditsOnly ?? false;
  const limit = opts.limit ?? 200;
  return db.execute<SoundLibraryRow>(sql`
    SELECT sl.slug, sl.name, sl.publisher, sl.country, sl.website_url,
           sl.summary, sl.specialties,
           COUNT(DISTINCT psl.production_id)::int AS production_count
    FROM sound_libraries sl
    LEFT JOIN production_sound_libraries psl ON psl.library_id = sl.id
    GROUP BY sl.id
    HAVING ${withCreditsOnly ? sql`COUNT(DISTINCT psl.production_id) > 0` : sql`TRUE`}
    ORDER BY production_count DESC, sl.name
    LIMIT ${limit}
  `);
}

export async function getSoundLibraryBySlug(db: SeedDb = defaultDb, slug: string) {
  const rows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    publisher: string | null;
    country: string | null;
    founded_year: number | null;
    website_url: string | null;
    summary: string | null;
    specialties: string[] | null;
    production_count: number;
  }>(sql`
    SELECT sl.id, sl.slug, sl.name, sl.publisher, sl.country, sl.founded_year,
           sl.website_url, sl.summary, sl.specialties,
           (SELECT COUNT(*)::int FROM production_sound_libraries WHERE library_id = sl.id) AS production_count
    FROM sound_libraries sl
    WHERE sl.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listProductionsForSoundLibrary(
  db: SeedDb = defaultDb,
  libraryId: number,
  limit: number = 200,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    credited_use: string | null;
    credited_in: string | null;
  }>(sql`
    SELECT p.slug, p.title, p.release_year, psl.credited_use, psl.credited_in
    FROM production_sound_libraries psl
    JOIN productions p ON p.id = psl.production_id
    WHERE psl.library_id = ${libraryId}
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}
