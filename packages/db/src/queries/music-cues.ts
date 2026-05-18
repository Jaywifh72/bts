import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * All cues for a given score_work, ordered by track_number then title.
 * Used by /music/scores/[productionSlug] composer panel.
 */
export async function getMusicCuesForScoreWork(
  db: SeedDb = defaultDb,
  scoreWorkId: number,
) {
  return db.execute<{
    id: number;
    slug: string;
    title: string;
    track_number: number | null;
    runtime_seconds: number | null;
    scene_label: string | null;
    scene_minute: number | null;
    cue_function: string;
    is_flagship: boolean;
    listening_notes: string | null;
    notable_for: string | null;
  }>(sql`
    SELECT id, slug, title, track_number, runtime_seconds,
           scene_label, scene_minute, cue_function::text AS cue_function,
           is_flagship, listening_notes, notable_for
    FROM music_cues
    WHERE score_work_id = ${scoreWorkId}
    ORDER BY track_number NULLS LAST, title
  `);
}

/**
 * Detail-page lookup for /music/cues/[productionSlug]/[cueSlug].
 * Joins production + composer + scoring_stage for full context.
 */
export async function getMusicCueByProductionAndSlug(
  db: SeedDb = defaultDb,
  productionSlug: string,
  cueSlug: string,
) {
  const rows = await db.execute<{
    id: number;
    slug: string;
    title: string;
    track_number: number | null;
    runtime_seconds: number | null;
    scene_label: string | null;
    scene_minute: number | null;
    cue_function: string;
    key_signature: string | null;
    tempo_bpm: number | null;
    instrumentation_summary: string | null;
    recording_session_date: string | null;
    listening_notes: string | null;
    notable_for: string | null;
    is_flagship: boolean;
    production_slug: string;
    production_title: string;
    release_year: number | null;
    composer_slug: string;
    composer_name: string;
    scoring_stage_slug: string | null;
    scoring_stage_name: string | null;
    recording_orchestra: string | null;
  }>(sql`
    SELECT mc.id, mc.slug, mc.title, mc.track_number, mc.runtime_seconds,
           mc.scene_label, mc.scene_minute,
           mc.cue_function::text AS cue_function,
           mc.key_signature, mc.tempo_bpm, mc.instrumentation_summary,
           mc.recording_session_date::text,
           mc.listening_notes, mc.notable_for, mc.is_flagship,
           p.slug AS production_slug, p.title AS production_title, p.release_year,
           c.slug AS composer_slug, c.display_name AS composer_name,
           ss.slug AS scoring_stage_slug, ss.name AS scoring_stage_name,
           sw.recording_orchestra
    FROM music_cues mc
    JOIN score_works sw ON sw.id = mc.score_work_id
    JOIN productions p ON p.id = sw.production_id
    JOIN people c ON c.id = sw.composer_person_id
    LEFT JOIN scoring_stages ss ON ss.id = sw.scoring_stage_id
    WHERE p.slug = ${productionSlug} AND mc.slug = ${cueSlug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/**
 * Performers credited on a single cue (soloists). Used by the cue
 * detail page below the listening-notes block.
 */
export async function getPerformersForCue(
  db: SeedDb = defaultDb,
  cueId: number,
) {
  return db.execute<{
    person_slug: string | null;
    person_name: string | null;
    credited_as: string | null;
    instrument: string;
    is_soloist: boolean;
  }>(sql`
    SELECT p.slug AS person_slug, p.display_name AS person_name,
           mcp.credited_as, mcp.instrument, mcp.is_soloist
    FROM music_cue_performers mcp
    LEFT JOIN people p ON p.id = mcp.person_id
    WHERE mcp.cue_id = ${cueId}
    ORDER BY mcp.sort_order, mcp.instrument
  `);
}
