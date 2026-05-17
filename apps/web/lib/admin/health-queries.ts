import 'server-only';
import { db, sql } from '@bts/db';

// ── Duplicate detection ────────────────────────────────────────────

export type DuplicatePair = {
  table_name: string;
  table_label: string;
  /** Similarity score from pg_trgm.similarity(), in [0, 1]. */
  similarity: number;
  a_slug: string;
  a_name: string;
  a_country: string | null;
  a_year: number | null;
  a_credits: number;
  b_slug: string;
  b_name: string;
  b_country: string | null;
  b_year: number | null;
  b_credits: number;
  public_route_prefix: string;
};

/**
 * Trigram-similarity scan for likely duplicate rows. Threshold of
 * 0.45 catches the common cases (Wētā / Weta, Mr X / MR. X, ILM /
 * Industrial Light & Magic) while avoiding noisy partial-name pairs.
 *
 * Self-join uses `a.id < b.id` so each pair appears once.
 *
 * Restricted to editorial-entity tables. Productions + people
 * datasets are large enough that O(n²) similarity scans need to be
 * batched / GIN-driven differently — out of scope here.
 */
export async function findDuplicateCandidates(): Promise<DuplicatePair[]> {
  const rows = await db.execute<DuplicatePair>(sql`
    -- VFX houses
    SELECT 'vfx_houses' AS table_name,
           'VFX house' AS table_label,
           similarity(a.name, b.name)::real AS similarity,
           a.slug AS a_slug, a.name AS a_name, a.country AS a_country,
           a.founded_year AS a_year, 0 AS a_credits,
           b.slug AS b_slug, b.name AS b_name, b.country AS b_country,
           b.founded_year AS b_year, 0 AS b_credits,
           '/vfx' AS public_route_prefix
    FROM vfx_houses a
    JOIN vfx_houses b ON a.id < b.id
    WHERE similarity(a.name, b.name) > 0.45

    UNION ALL

    -- Stunt companies
    SELECT 'stunt_companies', 'Stunt company',
           similarity(a.name, b.name)::real,
           a.slug, a.name, a.country, a.founded_year, 0,
           b.slug, b.name, b.country, b.founded_year, 0,
           '/stunts/companies'
    FROM stunt_companies a
    JOIN stunt_companies b ON a.id < b.id
    WHERE similarity(a.name, b.name) > 0.45

    UNION ALL

    -- Equipment manufacturers
    SELECT 'equipment_manufacturers', 'Manufacturer',
           similarity(a.name, b.name)::real,
           a.slug, a.name, NULL, NULL, 0,
           b.slug, b.name, NULL, NULL, 0,
           '/gear'
    FROM equipment_manufacturers a
    JOIN equipment_manufacturers b ON a.id < b.id
    WHERE similarity(a.name, b.name) > 0.45

    UNION ALL

    -- Productions — 539 rows is small enough for a plain similarity
    -- self-join. Vote-count gate filters TMDb's long tail of
    -- weakly-similar titles before the comparison runs.
    SELECT 'productions', 'Production',
           similarity(a.title, b.title)::real,
           a.slug, a.title, a.production_country, a.release_year, 0,
           b.slug, b.title, b.production_country, b.release_year, 0,
           '/films'
    FROM productions a
    JOIN productions b ON a.id < b.id
    WHERE COALESCE(a.vote_count, 0) >= 50
      AND COALESCE(b.vote_count, 0) >= 50
      AND similarity(a.title, b.title) > 0.85

    -- People dedupe deferred — the 11k-row self-join needs a
    -- candidate-narrowing approach and the heuristics for what
    -- counts as "the same person" (Latin variants, married names,
    -- romanisation differences) deserve their own dedicated UI.

    ORDER BY similarity DESC
    LIMIT 200
  `);
  return filterIgnoredPairs(rows);
}

/**
 * Drop pairs the operator has explicitly marked "not a duplicate".
 * Match against (table_name, slug_low, slug_high) where the slugs
 * are sorted alphabetically so the pair is canonical regardless of
 * which row appears as "a" in the candidates view.
 */
async function filterIgnoredPairs<T extends { table_name: string; a_slug: string; b_slug: string }>(
  pairs: T[],
): Promise<T[]> {
  if (pairs.length === 0) return pairs;
  const ignored = await db.execute<{ table_name: string; slug_low: string; slug_high: string }>(sql`
    SELECT table_name, slug_low, slug_high FROM ignored_duplicates
  `);
  const blocked = new Set(
    ignored.map((r) => `${r.table_name}|${r.slug_low}|${r.slug_high}`),
  );
  return pairs.filter((p) => {
    const [lo, hi] = p.a_slug < p.b_slug ? [p.a_slug, p.b_slug] : [p.b_slug, p.a_slug];
    return !blocked.has(`${p.table_name}|${lo}|${hi}`);
  });
}

// ── Coverage drill-down ───────────────────────────────────────────

export type CoverageGap = {
  table_name: string;
  table_label: string;
  slug: string;
  display_name: string;
  updated_at: string;
  href: string;
};

/**
 * For each editorial entity type, list the specific rows missing
 * the load-bearing field. Capped per-table so a single backlog
 * doesn't dominate the page.
 */
export async function listCoverageGaps(perTable: number = 25): Promise<CoverageGap[]> {
  return db.execute<CoverageGap>(sql`
    (SELECT 'vfx_houses' AS table_name, 'VFX house' AS table_label,
            slug, name AS display_name, updated_at::text,
            '/vfx/' || slug AS href
     FROM vfx_houses
     WHERE COALESCE(summary, '') = ''
     ORDER BY updated_at DESC
     LIMIT ${perTable})
    UNION ALL
    (SELECT 'stunt_companies', 'Stunt company',
            slug, name, updated_at::text,
            '/stunts/companies/' || slug
     FROM stunt_companies
     WHERE COALESCE(summary, '') = ''
     ORDER BY updated_at DESC
     LIMIT ${perTable})
    UNION ALL
    (SELECT 'equipment_series', 'Equipment series',
            slug, name, updated_at::text,
            '/gear/' || slug
     FROM equipment_series
     WHERE COALESCE(summary, '') = ''
     ORDER BY updated_at DESC
     LIMIT ${perTable})
    UNION ALL
    (SELECT 'productions', 'Production',
            slug, title, updated_at::text,
            '/films/' || slug
     FROM productions
     WHERE COALESCE(synopsis, '') = ''
     ORDER BY popularity DESC NULLS LAST, updated_at DESC
     LIMIT ${perTable})
    UNION ALL
    (SELECT 'people', 'Crew',
            slug, display_name, updated_at::text,
            '/crew/' || slug
     FROM people
     WHERE COALESCE(bio, '') = ''
       AND EXISTS (SELECT 1 FROM crew_assignments WHERE person_id = people.id)
     ORDER BY (SELECT COUNT(*) FROM crew_assignments WHERE person_id = people.id) DESC
     LIMIT ${perTable})
  `);
}

export type CoverageSummaryRow = {
  table_name: string;
  table_label: string;
  total: number;
  missing: number;
  percent_complete: number;
};

export async function getCoverageSummary(): Promise<CoverageSummaryRow[]> {
  return db.execute<CoverageSummaryRow>(sql`
    SELECT 'vfx_houses' AS table_name, 'VFX house' AS table_label,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE COALESCE(summary, '') = '')::int AS missing,
           ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE(summary, '') <> '') / NULLIF(COUNT(*), 0))::int AS percent_complete
    FROM vfx_houses
    UNION ALL
    SELECT 'stunt_companies', 'Stunt company',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(summary, '') = '')::int,
           ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE(summary, '') <> '') / NULLIF(COUNT(*), 0))::int
    FROM stunt_companies
    UNION ALL
    SELECT 'equipment_series', 'Equipment series',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(summary, '') = '')::int,
           ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE(summary, '') <> '') / NULLIF(COUNT(*), 0))::int
    FROM equipment_series
    UNION ALL
    SELECT 'productions', 'Production',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(synopsis, '') = '')::int,
           ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE(synopsis, '') <> '') / NULLIF(COUNT(*), 0))::int
    FROM productions
    UNION ALL
    SELECT 'people', 'Crew',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(bio, '') = '' AND EXISTS (SELECT 1 FROM crew_assignments WHERE person_id = people.id))::int,
           ROUND(100.0 * COUNT(*) FILTER (WHERE COALESCE(bio, '') <> '') / NULLIF(COUNT(*), 0))::int
    FROM people
    ORDER BY missing DESC
  `);
}

// ── Source health summary (for the landing tile) ───────────────────

export type HealthBucket = { bucket: string; n: number };

export async function getSourceHealthBuckets(): Promise<HealthBucket[]> {
  return db.execute<HealthBucket>(sql`
    SELECT
      CASE
        WHEN last_status = 0 OR (last_status IS NOT NULL AND last_status >= 400) THEN 'rotted'
        WHEN url IS NOT NULL AND last_checked_at IS NULL THEN 'unchecked'
        WHEN url IS NOT NULL AND last_checked_at IS NOT NULL
             AND last_checked_at < NOW() - INTERVAL '30 days' THEN 'stale'
        WHEN paywall_status = 'paywalled' THEN 'paywalled'
        WHEN url IS NOT NULL AND archive_status = 'unknown' THEN 'missing_archive'
        ELSE 'healthy'
      END AS bucket,
      COUNT(*)::int AS n
    FROM sources
    GROUP BY 1
    ORDER BY n DESC
  `);
}
