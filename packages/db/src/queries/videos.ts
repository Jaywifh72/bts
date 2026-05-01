import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export interface ProductionVideo extends Record<string, unknown> {
  id: number;
  source: 'youtube' | 'vimeo';
  external_id: string;
  url: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  published_at: string | null;
  category: string;
  confidence_score: string;
}

/**
 * Returns all published videos for a production, sorted by category then view_count DESC.
 * Returns an empty array if the production has no published videos.
 */
export async function getProductionVideos(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionVideo[]> {
  return db.execute<ProductionVideo>(sql`
    SELECT
      id,
      source,
      external_id,
      url,
      title,
      channel_name,
      thumbnail_url,
      duration_seconds,
      view_count,
      published_at,
      category,
      confidence_score
    FROM production_videos
    WHERE production_id = ${productionId}
      AND status = 'published'
    ORDER BY category, view_count DESC NULLS LAST
  `);
}
