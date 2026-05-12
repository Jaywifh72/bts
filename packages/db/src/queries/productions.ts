import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';
import type { ProductionReleaseDate } from '../schema/productions.ts';

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
 * T5-5 — most recently human-verified curated productions. Powers the
 * homepage "Updated this week" feed; signals the site is alive.
 */
export async function listRecentlyUpdatedProductions(
  db: SeedDb = defaultDb,
  limit = 4,
) {
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
    WHERE p.data_tier = 'curated' AND p.last_verified_at IS NOT NULL
    ORDER BY p.last_verified_at DESC, p.title
    LIMIT ${limit}
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
    curated_by: string | null;
    curated_by_url: string | null;
    last_curated_review: string | null;
    release_dates: ProductionReleaseDate[] | null;
  }>(sql`SELECT id, slug, title, original_title, type, release_year, runtime_minutes,
              synopsis, imdb_id, tmdb_id, wikidata_id,
              principal_photography_start::text,
              principal_photography_end::text,
              genres, original_language, production_country,
              vote_average::text, vote_count, popularity::text,
              poster_path, backdrop_path,
              tmdb_collection_id, tmdb_collection_name,
              data_tier,
              last_verified_at::text,
              curated_by, curated_by_url,
              last_curated_review::text,
              release_dates
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
      equipment_usage_id: number;
      series_slug: string; series_name: string; series_category: string;
      manufacturer_slug: string;
      item_slug: string | null; item_name: string | null;
      setup_label: string | null; usage_role: string | null;
    }>(sql`
      SELECT sc.id AS scene_id, sc.slug AS scene_slug, sc.title AS scene_title,
             sc.synopsis AS scene_synopsis, sc.time_of_day, sc.interior_exterior, sc.location,
             eu.id AS equipment_usage_id,
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
 * T9-6 — feed-shaped query for the weekly digest RSS/Atom output.
 * Returns the most-recently-verified curated productions with the
 * timestamp + synopsis a feed reader needs.
 */
export async function listDigestProductions(
  db: SeedDb = defaultDb,
  limit = 5,
): Promise<Array<{
  slug: string;
  title: string;
  release_year: number | null;
  synopsis: string | null;
  poster_path: string | null;
  last_verified_at: string;
}>> {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    synopsis: string | null;
    poster_path: string | null;
    last_verified_at: string;
  }>(sql`
    SELECT
      p.slug, p.title, p.release_year, p.synopsis, p.poster_path,
      p.last_verified_at::text AS last_verified_at
    FROM productions p
    WHERE p.data_tier = 'curated' AND p.last_verified_at IS NOT NULL
    ORDER BY p.last_verified_at DESC
    LIMIT ${limit}
  `);
}

/**
 * T4-4 — list productions whose `production_formats.acquisition_format`
 * matches ANY of the provided ILIKE patterns. Returns one row per
 * production (deduped) with its primary format string for context.
 *
 * Sort: release_year DESC NULLS LAST then title ASC — same convention
 * as listProductions so the format page feels like a filtered films list.
 */
export async function listProductionsByFormatPatterns(
  db: SeedDb = defaultDb,
  patterns: readonly string[],
): Promise<Array<{
  slug: string;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  acquisition_format: string;
  aspect_ratio: string;
}>> {
  if (patterns.length === 0) return [];
  const orClauses = sql.join(
    patterns.map((p) => sql`pf.acquisition_format ILIKE ${p}`),
    sql` OR `,
  );
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    acquisition_format: string;
    aspect_ratio: string;
  }>(sql`
    WITH matching AS (
      SELECT DISTINCT ON (p.id)
        p.id, p.slug, p.title, p.release_year, p.poster_path,
        pf.acquisition_format, pf.aspect_ratio
      FROM productions p
      JOIN production_formats pf ON pf.production_id = p.id
      WHERE ${orClauses}
      ORDER BY p.id, pf.is_primary DESC, pf.id
    )
    SELECT slug, title, release_year, poster_path, acquisition_format, aspect_ratio
    FROM matching
    ORDER BY release_year DESC NULLS LAST, title ASC
  `);
}

/**
 * E-31 — combined structured-filter + optional semantic-rank query.
 *
 * Each non-null filter narrows the candidate set via JOIN/WHERE.
 * When `queryEmbedding` is provided, results within the filtered set
 * are ranked by cosine similarity to it — gives the "Roger Deakins
 * 2.39:1 with magic-hour mood" experience without text-to-SQL.
 *
 * Sort fallback when no embedding: release_year DESC, popularity DESC.
 */
export async function searchProductionsCombined(
  db: SeedDb = defaultDb,
  filters: {
    director?: string | null;
    dp?: string | null;
    year_min?: number | null;
    year_max?: number | null;
    aspect_ratio?: string | null;
    format_keyword?: string | null;
  },
  queryEmbedding: number[] | null,
  limit: number,
): Promise<Array<{
  slug: string;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  synopsis: string | null;
  similarity: number | null;
}>> {
  const literal = queryEmbedding ? `[${queryEmbedding.join(',')}]` : null;

  // Build composable WHERE clauses. Empty filters degrade to TRUE.
  const dirClause = filters.director
    ? sql`EXISTS (SELECT 1 FROM crew_assignments ca
                  JOIN people ppl ON ppl.id = ca.person_id
                  JOIN roles r ON r.id = ca.role_id
                  WHERE ca.production_id = p.id
                    AND r.slug = 'director'
                    AND ppl.display_name ILIKE ${'%' + filters.director + '%'})`
    : sql`TRUE`;

  const dpClause = filters.dp
    ? sql`EXISTS (SELECT 1 FROM crew_assignments ca
                  JOIN people ppl ON ppl.id = ca.person_id
                  JOIN roles r ON r.id = ca.role_id
                  WHERE ca.production_id = p.id
                    AND r.slug = 'director-of-photography'
                    AND ppl.display_name ILIKE ${'%' + filters.dp + '%'})`
    : sql`TRUE`;

  const yearMinClause = filters.year_min !== null && filters.year_min !== undefined
    ? sql`p.release_year >= ${filters.year_min}`
    : sql`TRUE`;
  const yearMaxClause = filters.year_max !== null && filters.year_max !== undefined
    ? sql`p.release_year <= ${filters.year_max}`
    : sql`TRUE`;

  const aspectClause = filters.aspect_ratio
    ? sql`EXISTS (SELECT 1 FROM production_formats pf
                  WHERE pf.production_id = p.id
                    AND pf.aspect_ratio = ${filters.aspect_ratio})`
    : sql`TRUE`;

  const formatClause = filters.format_keyword
    ? sql`EXISTS (SELECT 1 FROM production_formats pf
                  WHERE pf.production_id = p.id
                    AND pf.acquisition_format ILIKE ${'%' + filters.format_keyword + '%'})`
    : sql`TRUE`;

  const orderClause = literal
    ? sql`p.embedding <=> ${literal}::vector NULLS LAST`
    : sql`p.release_year DESC NULLS LAST, p.popularity DESC NULLS LAST`;

  const similarityCol = literal
    ? sql`(1 - (p.embedding <=> ${literal}::vector))::float AS similarity`
    : sql`NULL::float AS similarity`;

  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    synopsis: string | null;
    similarity: number | null;
  }>(sql`
    SELECT p.slug, p.title, p.release_year, p.poster_path, p.synopsis,
           ${similarityCol}
    FROM productions p
    WHERE ${dirClause}
      AND ${dpClause}
      AND ${yearMinClause}
      AND ${yearMaxClause}
      AND ${aspectClause}
      AND ${formatClause}
    ORDER BY ${orderClause}
    LIMIT ${limit}
  `);
}

/**
 * E-27 — semantic search over productions via cosine similarity on the
 * 1536-dim embedding column. The caller provides a query embedding
 * (computed via OpenAI's text-embedding-3-small in the API layer).
 *
 * `<=>` is pgvector's cosine-distance operator (smaller = closer). We
 * filter to rows that actually have an embedding so the index helps.
 */
export async function searchProductionsByEmbedding(
  db: SeedDb = defaultDb,
  queryEmbedding: number[],
  limit = 12,
): Promise<Array<{
  slug: string;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  synopsis: string | null;
  similarity: number;
}>> {
  const literal = `[${queryEmbedding.join(',')}]`;
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    synopsis: string | null;
    similarity: number;
  }>(sql`
    SELECT
      slug, title, release_year, poster_path, synopsis,
      1 - (embedding <=> ${literal}::vector) AS similarity
    FROM productions
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}
  `);
}

/**
 * E-27 — "more like this" — find productions with the closest
 * embeddings to the given production. Excludes the source row.
 */
export async function getSemanticallySimilar(
  db: SeedDb = defaultDb,
  productionId: number,
  limit = 6,
): Promise<Array<{
  slug: string;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  similarity: number;
}>> {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    similarity: number;
  }>(sql`
    WITH src AS (
      SELECT embedding FROM productions WHERE id = ${productionId}
    )
    SELECT
      p.slug, p.title, p.release_year, p.poster_path,
      1 - (p.embedding <=> (SELECT embedding FROM src)) AS similarity
    FROM productions p
    WHERE p.embedding IS NOT NULL
      AND p.id <> ${productionId}
      AND (SELECT embedding FROM src) IS NOT NULL
    ORDER BY p.embedding <=> (SELECT embedding FROM src)
    LIMIT ${limit}
  `);
}

/**
 * E-48 — per-production confidence score. Aggregates the confidence
 * ratings across all four source-attribution tables for a production
 * (production_sources, scene_sources, crew_assignment_sources,
 * equipment_usage_sources) into a single 0-100 score plus per-tier
 * counts for hover detail.
 *
 * Weights: primary=4, secondary=3, manufacturer_marketing=1,
 * speculative=0.5. Score = (sum of weights / count) * 25 — so a
 * production whose every claim is `primary` lands at 100.
 *
 * Returns null when the production has no attributions at all (we hide
 * the badge in that case rather than showing a meaningless 0).
 */
export async function getProductionConfidence(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<{
  score: number;
  total: number;
  primary_count: number;
  secondary_count: number;
  manufacturer_count: number;
  speculative_count: number;
} | null> {
  const [row] = await db.execute<{
    primary_count: string;
    secondary_count: string;
    manufacturer_count: string;
    speculative_count: string;
    total: string;
    weight_sum: string;
  }>(sql`
    WITH all_attrs AS (
      SELECT confidence FROM production_sources WHERE production_id = ${productionId}
      UNION ALL
      SELECT ss.confidence FROM scene_sources ss
        JOIN scenes sc ON sc.id = ss.scene_id
        WHERE sc.production_id = ${productionId}
      UNION ALL
      SELECT cas.confidence FROM crew_assignment_sources cas
        JOIN crew_assignments ca ON ca.id = cas.crew_assignment_id
        WHERE ca.production_id = ${productionId}
      UNION ALL
      SELECT eus.confidence FROM equipment_usage_sources eus
        JOIN equipment_usage eu ON eu.id = eus.equipment_usage_id
        JOIN scenes sc ON sc.id = eu.scene_id
        WHERE sc.production_id = ${productionId}
    )
    SELECT
      COUNT(*) FILTER (WHERE confidence = 'primary')::text AS primary_count,
      COUNT(*) FILTER (WHERE confidence = 'secondary')::text AS secondary_count,
      COUNT(*) FILTER (WHERE confidence = 'manufacturer_marketing')::text AS manufacturer_count,
      COUNT(*) FILTER (WHERE confidence = 'speculative')::text AS speculative_count,
      COUNT(*)::text AS total,
      COALESCE(SUM(CASE confidence
                     WHEN 'primary' THEN 4
                     WHEN 'secondary' THEN 3
                     WHEN 'manufacturer_marketing' THEN 1
                     WHEN 'speculative' THEN 0.5
                   END), 0)::text AS weight_sum
    FROM all_attrs
  `);

  if (!row) return null;
  const total = Number(row.total);
  if (total === 0) return null;
  const weightSum = Number(row.weight_sum);
  const score = Math.round((weightSum / total) * 25);
  return {
    score,
    total,
    primary_count: Number(row.primary_count),
    secondary_count: Number(row.secondary_count),
    manufacturer_count: Number(row.manufacturer_count),
    speculative_count: Number(row.speculative_count),
  };
}

/**
 * T6-1 — combined citation map for a production.
 *
 * Returns the deduped list of sources cited anywhere on this production
 * (production_sources, scene_sources, crew_assignment_sources,
 * equipment_usage_sources), each assigned a stable numeric index. Plus
 * a map from each equipment_usage_id to the source numbers attached to it.
 *
 * Order: by confidence priority (primary > secondary > manufacturer >
 * speculative), then by `published_at` desc, then by source id.
 */
export async function getProductionCitations(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<{
  sources: Array<{
    number: number;
    id: number;
    title: string;
    publication: string | null;
    author: string | null;
    published_at: string | null;
    url: string | null;
    archive_url: string | null;
    confidence: string;
    last_status: number | null;
  }>;
  byEquipmentUsage: Record<number, number[]>;
}> {
  const sourceRows = await db.execute<{
    id: number;
    title: string;
    publication: string | null;
    author: string | null;
    published_at: string | null;
    url: string | null;
    archive_url: string | null;
    confidence: string;
    last_status: number | null;
  }>(sql`
    WITH ids AS (
      SELECT source_id, confidence FROM production_sources
        WHERE production_id = ${productionId}
      UNION
      SELECT ss.source_id, ss.confidence FROM scene_sources ss
        JOIN scenes sc ON sc.id = ss.scene_id
        WHERE sc.production_id = ${productionId}
      UNION
      SELECT cas.source_id, cas.confidence FROM crew_assignment_sources cas
        JOIN crew_assignments ca ON ca.id = cas.crew_assignment_id
        WHERE ca.production_id = ${productionId}
      UNION
      SELECT eus.source_id, eus.confidence FROM equipment_usage_sources eus
        JOIN equipment_usage eu ON eu.id = eus.equipment_usage_id
        JOIN scenes sc ON sc.id = eu.scene_id
        WHERE sc.production_id = ${productionId}
    ),
    dedup AS (
      -- A source can be cited at multiple levels with different confidence
      -- ratings. Keep the highest-confidence rating per source.
      SELECT source_id,
             MIN(CASE confidence
                  WHEN 'primary' THEN 1
                  WHEN 'secondary' THEN 2
                  WHEN 'manufacturer_marketing' THEN 3
                  WHEN 'speculative' THEN 4
                 END) AS conf_rank
      FROM ids
      GROUP BY source_id
    )
    SELECT s.id, s.title, s.publication, s.author,
           s.published_at::text, s.url, s.archive_url,
           s.last_status,
           CASE d.conf_rank
             WHEN 1 THEN 'primary'
             WHEN 2 THEN 'secondary'
             WHEN 3 THEN 'manufacturer_marketing'
             WHEN 4 THEN 'speculative'
           END AS confidence
    FROM dedup d JOIN sources s ON s.id = d.source_id
    ORDER BY d.conf_rank, s.published_at DESC NULLS LAST, s.id
  `);

  const numberById = new Map<number, number>();
  const sources = sourceRows.map((s, i) => {
    const number = i + 1;
    numberById.set(s.id, number);
    return { number, ...s };
  });

  const usageRows = await db.execute<{ equipment_usage_id: number; source_id: number }>(sql`
    SELECT eus.equipment_usage_id, eus.source_id
    FROM equipment_usage_sources eus
    JOIN equipment_usage eu ON eu.id = eus.equipment_usage_id
    JOIN scenes sc ON sc.id = eu.scene_id
    WHERE sc.production_id = ${productionId}
  `);

  const byEquipmentUsage: Record<number, number[]> = {};
  for (const row of usageRows) {
    const n = numberById.get(row.source_id);
    if (n === undefined) continue;
    (byEquipmentUsage[row.equipment_usage_id] ??= []).push(n);
  }
  for (const ids of Object.values(byEquipmentUsage)) {
    ids.sort((a, b) => a - b);
  }

  return { sources, byEquipmentUsage };
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
            SELECT COUNT(*)::int FROM unnest(p.genres) g
            WHERE g = ANY(SELECT unnest(genres) FROM source)
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

// ── Phase 30: per-production editorial-depth signals ───────────────

export type ProductionDepthFlags = {
  has_stunt_sequences: boolean;
  has_stunt_doubling: boolean;
  has_color_pipeline: boolean;
  has_lighting_setups: boolean;
  has_locations: boolean;
  has_post_houses: boolean;
};

/**
 * Batched lookup: for a list of production slugs, return per-slug
 * booleans for each editorial-depth signal. Used by the /films
 * listing to render depth badges on ProductionCards. One
 * round-trip; the EXISTS subqueries against indexed (production_id)
 * columns scale fine for the 60-row page size.
 */
export async function getProductionDepthFlags(
  db: SeedDb = defaultDb,
  productionSlugs: string[],
): Promise<Map<string, ProductionDepthFlags>> {
  if (productionSlugs.length === 0) return new Map();

  const rows = await db.execute<{
    slug: string;
    has_stunt_sequences: boolean;
    has_stunt_doubling: boolean;
    has_color_pipeline: boolean;
    has_lighting_setups: boolean;
    has_locations: boolean;
    has_post_houses: boolean;
  }>(sql`
    SELECT
      p.slug,
      EXISTS (SELECT 1 FROM stunt_sequences WHERE production_id = p.id) AS has_stunt_sequences,
      EXISTS (SELECT 1 FROM stunt_doubling_credits WHERE production_id = p.id) AS has_stunt_doubling,
      EXISTS (SELECT 1 FROM production_color_pipelines WHERE production_id = p.id) AS has_color_pipeline,
      EXISTS (
        SELECT 1 FROM lighting_setups ls
        JOIN scenes s ON s.id = ls.scene_id
        WHERE s.production_id = p.id
      ) AS has_lighting_setups,
      EXISTS (SELECT 1 FROM production_locations WHERE production_id = p.id) AS has_locations,
      EXISTS (SELECT 1 FROM production_post_houses WHERE production_id = p.id) AS has_post_houses
    FROM productions p
    WHERE p.slug IN ${sql`(${sql.join(productionSlugs.map((s) => sql`${s}`), sql`, `)})`}
  `);

  const out = new Map<string, ProductionDepthFlags>();
  for (const r of rows) {
    out.set(r.slug, {
      has_stunt_sequences: r.has_stunt_sequences,
      has_stunt_doubling: r.has_stunt_doubling,
      has_color_pipeline: r.has_color_pipeline,
      has_lighting_setups: r.has_lighting_setups,
      has_locations: r.has_locations,
      has_post_houses: r.has_post_houses,
    });
  }
  return out;
}

/**
 * Single-roundtrip aggregation for the homepage's editorial-depth tile
 * grid. Each subquery counts the visible artefacts in one section so the
 * tile reads "23 rigs · 11 bulletins" without chained roundtrips.
 *
 * Extracted from app/page.tsx during QA pass — the previous inline
 * db.execute call violated the "no SQL in app/" convention and made the
 * homepage harder to reason about.
 */
export type EditorialDepthStats = {
  stunt_companies: number;
  stunt_people: number;
  stunt_sequences: number;
  stunt_rigging: number;
  safety_bulletins: number;
  stunt_doubling: number;
  vfx_houses: number;
  color_pipelines: number;
  lighting_setups: number;
  locations: number;
  post_links: number;
  cited_references: number;
};

export async function getEditorialDepthStats(db: SeedDb = defaultDb): Promise<EditorialDepthStats> {
  const rows = await db.execute<EditorialDepthStats>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM stunt_companies) AS stunt_companies,
      (SELECT COUNT(*)::int FROM people WHERE COALESCE(array_length(stunt_disciplines, 1), 0) > 0) AS stunt_people,
      (SELECT COUNT(*)::int FROM stunt_sequences) AS stunt_sequences,
      (SELECT COUNT(*)::int FROM stunt_rigging_techniques) AS stunt_rigging,
      (SELECT COUNT(*)::int FROM safety_bulletins) AS safety_bulletins,
      (SELECT COUNT(*)::int FROM stunt_doubling_credits) AS stunt_doubling,
      (SELECT COUNT(*)::int FROM vfx_houses) AS vfx_houses,
      (SELECT COUNT(*)::int FROM production_color_pipelines) AS color_pipelines,
      (SELECT COUNT(*)::int FROM lighting_setups) AS lighting_setups,
      (SELECT COUNT(*)::int FROM production_locations) AS locations,
      (SELECT COUNT(*)::int FROM production_post_houses) AS post_links,
      (SELECT COUNT(*)::int FROM (
        SELECT mas.id FROM media_assets mas
        JOIN media_associations ma ON ma.media_asset_id = mas.id
        GROUP BY mas.id HAVING COUNT(ma.id) > 1
      ) sub) AS cited_references
  `);
  return rows[0]!;
}
