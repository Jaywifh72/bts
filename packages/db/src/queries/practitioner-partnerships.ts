import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type PartnershipRow = {
  slug: string;
  primary_slug: string;
  primary_name: string;
  partner_slug: string;
  partner_name: string;
  partner_role: string;
  arc_summary: string | null;
  signature_films: string[];
  film_count: number;
  year_first: number | null;
  year_last: number | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
};

/**
 * Films-together count derived live from crew_assignments — counts
 * distinct productions where BOTH people appear in the crew list,
 * regardless of role. Year range comes from the matching productions.
 */
const COUNT_AND_YEARS_CTE = sql`
  WITH joint_films AS (
    SELECT DISTINCT ca.production_id, p.release_year
    FROM crew_assignments ca
    JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
    JOIN productions p ON p.id = ca.production_id
    WHERE ca.person_id = pp.primary_person_id
      AND ca2.person_id = pp.partner_person_id
  )
`;

export async function listPartnerships(
  db: SeedDb = defaultDb,
  opts: { limit?: number } = {},
): Promise<PartnershipRow[]> {
  const limit = opts.limit ?? 200;
  return db.execute<PartnershipRow>(sql`
    SELECT
      pp.slug,
      a.slug AS primary_slug, a.display_name AS primary_name,
      b.slug AS partner_slug, b.display_name AS partner_name,
      pp.partner_role,
      pp.arc_summary,
      pp.signature_films,
      (SELECT COUNT(*)::int FROM (
        SELECT DISTINCT ca.production_id
        FROM crew_assignments ca
        JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
        WHERE ca.person_id = pp.primary_person_id
          AND ca2.person_id = pp.partner_person_id
      ) sub) AS film_count,
      (SELECT MIN(p.release_year)::int FROM productions p
        WHERE p.id IN (
          SELECT DISTINCT ca.production_id
          FROM crew_assignments ca
          JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
          WHERE ca.person_id = pp.primary_person_id
            AND ca2.person_id = pp.partner_person_id
        )) AS year_first,
      (SELECT MAX(p.release_year)::int FROM productions p
        WHERE p.id IN (
          SELECT DISTINCT ca.production_id
          FROM crew_assignments ca
          JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
          WHERE ca.person_id = pp.primary_person_id
            AND ca2.person_id = pp.partner_person_id
        )) AS year_last,
      COALESCE(pp."references", '[]'::jsonb) AS "references"
    FROM practitioner_partnerships pp
    JOIN people a ON a.id = pp.primary_person_id
    JOIN people b ON b.id = pp.partner_person_id
    ORDER BY film_count DESC NULLS LAST, a.display_name, b.display_name
    LIMIT ${limit}
  `);
}

/**
 * All partnerships involving a given person (either as primary or partner).
 * Renders on /crew/[slug] inside <PartnershipsList />.
 */
export async function listPartnershipsForPerson(
  db: SeedDb = defaultDb,
  personSlug: string,
): Promise<PartnershipRow[]> {
  return db.execute<PartnershipRow>(sql`
    SELECT
      pp.slug,
      a.slug AS primary_slug, a.display_name AS primary_name,
      b.slug AS partner_slug, b.display_name AS partner_name,
      pp.partner_role,
      pp.arc_summary,
      pp.signature_films,
      (SELECT COUNT(*)::int FROM (
        SELECT DISTINCT ca.production_id
        FROM crew_assignments ca
        JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
        WHERE ca.person_id = pp.primary_person_id
          AND ca2.person_id = pp.partner_person_id
      ) sub) AS film_count,
      (SELECT MIN(p.release_year)::int FROM productions p
        WHERE p.id IN (
          SELECT DISTINCT ca.production_id
          FROM crew_assignments ca
          JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
          WHERE ca.person_id = pp.primary_person_id
            AND ca2.person_id = pp.partner_person_id
        )) AS year_first,
      (SELECT MAX(p.release_year)::int FROM productions p
        WHERE p.id IN (
          SELECT DISTINCT ca.production_id
          FROM crew_assignments ca
          JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
          WHERE ca.person_id = pp.primary_person_id
            AND ca2.person_id = pp.partner_person_id
        )) AS year_last,
      COALESCE(pp."references", '[]'::jsonb) AS "references"
    FROM practitioner_partnerships pp
    JOIN people a ON a.id = pp.primary_person_id
    JOIN people b ON b.id = pp.partner_person_id
    WHERE a.slug = ${personSlug} OR b.slug = ${personSlug}
    ORDER BY film_count DESC NULLS LAST
  `);
}

export async function getPartnershipBySlug(
  db: SeedDb = defaultDb,
  slug: string,
): Promise<PartnershipRow | null> {
  const rows = await db.execute<PartnershipRow>(sql`
    SELECT
      pp.slug,
      a.slug AS primary_slug, a.display_name AS primary_name,
      b.slug AS partner_slug, b.display_name AS partner_name,
      pp.partner_role,
      pp.arc_summary,
      pp.signature_films,
      (SELECT COUNT(*)::int FROM (
        SELECT DISTINCT ca.production_id
        FROM crew_assignments ca
        JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
        WHERE ca.person_id = pp.primary_person_id
          AND ca2.person_id = pp.partner_person_id
      ) sub) AS film_count,
      (SELECT MIN(p.release_year)::int FROM productions p
        WHERE p.id IN (
          SELECT DISTINCT ca.production_id
          FROM crew_assignments ca
          JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
          WHERE ca.person_id = pp.primary_person_id
            AND ca2.person_id = pp.partner_person_id
        )) AS year_first,
      (SELECT MAX(p.release_year)::int FROM productions p
        WHERE p.id IN (
          SELECT DISTINCT ca.production_id
          FROM crew_assignments ca
          JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
          WHERE ca.person_id = pp.primary_person_id
            AND ca2.person_id = pp.partner_person_id
        )) AS year_last,
      COALESCE(pp."references", '[]'::jsonb) AS "references"
    FROM practitioner_partnerships pp
    JOIN people a ON a.id = pp.primary_person_id
    JOIN people b ON b.id = pp.partner_person_id
    WHERE pp.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/**
 * Films both members of the partnership worked on, derived from
 * crew_assignments.
 */
export async function listJointFilmography(
  db: SeedDb = defaultDb,
  partnershipSlug: string,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    primary_role: string | null;
    partner_role: string | null;
  }>(sql`
    SELECT DISTINCT p.slug, p.title, p.release_year,
           (SELECT r.name FROM roles r
              JOIN crew_assignments ca ON ca.role_id = r.id
             WHERE ca.production_id = p.id AND ca.person_id = pp.primary_person_id
             LIMIT 1) AS primary_role,
           (SELECT r.name FROM roles r
              JOIN crew_assignments ca ON ca.role_id = r.id
             WHERE ca.production_id = p.id AND ca.person_id = pp.partner_person_id
             LIMIT 1) AS partner_role
    FROM practitioner_partnerships pp
    JOIN crew_assignments ca ON ca.person_id = pp.primary_person_id
    JOIN crew_assignments ca2 ON ca2.production_id = ca.production_id
                              AND ca2.person_id = pp.partner_person_id
    JOIN productions p ON p.id = ca.production_id
    WHERE pp.slug = ${partnershipSlug}
    ORDER BY p.release_year DESC NULLS LAST, p.title
  `);
}
