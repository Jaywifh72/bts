import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * UX-audit F3a — scoring-stage roster ranked by production-credit count.
 * Powers the /music vendor panel. Mirrors `listPostHouses` in shape so
 * the rendering can mirror the /sound panel.
 */
export type ScoringStageRow = {
  slug: string;
  name: string;
  facility_name: string | null;
  country: string | null;
  city: string | null;
  capacity_orchestra: number | null;
  production_count: number;
};

/**
 * Detail-page lookup. Returns NULL when the slug doesn't match.
 */
export async function getScoringStageBySlug(
  db: SeedDb = defaultDb,
  slug: string,
) {
  const rows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    facility_name: string | null;
    country: string | null;
    city: string | null;
    capacity_orchestra: number | null;
    capacity_chorus: number | null;
    website: string | null;
    notes: string | null;
    last_verified_at: string | null;
    production_count: number;
  }>(sql`
    SELECT ss.id, ss.slug, ss.name, ss.facility_name, ss.country, ss.city,
           ss.capacity_orchestra, ss.capacity_chorus, ss.website, ss.notes,
           ss.last_verified_at::text,
           (SELECT COUNT(DISTINCT pss.production_id)::int
              FROM production_scoring_stages pss
             WHERE pss.scoring_stage_id = ss.id) AS production_count
    FROM scoring_stages ss
    WHERE ss.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/**
 * Productions credited at a scoring stage. Joined for the detail-page
 * filmography panel.
 */
export async function listProductionsForScoringStage(
  db: SeedDb = defaultDb,
  scoringStageId: number,
  limit: number = 200,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    notes: string | null;
  }>(sql`
    SELECT p.slug, p.title, p.release_year, p.poster_path, pss.notes
    FROM production_scoring_stages pss
    JOIN productions p ON p.id = pss.production_id
    WHERE pss.scoring_stage_id = ${scoringStageId}
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}

export async function listScoringStages(
  db: SeedDb = defaultDb,
  opts: { withCreditsOnly?: boolean; limit?: number } = {},
): Promise<ScoringStageRow[]> {
  const withCreditsOnly = opts.withCreditsOnly ?? true;
  const limit = opts.limit ?? 50;
  return db.execute<ScoringStageRow>(sql`
    SELECT ss.slug, ss.name, ss.facility_name, ss.country, ss.city,
           ss.capacity_orchestra,
           COUNT(DISTINCT pss.production_id)::int AS production_count
    FROM scoring_stages ss
    LEFT JOIN production_scoring_stages pss ON pss.scoring_stage_id = ss.id
    GROUP BY ss.id
    HAVING ${withCreditsOnly ? sql`COUNT(DISTINCT pss.production_id) > 0` : sql`TRUE`}
    ORDER BY production_count DESC, ss.name ASC
    LIMIT ${limit}
  `);
}
