import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type OrchestraRow = {
  slug: string;
  name: string;
  short_name: string | null;
  city: string | null;
  country: string | null;
  founded_year: number | null;
  ensemble_size: number | null;
  music_director: string | null;
  primary_stage_slug: string | null;
  primary_stage_name: string | null;
  score_count: number;
};

export async function listRecordingOrchestras(
  db: SeedDb = defaultDb,
  opts: { limit?: number } = {},
): Promise<OrchestraRow[]> {
  const limit = opts.limit ?? 200;
  return db.execute<OrchestraRow>(sql`
    SELECT ro.slug, ro.name, ro.short_name, ro.city, ro.country,
           ro.founded_year, ro.ensemble_size, ro.music_director,
           ss.slug AS primary_stage_slug, ss.name AS primary_stage_name,
           COUNT(DISTINCT swo.score_work_id)::int AS score_count
    FROM recording_orchestras ro
    LEFT JOIN scoring_stages ss ON ss.id = ro.primary_scoring_stage_id
    LEFT JOIN score_work_orchestras swo ON swo.orchestra_id = ro.id
    GROUP BY ro.id, ss.slug, ss.name
    ORDER BY score_count DESC, ro.name
    LIMIT ${limit}
  `);
}

export async function getRecordingOrchestraBySlug(db: SeedDb = defaultDb, slug: string) {
  const rows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    short_name: string | null;
    city: string | null;
    country: string | null;
    founded_year: number | null;
    music_director: string | null;
    ensemble_size: number | null;
    specialties: string[] | null;
    website: string | null;
    wikidata_id: string | null;
    summary: string | null;
    tagline: string | null;
    parent_company: string | null;
    careers_url: string | null;
    references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
    curated_by: string | null;
    curated_by_url: string | null;
    last_verified_at: string | null;
    primary_stage_slug: string | null;
    primary_stage_name: string | null;
    score_count: number;
  }>(sql`
    SELECT ro.id, ro.slug, ro.name, ro.short_name, ro.city, ro.country,
           ro.founded_year, ro.music_director, ro.ensemble_size,
           ro.specialties, ro.website, ro.wikidata_id,
           ro.summary, ro.tagline, ro.parent_company, ro.careers_url,
           COALESCE(ro.references, '[]'::jsonb) AS references,
           ro.curated_by, ro.curated_by_url, ro.last_verified_at::text,
           ss.slug AS primary_stage_slug, ss.name AS primary_stage_name,
           (SELECT COUNT(*)::int FROM score_work_orchestras WHERE orchestra_id = ro.id) AS score_count
    FROM recording_orchestras ro
    LEFT JOIN scoring_stages ss ON ss.id = ro.primary_scoring_stage_id
    WHERE ro.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listScoresForOrchestra(
  db: SeedDb = defaultDb,
  orchestraId: number,
  limit: number = 200,
) {
  return db.execute<{
    production_slug: string;
    production_title: string;
    release_year: number | null;
    composer_slug: string;
    composer_name: string;
    notes: string | null;
  }>(sql`
    SELECT p.slug AS production_slug, p.title AS production_title, p.release_year,
           c.slug AS composer_slug, c.display_name AS composer_name,
           swo.notes
    FROM score_work_orchestras swo
    JOIN score_works sw ON sw.id = swo.score_work_id
    JOIN productions p ON p.id = sw.production_id
    JOIN people c ON c.id = sw.composer_person_id
    WHERE swo.orchestra_id = ${orchestraId}
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}
