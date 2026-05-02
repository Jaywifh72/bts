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

/**
 * Cross-reference: every (manufacturer, series, item) used on a production
 * the given person crewed on, restricted to camera-department roles where
 * gear correlation is meaningful.
 *
 * Grain: one row per series+item pair. Ordered by production_count DESC then
 * scene_count DESC so a person's most-used gear surfaces at the top.
 */
export async function getEquipmentUsedByPerson(db: SeedDb = defaultDb, personSlug: string) {
  return db.execute<{
    manufacturer_slug: string;
    manufacturer_name: string;
    series_slug: string;
    series_name: string;
    series_category: string;
    item_slug: string | null;
    item_name: string | null;
    production_count: number;
    scene_count: number;
  }>(sql`
    SELECT
      em.slug AS manufacturer_slug, em.name AS manufacturer_name,
      es.slug AS series_slug, es.name AS series_name, es.category AS series_category,
      ei.slug AS item_slug, ei.name AS item_name,
      COUNT(DISTINCT sc.production_id)::int AS production_count,
      COUNT(DISTINCT sc.id)::int AS scene_count
    FROM crew_assignments ca
    JOIN people p ON p.id = ca.person_id
    JOIN scenes sc ON sc.production_id = ca.production_id
    JOIN equipment_usage eu ON eu.scene_id = sc.id
    JOIN equipment_series es ON es.id = eu.equipment_series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    JOIN roles r ON r.id = ca.role_id
    WHERE p.slug = ${personSlug}
      AND r.category = 'camera'
    GROUP BY em.slug, em.name, es.slug, es.name, es.category, ei.slug, ei.name
    ORDER BY production_count DESC, scene_count DESC, em.name, es.name
  `);
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
