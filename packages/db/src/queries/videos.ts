import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type ProductionVideo = {
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
};

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

// ─────────────────────────────────────────────────────────────────────────────
// Admin / review queries
// ─────────────────────────────────────────────────────────────────────────────

export type VideoStatus = 'pending' | 'published' | 'rejected';

export type VideoCategory =
  | 'vfx_breakdown' | 'compositing' | 'making_of' | 'behind_the_scenes'
  | 'director_interview' | 'dp_interview' | 'production_design'
  | 'stunts' | 'sound' | 'music' | 'other';

export type VideoAnnotationType =
  | 'visible_gear'
  | 'vfx_before_after'
  | 'lighting_setup_visible'
  | 'monitor_lut_visible'
  | 'rigging_stunt_visible'
  | 'virtual_production_visible'
  | 'interview_quote'
  | 'general_evidence';

export type VideoAnnotationReviewStatus = 'pending' | 'reviewed' | 'rejected';

export type VideoTimestampAnnotation = {
  id: number;
  video_id: number;
  production_id: number;
  production_slug: string;
  production_title: string;
  video_title: string;
  video_url: string;
  thumbnail_url: string | null;
  claim_id: number | null;
  claim_slug: string | null;
  claim_statement: string | null;
  evidence_item_id: number | null;
  annotation_type: VideoAnnotationType;
  review_status: VideoAnnotationReviewStatus;
  start_seconds: number;
  end_seconds: number | null;
  label: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VideoForReview = ProductionVideo & {
  production_id: number;
  production_slug: string;
  production_title: string;
  status: VideoStatus;
  category_locked: boolean;
  notes: string | null;
  created_at: string;
};

export type ReviewFilters = {
  /** Defaults to 'pending'. Pass 'all' to return every status. */
  status?: VideoStatus | 'all';
  productionSlug?: string;
  category?: VideoCategory | 'all';
  limit?: number;
  offset?: number;
};

export type VideoTimestampAnnotationFilters = {
  status?: VideoAnnotationReviewStatus | 'all';
  annotationType?: VideoAnnotationType | 'all';
  productionSlug?: string;
  limit?: number;
  offset?: number;
};

/**
 * Lists videos for review with optional filters. Sorted by confidence DESC, then
 * created_at DESC so the highest-signal candidates surface first.
 */
export async function listVideosForReview(
  db: SeedDb = defaultDb,
  filters: ReviewFilters = {},
): Promise<VideoForReview[]> {
  const status = filters.status ?? 'pending';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  return db.execute<VideoForReview>(sql`
    SELECT
      v.id,
      v.source,
      v.external_id,
      v.url,
      v.title,
      v.channel_name,
      v.thumbnail_url,
      v.duration_seconds,
      v.view_count,
      v.published_at,
      v.category,
      v.confidence_score,
      v.production_id,
      p.slug AS production_slug,
      p.title AS production_title,
      v.status,
      v.category_locked,
      v.notes,
      v.created_at
    FROM production_videos v
    JOIN productions p ON p.id = v.production_id
    WHERE
      ${status === 'all' ? sql`TRUE` : sql`v.status = ${status}`}
      AND ${filters.productionSlug ? sql`p.slug = ${filters.productionSlug}` : sql`TRUE`}
      AND ${filters.category && filters.category !== 'all' ? sql`v.category = ${filters.category}` : sql`TRUE`}
    ORDER BY v.confidence_score DESC, v.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

/** Counts rows matching the same filters listVideosForReview accepts (for pagination). */
export async function countVideosForReview(
  db: SeedDb = defaultDb,
  filters: ReviewFilters = {},
): Promise<number> {
  const status = filters.status ?? 'pending';
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM production_videos v
    JOIN productions p ON p.id = v.production_id
    WHERE
      ${status === 'all' ? sql`TRUE` : sql`v.status = ${status}`}
      AND ${filters.productionSlug ? sql`p.slug = ${filters.productionSlug}` : sql`TRUE`}
      AND ${filters.category && filters.category !== 'all' ? sql`v.category = ${filters.category}` : sql`TRUE`}
  `);
  return Number(row?.count ?? 0);
}

/**
 * Returns the distinct list of productions that have at least one video,
 * useful for populating the admin filter dropdown.
 */
export async function listProductionsWithVideos(
  db: SeedDb = defaultDb,
): Promise<{ slug: string; title: string }[]> {
  return db.execute<{ slug: string; title: string }>(sql`
    SELECT DISTINCT p.slug, p.title
    FROM productions p
    JOIN production_videos v ON v.production_id = p.id
    ORDER BY p.title
  `);
}

/** Updates only the status column. Does NOT touch category_locked. */
export async function updateVideoStatus(
  db: SeedDb = defaultDb,
  id: number,
  status: VideoStatus,
): Promise<void> {
  await db.execute(sql`
    UPDATE production_videos
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
  `);
}

/**
 * Sets status='rejected' AND category_locked=true. Locking the category prevents
 * the next discovery run from re-suggesting the same video in a different bucket.
 */
export async function rejectVideo(
  db: SeedDb = defaultDb,
  id: number,
): Promise<void> {
  await db.execute(sql`
    UPDATE production_videos
    SET status = 'rejected', category_locked = TRUE, updated_at = NOW()
    WHERE id = ${id}
  `);
}

/**
 * Updates category AND sets category_locked=true so future scraper runs
 * don't overwrite the operator's manual choice.
 */
export async function updateVideoCategory(
  db: SeedDb = defaultDb,
  id: number,
  category: VideoCategory,
): Promise<void> {
  await db.execute(sql`
    UPDATE production_videos
    SET category = ${category}, category_locked = TRUE, updated_at = NOW()
    WHERE id = ${id}
  `);
}

/**
 * Bulk variant of updateVideoStatus. Single UPDATE for atomicity.
 * Returns the distinct production slugs touched so the caller can revalidate.
 */
export async function bulkUpdateVideoStatus(
  db: SeedDb = defaultDb,
  ids: number[],
  status: VideoStatus,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  await db.execute(sql`
    UPDATE production_videos
    SET status = ${status}, updated_at = NOW()
    WHERE id IN (${idList})
  `);
  const rows = await db.execute<{ slug: string }>(sql`
    SELECT DISTINCT p.slug
    FROM production_videos v
    JOIN productions p ON p.id = v.production_id
    WHERE v.id IN (${idList})
  `);
  return rows.map((r) => r.slug);
}

/**
 * Bulk variant of rejectVideo. Sets status='rejected' AND category_locked=true.
 * Returns the distinct production slugs touched so the caller can revalidate.
 */
export async function bulkRejectVideos(
  db: SeedDb = defaultDb,
  ids: number[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  await db.execute(sql`
    UPDATE production_videos
    SET status = 'rejected', category_locked = TRUE, updated_at = NOW()
    WHERE id IN (${idList})
  `);
  const rows = await db.execute<{ slug: string }>(sql`
    SELECT DISTINCT p.slug
    FROM production_videos v
    JOIN productions p ON p.id = v.production_id
    WHERE v.id IN (${idList})
  `);
  return rows.map((r) => r.slug);
}

export async function listVideoTimestampAnnotationsForReview(
  db: SeedDb = defaultDb,
  filters: VideoTimestampAnnotationFilters = {},
): Promise<VideoTimestampAnnotation[]> {
  const status = filters.status ?? 'pending';
  const annotationType = filters.annotationType ?? 'all';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  return db.execute<VideoTimestampAnnotation>(sql`
    SELECT
      a.id,
      a.video_id,
      v.production_id,
      p.slug AS production_slug,
      p.title AS production_title,
      v.title AS video_title,
      v.url AS video_url,
      v.thumbnail_url,
      a.claim_id,
      c.slug AS claim_slug,
      c.statement AS claim_statement,
      a.evidence_item_id,
      a.annotation_type,
      a.review_status,
      a.start_seconds,
      a.end_seconds,
      a.label,
      a.note,
      a.created_by,
      a.created_at::text AS created_at,
      a.updated_at::text AS updated_at
    FROM production_video_timestamp_annotations a
    JOIN production_videos v ON v.id = a.video_id
    JOIN productions p ON p.id = v.production_id
    LEFT JOIN claims c ON c.id = a.claim_id
    WHERE
      ${status === 'all' ? sql`TRUE` : sql`a.review_status = ${status}::video_annotation_review_status_enum`}
      AND ${annotationType === 'all' ? sql`TRUE` : sql`a.annotation_type = ${annotationType}::video_annotation_type_enum`}
      AND ${filters.productionSlug ? sql`p.slug = ${filters.productionSlug}` : sql`TRUE`}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countVideoTimestampAnnotationsForReview(
  db: SeedDb = defaultDb,
  filters: Omit<VideoTimestampAnnotationFilters, 'limit' | 'offset'> = {},
): Promise<number> {
  const status = filters.status ?? 'pending';
  const annotationType = filters.annotationType ?? 'all';
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM production_video_timestamp_annotations a
    JOIN production_videos v ON v.id = a.video_id
    JOIN productions p ON p.id = v.production_id
    WHERE
      ${status === 'all' ? sql`TRUE` : sql`a.review_status = ${status}::video_annotation_review_status_enum`}
      AND ${annotationType === 'all' ? sql`TRUE` : sql`a.annotation_type = ${annotationType}::video_annotation_type_enum`}
      AND ${filters.productionSlug ? sql`p.slug = ${filters.productionSlug}` : sql`TRUE`}
  `);
  return Number(row?.count ?? 0);
}

export async function createVideoTimestampAnnotation(
  db: SeedDb = defaultDb,
  input: {
    videoId: number;
    claimId?: number | null;
    evidenceItemId?: number | null;
    annotationType: VideoAnnotationType;
    startSeconds: number;
    endSeconds?: number | null;
    label: string;
    note?: string | null;
    createdBy?: string | null;
  },
): Promise<number> {
  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO production_video_timestamp_annotations (
      video_id, claim_id, evidence_item_id, annotation_type,
      start_seconds, end_seconds, label, note, created_by
    )
    VALUES (
      ${input.videoId},
      ${input.claimId ?? null},
      ${input.evidenceItemId ?? null},
      ${input.annotationType}::video_annotation_type_enum,
      ${input.startSeconds},
      ${input.endSeconds ?? null},
      ${input.label},
      ${input.note ?? null},
      ${input.createdBy ?? null}
    )
    RETURNING id
  `);
  return rows[0]!.id;
}

export async function updateVideoTimestampAnnotationReviewStatus(
  db: SeedDb = defaultDb,
  id: number,
  status: VideoAnnotationReviewStatus,
): Promise<string[]> {
  await db.execute(sql`
    UPDATE production_video_timestamp_annotations
    SET review_status = ${status}::video_annotation_review_status_enum,
        updated_at = NOW()
    WHERE id = ${id}
  `);
  const rows = await db.execute<{ slug: string }>(sql`
    SELECT DISTINCT p.slug
    FROM production_video_timestamp_annotations a
    JOIN production_videos v ON v.id = a.video_id
    JOIN productions p ON p.id = v.production_id
    WHERE a.id = ${id}
  `);
  return rows.map((r) => r.slug);
}

export async function listVideoTimestampAnnotationsForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<VideoTimestampAnnotation[]> {
  const [production] = await db.execute<{ slug: string }>(sql`
    SELECT slug FROM productions WHERE id = ${productionId}
  `);
  if (!production) return [];
  return listVideoTimestampAnnotationsForReview(db, {
    status: 'reviewed',
    productionSlug: production.slug,
    limit: 500,
  });
}
