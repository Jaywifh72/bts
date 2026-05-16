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
  /** Filter to people whose primary role is in the given role category. */
  category?: string;
  /** Filter to people whose primary role is in any of the given categories
   *  (multi-category disciplines like /sound = post + sound). */
  categories?: string[];
  /** Filter to people who have at least one credit in any of the given role slugs.
   *  More precise than `category` for sub-disciplines like /sound = sound-designer
   *  + foley-artist + re-recording-mixer + ... where the roles span two categories. */
  roleSlugs?: string[];
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
      AND ${filters.categories && filters.categories.length > 0
        ? sql`pr.role_category = ANY(${`{${filters.categories.join(',')}}`}::role_category_enum[])`
        : sql`TRUE`}
      AND ${filters.roleSlugs && filters.roleSlugs.length > 0
        ? sql`EXISTS (
            SELECT 1 FROM crew_assignments ca
            JOIN roles r ON r.id = ca.role_id
            WHERE ca.person_id = p.id
              AND r.slug = ANY(${`{${filters.roleSlugs.join(',')}}`}::text[])
          )`
        : sql`TRUE`}
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
    film_schools: string[];
    member_societies: string[];
    // 0042 — phase-2 stunt fields.
    stunt_disciplines: string[];
    height_cm: number | null;
    weight_kg: string | null;            // numeric → text round-trip
    performer_union: string | null;
    doubles_for: string[];
    training_school_slugs: string[];
    stunt_company_slug: string | null;
    // 0044 — phase-4 lineage edges.
    mentor_person_slugs: string[];
    // 0060 — entity-level provenance.
    data_tier: 'curated' | 'imported';
    curated_by: string | null;
    curated_by_url: string | null;
    last_curated_review: string | null;
    last_verified_at: string | null;
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
           aliases,
           film_schools,
           member_societies,
           stunt_disciplines,
           height_cm,
           weight_kg::text,
           performer_union,
           doubles_for,
           training_school_slugs,
           stunt_company_slug,
           mentor_person_slugs,
           data_tier,
           curated_by,
           curated_by_url,
           last_curated_review::text,
           last_verified_at::text
    FROM people
    WHERE slug = ${slug}
  `);

  return person ?? null;
}

export type LineageNode = {
  slug: string;
  display_name: string;
  profile_path: string | null;
  primary_role: string | null;
  stunt_disciplines: string[];
};

/**
 * Resolves the mentor → protégé graph for a single person:
 *   - mentors: people listed in this person's `mentor_person_slugs`
 *   - protégés: people whose `mentor_person_slugs` array contains
 *     this person's slug (inverse lookup, GIN-indexed)
 *
 * Both directions are hydrated to `LineageNode` so the crew page
 * can render names + photos + roles without a second roundtrip.
 */
export async function getStuntLineage(
  db: SeedDb = defaultDb,
  personSlug: string,
  mentorSlugs: readonly string[],
): Promise<{ mentors: LineageNode[]; protégés: LineageNode[] }> {
  const lineageNodeSql = sql`
    SELECT
      p.slug, p.display_name, p.profile_path, p.stunt_disciplines,
      (
        SELECT r.name
        FROM crew_assignments ca
        JOIN roles r ON r.id = ca.role_id
        WHERE ca.person_id = p.id AND r.category = 'stunts'
        ORDER BY r.slug
        LIMIT 1
      ) AS primary_role
    FROM people p
  `;

  const [mentors, protégés] = await Promise.all([
    mentorSlugs.length > 0
      ? db.execute<LineageNode>(sql`
          ${lineageNodeSql}
          WHERE p.slug IN ${sql`(${sql.join(mentorSlugs.map((s) => sql`${s}`), sql`, `)})`}
          ORDER BY p.display_name
        `)
      : Promise.resolve([]),
    db.execute<LineageNode>(sql`
      ${lineageNodeSql}
      WHERE p.mentor_person_slugs @> ARRAY[${personSlug}]::text[]
      ORDER BY p.display_name
    `),
  ]);

  return { mentors: [...mentors], protégés: [...protégés] };
}

export type LineageEdge = {
  mentor_slug: string;
  mentor_display_name: string;
  mentor_profile_path: string | null;
  protégé_slug: string;
  protégé_display_name: string;
  protégé_profile_path: string | null;
  protégé_primary_role: string | null;
};

/**
 * Returns every mentor → protégé edge in the dataset, hydrated, for
 * the /stunts/lineage page. Sorted so root mentors (those without
 * mentors of their own) come first within each cluster.
 */
export async function listStuntLineageEdges(db: SeedDb = defaultDb): Promise<LineageEdge[]> {
  return db.execute<LineageEdge>(sql`
    SELECT
      m.slug AS mentor_slug,
      m.display_name AS mentor_display_name,
      m.profile_path AS mentor_profile_path,
      p.slug AS "protégé_slug",
      p.display_name AS "protégé_display_name",
      p.profile_path AS "protégé_profile_path",
      (
        SELECT r.name
        FROM crew_assignments ca
        JOIN roles r ON r.id = ca.role_id
        WHERE ca.person_id = p.id AND r.category = 'stunts'
        ORDER BY r.slug
        LIMIT 1
      ) AS "protégé_primary_role"
    FROM people p,
         unnest(p.mentor_person_slugs) AS mentor_slug
    JOIN people m ON m.slug = mentor_slug
    WHERE COALESCE(array_length(p.mentor_person_slugs, 1), 0) > 0
    ORDER BY m.display_name, p.display_name
  `);
}

/**
 * Cross-reference: hydrate slug arrays on a person row into rich
 * objects so the page can render names + links without a second query.
 * Used by the stunt section + the crew page's stunt block.
 */
export async function getStuntContextForPerson(
  db: SeedDb = defaultDb,
  doublesFor: readonly string[],
  trainingSchoolSlugs: readonly string[],
  stuntCompanySlug: string | null,
) {
  const [doubles, schools, company] = await Promise.all([
    doublesFor.length > 0
      ? db.execute<{ slug: string; display_name: string }>(sql`
          SELECT slug, display_name FROM people
          WHERE slug IN ${sql`(${sql.join(doublesFor.map((s) => sql`${s}`), sql`, `)})`}
        `)
      : Promise.resolve([]),
    trainingSchoolSlugs.length > 0
      ? db.execute<{ slug: string; name: string }>(sql`
          SELECT slug, name FROM stunt_schools
          WHERE slug IN ${sql`(${sql.join(trainingSchoolSlugs.map((s) => sql`${s}`), sql`, `)})`}
        `)
      : Promise.resolve([]),
    stuntCompanySlug
      ? db.execute<{ slug: string; name: string }>(sql`
          SELECT slug, name FROM stunt_companies WHERE slug = ${stuntCompanySlug}
        `).then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);
  return { doubles: [...doubles], schools: [...schools], company };
}

export type StuntPersonRow = {
  slug: string;
  display_name: string;
  profile_path: string | null;
  performer_union: string | null;
  stunt_disciplines: string[];
  doubles_for: string[];
  stunt_company_slug: string | null;
  training_school_slugs: string[];
  primary_role: string | null;
  credit_count: number;
  // Phase 8/9/12 enrichments — pulled from the relational tables
  // rather than the legacy text-array columns above. The text array
  // is preserved for backwards-compat with seeds that haven't been
  // re-imported yet.
  doubling_credit_count: number;
  /** display_name of the actor this person has doubled most often, with the count */
  top_doubled_name: string | null;
  top_doubled_slug: string | null;
  top_doubled_count: number;
  /** company memberships from stunt_company_members — slugs only, principals first */
  member_company_slugs: string[];
  /** primary company name to render inline on the card; first principal membership */
  primary_company_name: string | null;
  primary_company_slug: string | null;
};

/**
 * Lists every person with at least one stunt-relevant attribute —
 * either a populated `stunt_disciplines` array, a primary affiliation
 * to a stunt company, or a credited `roles.category = 'stunts'` work
 * entry. Used by the /stunts/people index.
 */
export async function listStuntPeople(db: SeedDb = defaultDb): Promise<StuntPersonRow[]> {
  return db.execute<StuntPersonRow>(sql`
    WITH stunt_credits AS (
      SELECT ca.person_id,
             COUNT(*)::int AS cnt,
             (ARRAY_AGG(r.name ORDER BY r.slug))[1] AS primary_role
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      WHERE r.category = 'stunts'
      GROUP BY ca.person_id
    ),
    -- Phase 8/9 doubling-credits aggregations.
    doubling_summary AS (
      SELECT sdc.doubler_person_id AS person_id,
             COUNT(*)::int AS cnt
      FROM stunt_doubling_credits sdc
      GROUP BY sdc.doubler_person_id
    ),
    top_doubled_per_person AS (
      SELECT DISTINCT ON (sdc.doubler_person_id)
             sdc.doubler_person_id AS person_id,
             dp.slug AS doubled_slug,
             dp.display_name AS doubled_name,
             COUNT(*)::int AS doubled_count
      FROM stunt_doubling_credits sdc
      JOIN people dp ON dp.id = sdc.doubled_person_id
      GROUP BY sdc.doubler_person_id, dp.slug, dp.display_name
      ORDER BY sdc.doubler_person_id, COUNT(*) DESC, dp.display_name
    ),
    -- Phase 8 company-memberships aggregations.
    membership_summary AS (
      SELECT scm.person_id,
             ARRAY_AGG(sc.slug ORDER BY scm.is_principal DESC, scm.sort_order) AS company_slugs
      FROM stunt_company_members scm
      JOIN stunt_companies sc ON sc.id = scm.company_id
      GROUP BY scm.person_id
    ),
    primary_company AS (
      SELECT DISTINCT ON (scm.person_id)
             scm.person_id,
             sc.slug AS company_slug,
             sc.name AS company_name
      FROM stunt_company_members scm
      JOIN stunt_companies sc ON sc.id = scm.company_id
      ORDER BY scm.person_id, scm.is_principal DESC, scm.sort_order
    )
    SELECT p.slug, p.display_name, p.profile_path,
           p.performer_union, p.stunt_disciplines, p.doubles_for,
           p.stunt_company_slug, p.training_school_slugs,
           sc.primary_role,
           COALESCE(sc.cnt, 0)::int AS credit_count,
           COALESCE(ds.cnt, 0)::int AS doubling_credit_count,
           td.doubled_name AS top_doubled_name,
           td.doubled_slug AS top_doubled_slug,
           COALESCE(td.doubled_count, 0)::int AS top_doubled_count,
           COALESCE(ms.company_slugs, '{}'::text[]) AS member_company_slugs,
           pc.company_name AS primary_company_name,
           pc.company_slug AS primary_company_slug
    FROM people p
    LEFT JOIN stunt_credits sc ON sc.person_id = p.id
    LEFT JOIN doubling_summary ds ON ds.person_id = p.id
    LEFT JOIN top_doubled_per_person td ON td.person_id = p.id
    LEFT JOIN membership_summary ms ON ms.person_id = p.id
    LEFT JOIN primary_company pc ON pc.person_id = p.id
    WHERE COALESCE(array_length(p.stunt_disciplines, 1), 0) > 0
       OR p.stunt_company_slug IS NOT NULL
       OR sc.cnt > 0
       OR ds.cnt > 0
       OR ms.company_slugs IS NOT NULL
    ORDER BY p.display_name ASC
  `);
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
    role_slug: string;
    role_category: string;
    credit_name_override: string | null;
    /** T3-4 — surfaced when present (e.g. "additional photography only") */
    notes: string | null;
    primary_aspect_ratio: string | null;
    primary_acquisition_format: string | null;
    poster_path: string | null;
  }>(sql`
    SELECT p.slug AS production_slug, p.title AS production_title,
           p.release_year, p.type AS production_type,
           r.name AS role_name, r.slug AS role_slug, r.category AS role_category,
           ca.credit_name_override,
           ca.notes,
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
 * T3-3 — "Known for" highlight. Returns the highest-rated productions
 * the person crewed on, gated by vote_count >= 50 to filter obscure
 * outliers, capped at `limit`. Distinct on production_id since a person
 * can have multiple roles on the same film.
 */
export async function getKnownForByPerson(
  db: SeedDb = defaultDb,
  personSlug: string,
  limit = 4,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    role_name: string;
    vote_average: string | null;
  }>(sql`
    SELECT
      p.slug, p.title, p.release_year, p.poster_path,
      (array_agg(r.name ORDER BY ca.credit_order NULLS LAST))[1] AS role_name,
      p.vote_average::text
    FROM crew_assignments ca
    JOIN people ppl ON ppl.id = ca.person_id
    JOIN productions p ON p.id = ca.production_id
    JOIN roles r ON r.id = ca.role_id
    WHERE ppl.slug = ${personSlug}
      AND p.vote_average IS NOT NULL
      AND COALESCE(p.vote_count, 0) >= 50
    GROUP BY p.id
    ORDER BY p.vote_average DESC NULLS LAST, p.vote_count DESC NULLS LAST
    LIMIT ${limit}
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

/**
 * UX-audit E5 — find productions that 2+ of the given people crewed on.
 * Powers the "Shared productions" panel on /crew/compare.
 */
export type SharedProductionRow = {
  slug: string;
  title: string;
  release_year: number | null;
  shared_count: number;
  /** Slugs of the input people who crewed on this production. */
  shared_person_slugs: string[];
};

export async function getSharedProductionsAcrossPeople(
  db: SeedDb = defaultDb,
  personSlugs: string[],
): Promise<SharedProductionRow[]> {
  if (personSlugs.length < 2) return [];
  return db.execute<SharedProductionRow>(sql`
    WITH source_people AS (
      SELECT id, slug FROM people
      WHERE slug IN ${sql`(${sql.join(personSlugs.map((s) => sql`${s}`), sql`, `)})`}
    ),
    prod_people AS (
      SELECT DISTINCT
        p.id AS production_id,
        p.slug,
        p.title,
        p.release_year,
        sp.slug AS person_slug
      FROM source_people sp
      JOIN crew_assignments ca ON ca.person_id = sp.id
      JOIN productions p ON p.id = ca.production_id
    )
    SELECT
      pp.slug,
      pp.title,
      pp.release_year,
      COUNT(DISTINCT pp.person_slug)::int AS shared_count,
      array_agg(DISTINCT pp.person_slug) AS shared_person_slugs
    FROM prod_people pp
    GROUP BY pp.slug, pp.title, pp.release_year
    HAVING COUNT(DISTINCT pp.person_slug) >= 2
    ORDER BY shared_count DESC, pp.release_year DESC NULLS LAST, pp.title
    LIMIT 30
  `);
}
