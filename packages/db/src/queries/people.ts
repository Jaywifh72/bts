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

export async function getPersonFilmography(db: SeedDb = defaultDb, personId: number) {
  return db.execute<{
    production_slug: string;
    production_title: string;
    production_type: string;
    release_year: number | null;
    role_name: string;
    role_category: string;
    credit_order: number | null;
  }>(sql`
    SELECT
      p.slug AS production_slug,
      p.title AS production_title,
      p.type AS production_type,
      p.release_year,
      r.name AS role_name,
      r.category AS role_category,
      ca.credit_order
    FROM crew_assignments ca
    JOIN productions p ON p.id = ca.production_id
    JOIN roles r ON r.id = ca.role_id
    WHERE ca.person_id = ${personId}
    ORDER BY p.release_year DESC NULLS LAST, p.title ASC
  `);
}
