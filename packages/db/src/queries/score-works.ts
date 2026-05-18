import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * Per-production score deep-dive metadata. Returns one row per
 * (production, composer) pair — co-composers appear as separate rows.
 * Joined to scoring_stages + people so the production page can render
 * full citations without secondary lookups.
 */
export async function getScoreWorksForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
) {
  return db.execute<{
    id: number;
    composer_slug: string;
    composer_name: string;
    co_composer_person_ids: number[];
    scoring_stage_slug: string | null;
    scoring_stage_name: string | null;
    recording_orchestra: string | null;
    recording_location: string | null;
    cue_count_estimate: number | null;
    runtime_minutes: number | null;
    release_label: string | null;
    release_format: string | null;
    release_url: string | null;
    themes_summary: string | null;
    summary: string | null;
  }>(sql`
    SELECT sw.id,
           c.slug   AS composer_slug,
           c.display_name AS composer_name,
           sw.co_composer_person_ids,
           ss.slug  AS scoring_stage_slug,
           ss.name  AS scoring_stage_name,
           sw.recording_orchestra,
           sw.recording_location,
           sw.cue_count_estimate,
           sw.runtime_minutes,
           sw.release_label,
           sw.release_format,
           sw.release_url,
           sw.themes_summary,
           sw.summary
    FROM score_works sw
    JOIN people c ON c.id = sw.composer_person_id
    LEFT JOIN scoring_stages ss ON ss.id = sw.scoring_stage_id
    WHERE sw.production_id = ${productionId}
    ORDER BY c.display_name
  `);
}

/**
 * Score deep-dive lookup by production slug. Returns rows + composer
 * detail for /music/scores/[productionSlug].
 */
export async function getScoreWorksByProductionSlug(
  db: SeedDb = defaultDb,
  productionSlug: string,
) {
  const rows = await db.execute<{
    production_id: number;
    production_slug: string;
    production_title: string;
    release_year: number | null;
    score_work_id: number;
    composer_slug: string;
    composer_name: string;
    scoring_stage_slug: string | null;
    scoring_stage_name: string | null;
    recording_orchestra: string | null;
    recording_location: string | null;
    cue_count_estimate: number | null;
    runtime_minutes: number | null;
    release_label: string | null;
    release_format: string | null;
    release_url: string | null;
    themes_summary: string | null;
    summary: string | null;
  }>(sql`
    SELECT p.id    AS production_id,
           p.slug  AS production_slug,
           p.title AS production_title,
           p.release_year,
           sw.id   AS score_work_id,
           c.slug  AS composer_slug,
           c.display_name AS composer_name,
           ss.slug AS scoring_stage_slug,
           ss.name AS scoring_stage_name,
           sw.recording_orchestra,
           sw.recording_location,
           sw.cue_count_estimate,
           sw.runtime_minutes,
           sw.release_label,
           sw.release_format,
           sw.release_url,
           sw.themes_summary,
           sw.summary
    FROM productions p
    JOIN score_works sw ON sw.production_id = p.id
    JOIN people c ON c.id = sw.composer_person_id
    LEFT JOIN scoring_stages ss ON ss.id = sw.scoring_stage_id
    WHERE p.slug = ${productionSlug}
    ORDER BY c.display_name
  `);
  return rows;
}

/**
 * Score credits for a single composer — joined back to the production.
 * Used by composer-side surfaces (/crew/[slug] score tab, /music/composers/[slug]).
 */
export async function getScoreWorksForComposer(
  db: SeedDb = defaultDb,
  composerSlug: string,
) {
  return db.execute<{
    production_slug: string;
    production_title: string;
    release_year: number | null;
    scoring_stage_slug: string | null;
    scoring_stage_name: string | null;
    recording_orchestra: string | null;
    summary: string | null;
  }>(sql`
    SELECT p.slug AS production_slug, p.title AS production_title, p.release_year,
           ss.slug AS scoring_stage_slug, ss.name AS scoring_stage_name,
           sw.recording_orchestra,
           sw.summary
    FROM score_works sw
    JOIN productions p ON p.id = sw.production_id
    JOIN people c ON c.id = sw.composer_person_id
    LEFT JOIN scoring_stages ss ON ss.id = sw.scoring_stage_id
    WHERE c.slug = ${composerSlug}
    ORDER BY p.release_year DESC NULLS LAST, p.title
  `);
}
