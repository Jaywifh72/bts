import 'server-only';
import { db, sql } from '@bts/db';

export type EntityTotals = {
  productions: number;
  people: number;
  vfx_houses: number;
  stunt_companies: number;
  stunt_schools: number;
  stunt_sequences: number;
  stunt_rigging: number;
  safety_bulletins: number;
  equipment_manufacturers: number;
  equipment_series: number;
  equipment_items: number;
  post_houses: number;
};

/**
 * One round-trip count across every editorial entity surfaced on
 * the dashboard. Keep all counts in a single UNION ALL query — twelve
 * separate counts done sequentially would dominate the page render.
 */
export async function getEntityTotals(): Promise<EntityTotals> {
  const rows = await db.execute<{ k: keyof EntityTotals; n: number }>(sql`
    SELECT 'productions' AS k, COUNT(*)::int AS n FROM productions
    UNION ALL SELECT 'people', COUNT(*)::int FROM people
    UNION ALL SELECT 'vfx_houses', COUNT(*)::int FROM vfx_houses
    UNION ALL SELECT 'stunt_companies', COUNT(*)::int FROM stunt_companies
    UNION ALL SELECT 'stunt_schools', COUNT(*)::int FROM stunt_schools
    UNION ALL SELECT 'stunt_sequences', COUNT(*)::int FROM stunt_sequences
    UNION ALL SELECT 'stunt_rigging', COUNT(*)::int FROM stunt_rigging_techniques
    UNION ALL SELECT 'safety_bulletins', COUNT(*)::int FROM safety_bulletins
    UNION ALL SELECT 'equipment_manufacturers', COUNT(*)::int FROM equipment_manufacturers
    UNION ALL SELECT 'equipment_series', COUNT(*)::int FROM equipment_series
    UNION ALL SELECT 'equipment_items', COUNT(*)::int FROM equipment_items
    UNION ALL SELECT 'post_houses', COUNT(*)::int FROM post_houses
  `);
  const out = {} as EntityTotals;
  for (const r of rows) (out as Record<string, number>)[r.k] = r.n;
  return out;
}

export type CoverageRow = {
  /** Display label for the table. */
  label: string;
  /** What "complete" means for this row's editorial scope. */
  measure: string;
  total: number;
  complete: number;
  href: string;
};

/**
 * Editorial coverage — for each curated entity type, how many rows
 * have the load-bearing editorial field populated (`summary` /
 * `mechanism` / `bio` etc.). A 100% row is a healthy curated
 * dataset; lower percentages are the curation backlog.
 */
export async function getCoverageStats(): Promise<CoverageRow[]> {
  const rows = await db.execute<{
    label: string;
    measure: string;
    total: number;
    complete: number;
    href: string;
  }>(sql`
    SELECT 'Productions' AS label, 'with synopsis' AS measure,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE COALESCE(synopsis, '') <> '')::int AS complete,
           '/films' AS href
    FROM productions
    UNION ALL
    SELECT 'Crew', 'with bio',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(bio, '') <> '')::int,
           '/crew'
    FROM people
    UNION ALL
    SELECT 'VFX houses', 'with summary',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(summary, '') <> '')::int,
           '/vfx'
    FROM vfx_houses
    UNION ALL
    SELECT 'Stunt companies', 'with summary',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(summary, '') <> '')::int,
           '/stunts'
    FROM stunt_companies
    UNION ALL
    SELECT 'Stunt rigging', 'with mechanism',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(mechanism, '') <> '')::int,
           '/stunts/rigging'
    FROM stunt_rigging_techniques
    UNION ALL
    SELECT 'Safety bulletins', 'with summary',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(summary, '') <> '')::int,
           '/stunts/safety'
    FROM safety_bulletins
    UNION ALL
    SELECT 'Equipment series', 'with editorial',
           COUNT(*)::int,
           COUNT(*) FILTER (WHERE COALESCE(summary, '') <> '')::int,
           '/gear'
    FROM equipment_series
  `);
  return [...rows];
}

export type RecentEditRow = {
  table_name: string;
  slug: string;
  display_name: string;
  updated_at: string;
  href: string;
};

/**
 * Recent edits across editorial tables — surfaces the last N updates
 * regardless of which table they hit. Uses LIMIT inside each branch
 * so we don't sort-and-discard the whole corpus.
 */
export async function getRecentEdits(limit: number = 8): Promise<RecentEditRow[]> {
  const k = Math.max(limit, 5);
  return db.execute<RecentEditRow>(sql`
    WITH unioned AS (
      (SELECT 'productions' AS table_name, slug, title AS display_name, updated_at,
              '/films/' || slug AS href
       FROM productions ORDER BY updated_at DESC LIMIT ${k})
      UNION ALL
      (SELECT 'people', slug, display_name, updated_at,
              '/crew/' || slug
       FROM people ORDER BY updated_at DESC LIMIT ${k})
      UNION ALL
      (SELECT 'vfx_houses', slug, name, updated_at,
              '/vfx/' || slug
       FROM vfx_houses ORDER BY updated_at DESC LIMIT ${k})
      UNION ALL
      (SELECT 'stunt_companies', slug, name, updated_at,
              '/stunts/companies/' || slug
       FROM stunt_companies ORDER BY updated_at DESC LIMIT ${k})
      UNION ALL
      (SELECT 'stunt_rigging_techniques', slug, name, updated_at,
              '/stunts/rigging/' || slug
       FROM stunt_rigging_techniques ORDER BY updated_at DESC LIMIT ${k})
      UNION ALL
      (SELECT 'safety_bulletins', slug, title, updated_at,
              '/stunts/safety/' || slug
       FROM safety_bulletins ORDER BY updated_at DESC LIMIT ${k})
      UNION ALL
      (SELECT 'stunt_sequences', slug, name, updated_at,
              '/stunts/sequences/' || slug
       FROM stunt_sequences ORDER BY updated_at DESC LIMIT ${k})
    )
    SELECT table_name, slug, display_name,
           updated_at::text AS updated_at,
           href
    FROM unioned
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `);
}

export type RunStat24h = {
  status: string;
  n: number;
};

export async function getRunStats24h(): Promise<RunStat24h[]> {
  return db.execute<RunStat24h>(sql`
    SELECT status::text AS status, COUNT(*)::int AS n
    FROM job_runs
    WHERE started_at > NOW() - INTERVAL '24 hours'
    GROUP BY status
    ORDER BY n DESC
  `);
}
