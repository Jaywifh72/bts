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
