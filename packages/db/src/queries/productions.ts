import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type ProductionListRow = {
  slug: string;
  title: string;
  type: string;
  release_year: number | null;
  synopsis: string | null;
  primary_aspect_ratio: string | null;
  primary_acquisition_format: string | null;
  poster_path: string | null;
  data_tier: 'curated' | 'imported';
  genres: string[] | null;
  vote_average: string | null;
  popularity: string | null;
};

export type ListProductionsFilters = {
  /** Filter by data tier ('curated' = hand-seeded, 'imported' = TMDb only). */
  dataTier?: 'curated' | 'imported' | 'all';
  /** Filter by release decade boundary, e.g. 2020 → 2020-2029. */
  decade?: number;
  /** Genre case-sensitive match against the TMDb genres array. */
  genre?: string;
  /** Slug of a specific person; returns only productions they crewed on. */
  personSlug?: string;
  /** Slug of a studio (e.g. 'a24'); returns only productions linked to it. */
  studioSlug?: string;
  /** Sort order. */
  sort?: 'recent' | 'oldest' | 'title' | 'popularity' | 'rating';
  limit?: number;
  offset?: number;
};

export async function listProductions(
  db: SeedDb = defaultDb,
  filters: ListProductionsFilters = {},
): Promise<ProductionListRow[]> {
  const sort = filters.sort ?? 'recent';
  const limit = filters.limit ?? 1000;
  const offset = filters.offset ?? 0;
  const dataTier = filters.dataTier ?? 'all';

  const orderClause = (() => {
    switch (sort) {
      case 'oldest':
        return sql`p.release_year ASC NULLS LAST, p.title ASC`;
      case 'title':
        return sql`p.title ASC`;
      case 'popularity':
        return sql`p.popularity DESC NULLS LAST, p.title ASC`;
      case 'rating':
        return sql`p.vote_average DESC NULLS LAST, p.vote_count DESC NULLS LAST`;
      case 'recent':
      default:
        return sql`p.release_year DESC NULLS LAST, p.title ASC`;
    }
  })();

  return db.execute<ProductionListRow>(sql`
    SELECT
      p.slug, p.title, p.type, p.release_year, p.synopsis,
      pf.aspect_ratio AS primary_aspect_ratio,
      pf.acquisition_format AS primary_acquisition_format,
      p.poster_path,
      p.data_tier,
      p.genres,
      p.vote_average::text,
      p.popularity::text
    FROM productions p
    LEFT JOIN production_formats pf
      ON pf.production_id = p.id AND pf.is_primary = true
    WHERE
      ${dataTier === 'all' ? sql`TRUE` : sql`p.data_tier = ${dataTier}::production_data_tier`}
      AND ${filters.decade ? sql`p.release_year BETWEEN ${filters.decade} AND ${filters.decade + 9}` : sql`TRUE`}
      AND ${filters.genre ? sql`${filters.genre} = ANY(p.genres)` : sql`TRUE`}
      AND ${filters.personSlug ? sql`EXISTS (
        SELECT 1 FROM crew_assignments ca
        JOIN people pp ON pp.id = ca.person_id
        WHERE ca.production_id = p.id AND pp.slug = ${filters.personSlug}
      )` : sql`TRUE`}
      AND ${filters.studioSlug ? sql`EXISTS (
        SELECT 1 FROM production_studios ps
        JOIN studios s ON s.id = ps.studio_id
        WHERE ps.production_id = p.id AND s.slug = ${filters.studioSlug}
      )` : sql`TRUE`}
    ORDER BY ${orderClause}
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countProductions(
  db: SeedDb = defaultDb,
  filters: ListProductionsFilters = {},
): Promise<number> {
  const dataTier = filters.dataTier ?? 'all';
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM productions p
    WHERE
      ${dataTier === 'all' ? sql`TRUE` : sql`p.data_tier = ${dataTier}::production_data_tier`}
      AND ${filters.decade ? sql`p.release_year BETWEEN ${filters.decade} AND ${filters.decade + 9}` : sql`TRUE`}
      AND ${filters.genre ? sql`${filters.genre} = ANY(p.genres)` : sql`TRUE`}
      AND ${filters.personSlug ? sql`EXISTS (
        SELECT 1 FROM crew_assignments ca
        JOIN people pp ON pp.id = ca.person_id
        WHERE ca.production_id = p.id AND pp.slug = ${filters.personSlug}
      )` : sql`TRUE`}
      AND ${filters.studioSlug ? sql`EXISTS (
        SELECT 1 FROM production_studios ps
        JOIN studios s ON s.id = ps.studio_id
        WHERE ps.production_id = p.id AND s.slug = ${filters.studioSlug}
      )` : sql`TRUE`}
  `);
  return Number(row?.count ?? 0);
}

/**
 * T6-2 — slug + updated_at pairs for sitemap lastmod. Returns ALL
 * productions, not just curated; cheap pure read.
 */
export async function listProductionLastmods(db: SeedDb = defaultDb) {
  return db.execute<{ slug: string; updated_at: string }>(sql`
    SELECT slug, updated_at::text FROM productions
  `);
}

/**
 * Distinct genres present in the corpus, ordered by frequency desc. Used to
 * populate the /films filter dropdown.
 */
export async function listGenresInUse(db: SeedDb = defaultDb): Promise<{ genre: string; count: number }[]> {
  return db.execute<{ genre: string; count: number }>(sql`
    SELECT g AS genre, COUNT(*)::int AS count
    FROM productions, UNNEST(genres) g
    GROUP BY g
    ORDER BY count DESC, g ASC
  `);
}

/**
 * Distinct decades present in the corpus, returned as the boundary year
 * (e.g. 1970 for 1970–1979). Used to populate the /films filter dropdown.
 */
export async function listDecadesInUse(db: SeedDb = defaultDb): Promise<{ decade: number; count: number }[]> {
  return db.execute<{ decade: number; count: number }>(sql`
    SELECT (release_year / 10) * 10 AS decade, COUNT(*)::int AS count
    FROM productions
    WHERE release_year IS NOT NULL
    GROUP BY decade
    ORDER BY decade DESC
  `);
}

/**
 * Featured productions for the homepage: curated tier first (hand-seeded
 * with crew/scenes/equipment depth), capped at `limit`. Falls back to
 * highest-rated imported productions if curated count < limit.
 */
export async function listFeaturedProductions(
  db: SeedDb = defaultDb,
  limit = 6,
): Promise<ProductionListRow[]> {
  return db.execute<ProductionListRow>(sql`
    SELECT
      p.slug, p.title, p.type, p.release_year, p.synopsis,
      pf.aspect_ratio AS primary_aspect_ratio,
      pf.acquisition_format AS primary_acquisition_format,
      p.poster_path,
      p.data_tier,
      p.genres,
      p.vote_average::text,
      p.popularity::text
    FROM productions p
    LEFT JOIN production_formats pf
      ON pf.production_id = p.id AND pf.is_primary = true
    WHERE p.data_tier = 'curated'
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}

export async function getProductionWithFullDetail(db: SeedDb = defaultDb, slug: string) {
  // Production core
  const [prod] = await db.execute<{
    id: number; slug: string; title: string; original_title: string | null;
    type: string; release_year: number | null; runtime_minutes: number | null;
    synopsis: string | null; imdb_id: string | null; tmdb_id: number | null;
    wikidata_id: string | null;
    principal_photography_start: string | null;
    principal_photography_end: string | null;
    genres: string[] | null;
    original_language: string | null;
    production_country: string | null;
    vote_average: string | null;
    vote_count: number | null;
    popularity: string | null;
    poster_path: string | null;
    backdrop_path: string | null;
    tmdb_collection_id: number | null;
    tmdb_collection_name: string | null;
    data_tier: 'curated' | 'imported';
    last_verified_at: string | null;
  }>(sql`SELECT id, slug, title, original_title, type, release_year, runtime_minutes,
              synopsis, imdb_id, tmdb_id, wikidata_id,
              principal_photography_start::text,
              principal_photography_end::text,
              genres, original_language, production_country,
              vote_average::text, vote_count, popularity::text,
              poster_path, backdrop_path,
              tmdb_collection_id, tmdb_collection_name,
              data_tier,
              last_verified_at::text
         FROM productions WHERE slug = ${slug}`);

  if (!prod) return null;

  const [formats, studios, crew, scenes, productionSources] = await Promise.all([
    // Formats
    db.execute<{
      label: string | null; aspect_ratio: string; acquisition_format: string;
      color_space: string | null; frame_rate: string | null; is_primary: boolean;
    }>(sql`SELECT label, aspect_ratio, acquisition_format, color_space,
                  frame_rate::text, is_primary
           FROM production_formats WHERE production_id = ${prod.id}
           ORDER BY is_primary DESC`),

    // Studios
    db.execute<{ name: string; kind: string; role: string }>(sql`
      SELECT s.name, s.kind, ps.role
      FROM production_studios ps JOIN studios s ON s.id = ps.studio_id
      WHERE ps.production_id = ${prod.id} ORDER BY s.name`),

    // Crew
    db.execute<{
      person_slug: string; display_name: string; role_slug: string; role_name: string;
      role_category: string; credit_order: number | null; credit_name_override: string | null;
      profile_path: string | null;
    }>(sql`
      SELECT ppl.slug AS person_slug, ppl.display_name, r.slug AS role_slug,
             r.name AS role_name, r.category AS role_category,
             ca.credit_order, ca.credit_name_override,
             ppl.profile_path
      FROM crew_assignments ca
      JOIN people ppl ON ppl.id = ca.person_id
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.production_id = ${prod.id}
      ORDER BY r.category, ca.credit_order NULLS LAST, ppl.display_name`),

    // Scenes with equipment
    db.execute<{
      scene_id: number; scene_slug: string; scene_title: string;
      scene_synopsis: string | null; time_of_day: string | null;
      interior_exterior: string | null; location: string | null;
      series_slug: string; series_name: string; series_category: string;
      manufacturer_slug: string;
      item_slug: string | null; item_name: string | null;
      setup_label: string | null; usage_role: string | null;
    }>(sql`
      SELECT sc.id AS scene_id, sc.slug AS scene_slug, sc.title AS scene_title,
             sc.synopsis AS scene_synopsis, sc.time_of_day, sc.interior_exterior, sc.location,
             es.slug AS series_slug, es.name AS series_name, es.category AS series_category,
             em.slug AS manufacturer_slug,
             ei.slug AS item_slug, ei.name AS item_name,
             eu.setup_label, eu.usage_role
      FROM scenes sc
      JOIN equipment_usage eu ON eu.scene_id = sc.id
      JOIN equipment_series es ON es.id = eu.equipment_series_id
      JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
      LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
      WHERE sc.production_id = ${prod.id}
      ORDER BY sc.id, es.category, es.name`),

    // Production sources
    db.execute<{
      title: string; publication: string | null; author: string | null;
      published_at: string | null; url: string | null; archive_url: string | null;
      confidence: string; claim_quote: string | null;
    }>(sql`
      SELECT s.title, s.publication, s.author, s.published_at::text, s.url, s.archive_url,
             ps.confidence, ps.claim_quote
      FROM production_sources ps JOIN sources s ON s.id = ps.source_id
      WHERE ps.production_id = ${prod.id}
      ORDER BY CASE ps.confidence
               WHEN 'primary' THEN 1
               WHEN 'secondary' THEN 2
               WHEN 'manufacturer_marketing' THEN 3
               WHEN 'speculative' THEN 4
               END`),
  ]);

  return { production: prod, formats, studios, crew, scenes, productionSources };
}

/**
 * T2-8 — "Similar films" for a production. Heuristic: rank by overlap of
 * (a) directors, (b) DPs, (c) genres, (d) decade, (e) primary aspect ratio.
 * Excludes the source production. Caps at `limit`.
 */
export async function getSimilarProductions(
  db: SeedDb = defaultDb,
  productionId: number,
  limit = 6,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    score: number;
    reason: string;
  }>(sql`
    WITH source AS (
      SELECT id, release_year, genres FROM productions WHERE id = ${productionId}
    ),
    source_directors AS (
      SELECT DISTINCT ca.person_id FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.production_id = ${productionId} AND r.slug = 'director'
    ),
    source_dps AS (
      SELECT DISTINCT ca.person_id FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.production_id = ${productionId} AND r.slug = 'director-of-photography'
    ),
    candidates AS (
      SELECT
        p.id, p.slug, p.title, p.release_year, p.poster_path,
        -- Score: 5 per director match, 3 per DP match, 1 per genre overlap, 1 if same decade
        (
          (SELECT COUNT(*) * 5 FROM crew_assignments ca
            JOIN roles r ON r.id = ca.role_id
            WHERE ca.production_id = p.id AND r.slug = 'director'
              AND ca.person_id IN (SELECT person_id FROM source_directors)) +
          (SELECT COUNT(*) * 3 FROM crew_assignments ca
            JOIN roles r ON r.id = ca.role_id
            WHERE ca.production_id = p.id AND r.slug = 'director-of-photography'
              AND ca.person_id IN (SELECT person_id FROM source_dps)) +
          COALESCE((
            SELECT COUNT(*) FROM unnest(p.genres) g
            WHERE g = ANY((SELECT genres FROM source))
          ), 0) +
          CASE WHEN p.release_year / 10 = (SELECT release_year / 10 FROM source) THEN 1 ELSE 0 END
        ) AS score,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM crew_assignments ca JOIN roles r ON r.id = ca.role_id
            WHERE ca.production_id = p.id AND r.slug = 'director'
              AND ca.person_id IN (SELECT person_id FROM source_directors)
          ) THEN 'same director'
          WHEN EXISTS (
            SELECT 1 FROM crew_assignments ca JOIN roles r ON r.id = ca.role_id
            WHERE ca.production_id = p.id AND r.slug = 'director-of-photography'
              AND ca.person_id IN (SELECT person_id FROM source_dps)
          ) THEN 'same cinematographer'
          ELSE 'similar genre'
        END AS reason
      FROM productions p
      WHERE p.id != ${productionId}
    )
    SELECT slug, title, release_year, poster_path, score::int, reason
    FROM candidates
    WHERE score > 0
    ORDER BY score DESC, release_year DESC NULLS LAST
    LIMIT ${limit}
  `);
}

/**
 * Returns other productions in the same TMDb collection (e.g. all Dune films).
 * Excludes the source production itself.
 */
export async function getCollectionMembers(
  db: SeedDb = defaultDb,
  collectionId: number,
  excludeProductionId: number,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
  }>(sql`
    SELECT slug, title, release_year, poster_path
    FROM productions
    WHERE tmdb_collection_id = ${collectionId} AND id != ${excludeProductionId}
    ORDER BY release_year ASC NULLS LAST, title
  `);
}
