import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type PersonListRow = {
  slug: string;
  display_name: string;
  birth_year: number | null;
  nationality: string | null;
  primary_role: string | null;
  primary_role_category: string | null;
  credit_count: number;
  profile_path: string | null;
};

export type ListPeopleFilters = {
  /** Filter to people with at least one crew assignment in the given role category. */
  category?: string;
  /** ISO-3166 alpha-2 nationality filter. */
  nationality?: string;
  /** When true, hides people with zero crew_assignments. */
  withCreditsOnly?: boolean;
  sort?: 'name' | 'credits';
  limit?: number;
  offset?: number;
};

export async function listPeople(
  db: SeedDb = defaultDb,
  filters: ListPeopleFilters = {},
): Promise<PersonListRow[]> {
  const limit = filters.limit ?? 1000;
  const offset = filters.offset ?? 0;
  const sort = filters.sort ?? 'name';
  const orderClause =
    sort === 'credits'
      ? sql`credit_count DESC, p.display_name ASC`
      : sql`p.display_name ASC`;

  return db.execute<PersonListRow>(sql`
    SELECT
      p.slug,
      p.display_name,
      EXTRACT(YEAR FROM p.birth_date)::int AS birth_year,
      p.country AS nationality,
      pr.role_name AS primary_role,
      pr.role_category AS primary_role_category,
      p.profile_path,
      COALESCE(cc.cnt, 0)::int AS credit_count
    FROM people p
    LEFT JOIN (
      SELECT person_id, COUNT(*)::int AS cnt
      FROM crew_assignments
      GROUP BY person_id
    ) cc ON cc.person_id = p.id
    LEFT JOIN (
      SELECT
        ca.person_id,
        r.name AS role_name,
        r.category AS role_category,
        ROW_NUMBER() OVER (
          PARTITION BY ca.person_id
          ORDER BY COUNT(*) DESC, r.name ASC
        ) AS rn
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      GROUP BY ca.person_id, r.name, r.category
    ) pr ON pr.person_id = p.id AND pr.rn = 1
    WHERE
      ${filters.withCreditsOnly ? sql`COALESCE(cc.cnt, 0) > 0` : sql`TRUE`}
      AND ${filters.category ? sql`pr.role_category = ${filters.category}::role_category_enum` : sql`TRUE`}
      AND ${filters.nationality ? sql`p.country = ${filters.nationality}` : sql`TRUE`}
    ORDER BY ${orderClause}
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countPeople(
  db: SeedDb = defaultDb,
  filters: ListPeopleFilters = {},
): Promise<number> {
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM people p
    LEFT JOIN (
      SELECT person_id, COUNT(*)::int AS cnt FROM crew_assignments GROUP BY person_id
    ) cc ON cc.person_id = p.id
    LEFT JOIN (
      SELECT ca.person_id, r.category AS role_category,
        ROW_NUMBER() OVER (PARTITION BY ca.person_id ORDER BY COUNT(*) DESC, r.name ASC) AS rn
      FROM crew_assignments ca JOIN roles r ON r.id = ca.role_id
      GROUP BY ca.person_id, r.name, r.category
    ) pr ON pr.person_id = p.id AND pr.rn = 1
    WHERE
      ${filters.withCreditsOnly ? sql`COALESCE(cc.cnt, 0) > 0` : sql`TRUE`}
      AND ${filters.category ? sql`pr.role_category = ${filters.category}::role_category_enum` : sql`TRUE`}
      AND ${filters.nationality ? sql`p.country = ${filters.nationality}` : sql`TRUE`}
  `);
  return Number(row?.count ?? 0);
}

/**
 * Distinct role categories among people with at least one credit. For the
 * /crew filter dropdown.
 */
export async function listCrewCategoriesInUse(db: SeedDb = defaultDb) {
  return db.execute<{ category: string; count: number }>(sql`
    SELECT pr.category, COUNT(DISTINCT pr.person_id)::int AS count
    FROM (
      SELECT
        ca.person_id,
        r.category,
        ROW_NUMBER() OVER (PARTITION BY ca.person_id ORDER BY COUNT(*) DESC) AS rn
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      GROUP BY ca.person_id, r.category
    ) pr
    WHERE pr.rn = 1
    GROUP BY pr.category
    ORDER BY count DESC
  `);
}

export async function getPersonBySlug(db: SeedDb = defaultDb, slug: string) {
  const [person] = await db.execute<{
    id: number;
    slug: string;
    display_name: string;
    birth_year: number | null;
    birth_date: string | null;
    death_year: number | null;
    death_date: string | null;
    nationality: string | null;
    biography: string | null;
    imdb_id: string | null;
    wikidata_id: string | null;
    profile_path: string | null;
    tmdb_person_id: number | null;
    aliases: string[];
  }>(sql`
    SELECT id, slug, display_name,
           EXTRACT(YEAR FROM birth_date)::int AS birth_year,
           birth_date::text,
           EXTRACT(YEAR FROM death_date)::int AS death_year,
           death_date::text,
           country AS nationality,
           bio AS biography,
           imdb_id,
           wikidata_id,
           profile_path,
           tmdb_person_id,
           aliases
    FROM people
    WHERE slug = ${slug}
  `);

  return person ?? null;
}

/**
 * Cross-reference: every (manufacturer, series, item) used on a production
 * the given person crewed on, restricted to camera-department roles where
 * gear correlation is meaningful.
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
    poster_path: string | null;
  }>(sql`
    SELECT p.slug AS production_slug, p.title AS production_title,
           p.release_year, p.type AS production_type,
           r.name AS role_name, r.category AS role_category,
           ca.credit_name_override,
           pf.aspect_ratio AS primary_aspect_ratio,
           pf.acquisition_format AS primary_acquisition_format,
           p.poster_path
    FROM crew_assignments ca
    JOIN people ppl ON ppl.id = ca.person_id
    JOIN productions p ON p.id = ca.production_id
    JOIN roles r ON r.id = ca.role_id
    LEFT JOIN production_formats pf ON pf.production_id = p.id AND pf.is_primary = true
    WHERE ppl.slug = ${slug}
    ORDER BY p.release_year DESC NULLS LAST, p.title ASC
  `);
}

/**
 * Frequent collaborators: other people who have crewed on the same
 * productions as this person, ranked by number of shared productions.
 *
 * Excludes the source person and capped to the top N.
 */
export async function getCollaboratorsForPerson(
  db: SeedDb = defaultDb,
  personSlug: string,
  limit = 12,
) {
  return db.execute<{
    slug: string;
    display_name: string;
    primary_role: string | null;
    profile_path: string | null;
    shared_productions: number;
  }>(sql`
    WITH source_productions AS (
      SELECT DISTINCT ca.production_id
      FROM crew_assignments ca
      JOIN people p ON p.id = ca.person_id
      WHERE p.slug = ${personSlug}
    ),
    other_crew AS (
      SELECT
        ca.person_id,
        COUNT(DISTINCT ca.production_id)::int AS shared
      FROM crew_assignments ca
      JOIN source_productions sp ON sp.production_id = ca.production_id
      JOIN people p ON p.id = ca.person_id
      WHERE p.slug != ${personSlug}
      GROUP BY ca.person_id
    )
    SELECT
      p.slug,
      p.display_name,
      pr.role_name AS primary_role,
      p.profile_path,
      oc.shared AS shared_productions
    FROM other_crew oc
    JOIN people p ON p.id = oc.person_id
    LEFT JOIN (
      SELECT
        ca.person_id,
        r.name AS role_name,
        ROW_NUMBER() OVER (PARTITION BY ca.person_id ORDER BY COUNT(*) DESC) AS rn
      FROM crew_assignments ca JOIN roles r ON r.id = ca.role_id
      GROUP BY ca.person_id, r.name
    ) pr ON pr.person_id = p.id AND pr.rn = 1
    ORDER BY oc.shared DESC, p.display_name ASC
    LIMIT ${limit}
  `);
}
