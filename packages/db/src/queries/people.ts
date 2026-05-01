import { db as defaultDb } from '../db.ts';
import type { SeedDb } from '../seed/run.ts';
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
      p.birth_year,
      p.nationality,
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
    slug: string;
    display_name: string;
    birth_year: number | null;
    death_year: number | null;
    nationality: string | null;
    biography: string | null;
    imdb_id: string | null;
  }>(sql`
    SELECT slug, display_name, birth_year, death_year, nationality, biography, imdb_id
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
