import 'dotenv/config';
import { db, sql } from '@bts/db';

export interface ScoredVideo {
  productionId: number;
  source: 'youtube' | 'vimeo';
  externalId: string;
  url: string;
  title: string;
  channelName: string | null;
  channelId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
  category: string;
  confidenceScore: number;
}

/** Threshold constants (mirrors the spec) */
const THRESHOLD_PUBLISHED = 0.65;
const THRESHOLD_PENDING = 0.40;

/**
 * Upsert a single scored+categorised video into production_videos.
 * Videos below the discard threshold are skipped.
 */
export async function upsertVideo(video: ScoredVideo): Promise<void> {
  if (video.confidenceScore < THRESHOLD_PENDING) {
    return; // discard
  }

  const status = video.confidenceScore >= THRESHOLD_PUBLISHED ? 'published' : 'pending';
  const scoreStr = video.confidenceScore.toFixed(3);

  await db.execute(sql`
    INSERT INTO production_videos (
      production_id, source, external_id, url, title,
      channel_name, channel_id, thumbnail_url, duration_seconds, view_count,
      published_at, category, confidence_score, status
    ) VALUES (
      ${video.productionId}, ${video.source}, ${video.externalId}, ${video.url}, ${video.title},
      ${video.channelName ?? null}, ${video.channelId ?? null},
      ${video.thumbnailUrl ?? null}, ${video.durationSeconds ?? null}, ${video.viewCount ?? null},
      ${video.publishedAt ?? null}, ${video.category}, ${scoreStr}, ${status}
    )
    ON CONFLICT (production_id, source, external_id) DO UPDATE SET
      -- refresh mutable fields
      title           = EXCLUDED.title,
      thumbnail_url   = EXCLUDED.thumbnail_url,
      view_count      = EXCLUDED.view_count,
      confidence_score = EXCLUDED.confidence_score,
      -- status: only upgrade (pending → published), never downgrade
      status = CASE
        WHEN production_videos.status = 'rejected' THEN 'rejected'
        WHEN production_videos.status = 'published' THEN 'published'
        ELSE EXCLUDED.status
      END,
      -- category: only update if not manually locked
      category = CASE
        WHEN production_videos.category_locked THEN production_videos.category
        ELSE EXCLUDED.category
      END,
      updated_at = NOW()
  `);
}

/**
 * Upsert a batch of scored videos, logging a summary per production.
 */
export async function upsertVideos(videos: ScoredVideo[]): Promise<void> {
  let published = 0, pending = 0, discarded = 0;
  for (const v of videos) {
    if (v.confidenceScore < THRESHOLD_PENDING) { discarded++; continue; }
    await upsertVideo(v);
    if (v.confidenceScore >= THRESHOLD_PUBLISHED) published++; else pending++;
  }
  console.log(`  upsert: ${published} published, ${pending} pending, ${discarded} discarded`);
}
