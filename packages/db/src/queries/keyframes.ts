import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type KeyFrame = {
  id: number;
  image_url: string;
  caption: string | null;
  scene_slug: string | null;
  scene_title: string | null;
  sort_order: number;
  /** E-29: dominant colors as hex strings, most-dominant first; null when not yet extracted. */
  palette: string[] | null;
};

/**
 * Lists curated key frames for a production, sorted by sort_order ASC.
 * Empty array when none. Joins to scenes when scene_id is set so the
 * caller can render a "from scene <slug>" tag without a second query.
 */
export async function getProductionKeyFrames(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<KeyFrame[]> {
  return db.execute<KeyFrame>(sql`
    SELECT
      kf.id,
      kf.image_url,
      kf.caption,
      sc.slug AS scene_slug,
      sc.title AS scene_title,
      kf.sort_order,
      kf.palette
    FROM production_keyframes kf
    LEFT JOIN scenes sc ON sc.id = kf.scene_id
    WHERE kf.production_id = ${productionId}
    ORDER BY kf.sort_order, kf.id
  `);
}

export type AdminKeyFrameRow = KeyFrame & { production_id: number };

/**
 * Lists all key frames across productions for the admin UI, joined with
 * production slug + title for grouping. Sorted newest-first so freshly
 * added frames surface at the top.
 */
export async function listAllKeyFrames(
  db: SeedDb = defaultDb,
  productionSlug?: string,
): Promise<Array<AdminKeyFrameRow & { production_slug: string; production_title: string }>> {
  return db.execute<AdminKeyFrameRow & { production_slug: string; production_title: string }>(sql`
    SELECT
      kf.id, kf.image_url, kf.caption,
      sc.slug AS scene_slug, sc.title AS scene_title,
      kf.sort_order, kf.production_id,
      p.slug AS production_slug, p.title AS production_title
    FROM production_keyframes kf
    JOIN productions p ON p.id = kf.production_id
    LEFT JOIN scenes sc ON sc.id = kf.scene_id
    WHERE ${productionSlug ? sql`p.slug = ${productionSlug}` : sql`TRUE`}
    ORDER BY p.title, kf.sort_order, kf.id
  `);
}

export async function insertKeyFrame(
  db: SeedDb = defaultDb,
  input: {
    productionSlug: string;
    imageUrl: string;
    caption?: string | null;
    sortOrder?: number;
  },
): Promise<number> {
  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO production_keyframes (production_id, image_url, caption, sort_order)
    SELECT id, ${input.imageUrl}, ${input.caption ?? null}, ${input.sortOrder ?? 0}
    FROM productions WHERE slug = ${input.productionSlug}
    RETURNING id
  `);
  if (!rows[0]) throw new Error(`Production not found: ${input.productionSlug}`);
  return rows[0].id;
}

export async function deleteKeyFrame(db: SeedDb = defaultDb, id: number): Promise<void> {
  await db.execute(sql`DELETE FROM production_keyframes WHERE id = ${id}`);
}

export type DuplicateKeyFramePair = {
  a_id: number;
  b_id: number;
  a_production: string;
  b_production: string;
  a_url: string;
  b_url: string;
  hamming_distance: number;
};

export type SimilarKeyFrame = {
  id: number;
  image_url: string;
  caption: string | null;
  production_slug: string;
  production_title: string;
  scene_slug: string | null;
  scene_title: string | null;
  similarity: number;
};

/**
 * UX-audit second pass — visually-similar shots for an entire
 * production. Picks the production's representative keyframe (lowest
 * sort_order, populated embedding) and runs the existing
 * getVisuallySimilarKeyFrames against it, filtering out same-production
 * results. Powers the "visually similar shots" rail on film detail.
 */
export async function getSimilarKeyFramesForProduction(
  db: SeedDb = defaultDb,
  productionSlug: string,
  limit: number = 6,
): Promise<SimilarKeyFrame[]> {
  return db.execute<SimilarKeyFrame>(sql`
    WITH src AS (
      SELECT kf.embedding
      FROM production_keyframes kf
      JOIN productions p ON p.id = kf.production_id
      WHERE p.slug = ${productionSlug}
        AND kf.embedding IS NOT NULL
      ORDER BY kf.sort_order, kf.id
      LIMIT 1
    )
    SELECT
      kf.id, kf.image_url, kf.caption,
      p.slug AS production_slug, p.title AS production_title,
      sc.slug AS scene_slug, sc.title AS scene_title,
      1 - (kf.embedding <=> (SELECT embedding FROM src))::float AS similarity
    FROM production_keyframes kf
    JOIN productions p ON p.id = kf.production_id
    LEFT JOIN scenes sc ON sc.id = kf.scene_id
    WHERE p.slug <> ${productionSlug}
      AND kf.embedding IS NOT NULL
      AND EXISTS (SELECT 1 FROM src)
    ORDER BY kf.embedding <=> (SELECT embedding FROM src)
    LIMIT ${limit}
  `);
}

/**
 * E-28 — visually-similar key frames by cosine-distance on the
 * pgvector `embedding` column. `<=>` returns cosine distance (0 =
 * identical, 2 = opposite); we expose `1 - distance` as similarity
 * so callers can treat the value like a confidence (1.0 = same).
 * The HNSW index makes this an ANN scan. Returns up to `limit` rows
 * excluding the source keyframe.
 */
export async function getVisuallySimilarKeyFrames(
  db: SeedDb = defaultDb,
  keyframeId: number,
  limit: number = 6,
): Promise<SimilarKeyFrame[]> {
  return db.execute<SimilarKeyFrame>(sql`
    WITH src AS (
      SELECT embedding FROM production_keyframes
      WHERE id = ${keyframeId} AND embedding IS NOT NULL
    )
    SELECT
      kf.id, kf.image_url, kf.caption,
      p.slug AS production_slug, p.title AS production_title,
      sc.slug AS scene_slug, sc.title AS scene_title,
      1 - (kf.embedding <=> (SELECT embedding FROM src))::float AS similarity
    FROM production_keyframes kf
    JOIN productions p ON p.id = kf.production_id
    LEFT JOIN scenes sc ON sc.id = kf.scene_id
    WHERE kf.id <> ${keyframeId}
      AND kf.embedding IS NOT NULL
      AND EXISTS (SELECT 1 FROM src)
    ORDER BY kf.embedding <=> (SELECT embedding FROM src)
    LIMIT ${limit}
  `);
}

/**
 * E-30 — find near-duplicate key frames by Hamming distance on the pHash
 * column. Pairs are returned where a.id < b.id so each pair appears
 * exactly once. `bit_count(a # b)` is XOR + popcount on signed bigint
 * — Postgres handles the sign correctly because the operations are
 * bitwise.
 *
 * Default threshold of 5 catches near-identical frames (same shot,
 * same crop, minor JPEG re-encode); raise to 10 for "same scene
 * different framing" matches.
 */
export async function findDuplicateKeyFrames(
  db: SeedDb = defaultDb,
  threshold: number = 5,
): Promise<DuplicateKeyFramePair[]> {
  return db.execute<DuplicateKeyFramePair>(sql`
    SELECT
      a.id AS a_id, b.id AS b_id,
      pa.slug AS a_production, pb.slug AS b_production,
      a.image_url AS a_url, b.image_url AS b_url,
      bit_count((a.phash # b.phash)::bit(64)) AS hamming_distance
    FROM production_keyframes a
    JOIN production_keyframes b ON b.id > a.id AND b.phash IS NOT NULL
    JOIN productions pa ON pa.id = a.production_id
    JOIN productions pb ON pb.id = b.production_id
    WHERE a.phash IS NOT NULL
      AND bit_count((a.phash # b.phash)::bit(64)) <= ${threshold}
    ORDER BY hamming_distance ASC, a.id, b.id
  `);
}

/**
 * E-49 — pick a deterministic "shot of the day" by hashing today's
 * date into the keyframe set. Same day → same shot; next day rotates.
 * No randomness so the homepage and any social-share path agree.
 */
/**
 * UX-audit (homepage Move 3) — N keyframes rotating on a daily key. A
 * wall, not a single hero. Each shot rotates predictably so the page
 * cache (revalidate=3600) stays warm but the content shifts each day.
 */
export async function getShotsOfTheDay(
  db: SeedDb = defaultDb,
  dayKey: string,
  count: number,
): Promise<Array<KeyFrame & { production_slug: string; production_title: string }>> {
  return db.execute<KeyFrame & { production_slug: string; production_title: string }>(sql`
    WITH ordered AS (
      SELECT kf.id, kf.image_url, kf.caption,
             sc.slug AS scene_slug, sc.title AS scene_title,
             kf.sort_order, kf.palette,
             p.slug AS production_slug, p.title AS production_title,
             ROW_NUMBER() OVER (ORDER BY kf.id) - 1 AS idx,
             COUNT(*) OVER () AS total
      FROM production_keyframes kf
      JOIN productions p ON p.id = kf.production_id
      LEFT JOIN scenes sc ON sc.id = kf.scene_id
    ),
    seeded AS (
      SELECT *,
             -- Offset relative to today's hash; rows whose offset is
             -- less than count are in today's window. Modular over total
             -- so the window wraps cleanly.
             ((idx - (ABS(hashtext(${dayKey})) % NULLIF(total, 0))) + total) % NULLIF(total, 0) AS rotated_idx
      FROM ordered
      WHERE total > 0
    )
    SELECT id, image_url, caption, scene_slug, scene_title, sort_order, palette,
           production_slug, production_title
    FROM seeded
    WHERE rotated_idx < ${count}
    ORDER BY rotated_idx
  `);
}

export async function getShotOfTheDay(
  db: SeedDb = defaultDb,
  dayKey: string,
): Promise<(KeyFrame & { production_slug: string; production_title: string }) | null> {
  const [row] = await db.execute<KeyFrame & { production_slug: string; production_title: string }>(sql`
    WITH ordered AS (
      SELECT kf.id, kf.image_url, kf.caption,
             sc.slug AS scene_slug, sc.title AS scene_title,
             kf.sort_order, kf.palette,
             p.slug AS production_slug, p.title AS production_title,
             ROW_NUMBER() OVER (ORDER BY kf.id) - 1 AS idx,
             COUNT(*) OVER () AS total
      FROM production_keyframes kf
      JOIN productions p ON p.id = kf.production_id
      LEFT JOIN scenes sc ON sc.id = kf.scene_id
    )
    SELECT id, image_url, caption, scene_slug, scene_title, sort_order, palette,
           production_slug, production_title
    FROM ordered
    WHERE total > 0
      AND idx = (ABS(hashtext(${dayKey})) % total)
    LIMIT 1
  `);
  return row ?? null;
}
