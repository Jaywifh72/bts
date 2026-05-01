import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export async function listPeople(db: SeedDb = defaultDb) {
  return db.execute<{
    slug: string;
    display_name: string;
    birth_year: number | null;
    nationality: string | null;
    primary_role: string | null;
  }>(sql`
    SELECT
      p.slug,
      p.display_name,
      EXTRACT(YEAR FROM p.birth_date)::int AS birth_year,
      p.country AS nationality,
      pr.role_name AS primary_role
    FROM people p
    LEFT JOIN (
      SELECT
        ca.person_id,
        r.name AS role_name,
        COUNT(*) AS role_count,
        ROW_NUMBER() OVER (
          PARTITION BY ca.person_id
          ORDER BY COUNT(*) DESC, r.name ASC
        ) AS rn
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      GROUP BY ca.person_id, r.name
    ) pr ON pr.person_id = p.id AND pr.rn = 1
    ORDER BY p.display_name ASC
  `);
}

export async function getPersonBySlug(db: SeedDb = defaultDb, slug: string) {
  const [person] = await db.execute<{
    id: number;
    slug: string;
    display_name: string;
    birth_year: number | null;
    death_year: number | null;
    nationality: string | null;
    biography: string | null;
    imdb_id: string | null;
  }>(sql`
    SELECT id, slug, display_name,
           EXTRACT(YEAR FROM birth_date)::int AS birth_year,
           EXTRACT(YEAR FROM death_date)::int AS death_year,
           country AS nationality,
           bio AS biography,
           imdb_id
    FROM people
    WHERE slug = ${slug}
  `);

  return person ?? null;
}

export async function getPersonFilmography(db: SeedDb = defaultDb, slug: string) {
  return db.execute<{
    production_slug: string;
    production_title: string;
    release_year: number | null;
    production_type: string;
    role_name: string;
    role_category: string;
    credit_name_override: string | null;
    primary_aspect_ratio: string | null;
    primary_acquisition_format: string | null;
  }>(sql`
    SELECT p.slug AS production_slug, p.title AS production_title,
           p.release_year, p.type AS production_type,
           r.name AS role_name, r.category AS role_category,
           ca.credit_name_override,
           pf.aspect_ratio AS primary_aspect_ratio,
           pf.acquisition_format AS primary_acquisition_format
    FROM crew_assignments ca
    JOIN people ppl ON ppl.id = ca.person_id
    JOIN productions p ON p.id = ca.production_id
    JOIN roles r ON r.id = ca.role_id
    LEFT JOIN production_formats pf ON pf.production_id = p.id AND pf.is_primary = true
    WHERE ppl.slug = ${slug}
    ORDER BY p.release_year DESC NULLS LAST, p.title ASC
  `);
}
