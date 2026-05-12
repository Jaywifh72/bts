import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

export type EvidenceKind =
  | 'video_timestamp'
  | 'video_still'
  | 'article_quote'
  | 'image_crop'
  | 'pdf_page'
  | 'social_post'
  | 'manual_editor_note';

export type EvidenceReviewStatus = 'pending' | 'reviewed' | 'rejected';

export type EvidenceItem = {
  id: number;
  claim_id: number;
  source_id: number | null;
  source_title: string | null;
  kind: EvidenceKind;
  review_status: EvidenceReviewStatus;
  thumbnail_url: string | null;
  asset_url: string | null;
  caption: string | null;
  rights_note: string | null;
  created_by: string | null;
  timestamp_seconds: number | null;
  page_number: number | null;
  created_at: string;
  updated_at: string;
};

export type EvidenceReviewRow = EvidenceItem & {
  claim_slug: string;
  claim_statement: string;
  production_slug: string | null;
  production_title: string | null;
};

const evidenceSelect = sql`
  ei.id,
  ei.claim_id,
  ei.source_id,
  s.title AS source_title,
  ei.kind,
  ei.review_status,
  ei.thumbnail_url,
  ei.asset_url,
  ei.caption,
  ei.rights_note,
  ei.created_by,
  ei.timestamp_seconds,
  ei.page_number,
  ei.created_at::text AS created_at,
  ei.updated_at::text AS updated_at
`;

export async function getEvidenceForClaim(
  db: SeedDb = defaultDb,
  claimId: number,
): Promise<EvidenceItem[]> {
  return db.execute<EvidenceItem>(sql`
    SELECT ${evidenceSelect}
    FROM evidence_items ei
    LEFT JOIN sources s ON s.id = ei.source_id
    WHERE ei.claim_id = ${claimId}
      AND ei.review_status <> 'rejected'
    ORDER BY
      CASE ei.review_status WHEN 'reviewed' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
      ei.created_at DESC,
      ei.id DESC
  `);
}

export async function getEvidenceForClaims(
  db: SeedDb = defaultDb,
  claimIds: readonly number[],
): Promise<Record<number, EvidenceItem[]>> {
  if (claimIds.length === 0) return {};
  const idList = sql.join(claimIds.map((id) => sql`${id}`), sql`, `);
  const rows = await db.execute<EvidenceItem>(sql`
    SELECT ${evidenceSelect}
    FROM evidence_items ei
    LEFT JOIN sources s ON s.id = ei.source_id
    WHERE ei.claim_id IN (${idList})
      AND ei.review_status <> 'rejected'
    ORDER BY
      ei.claim_id,
      CASE ei.review_status WHEN 'reviewed' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
      ei.created_at DESC,
      ei.id DESC
  `);
  return rows.reduce<Record<number, EvidenceItem[]>>((acc, row) => {
    (acc[row.claim_id] ??= []).push(row);
    return acc;
  }, {});
}

export async function getEvidenceForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<EvidenceItem[]> {
  return db.execute<EvidenceItem>(sql`
    SELECT ${evidenceSelect}
    FROM evidence_items ei
    LEFT JOIN sources s ON s.id = ei.source_id
    WHERE ei.review_status <> 'rejected'
      AND (
        EXISTS (
          SELECT 1 FROM claim_entities ce
          WHERE ce.claim_id = ei.claim_id
            AND ce.entity_type = 'production'
            AND ce.entity_id = ${productionId}
        )
        OR EXISTS (
          SELECT 1
          FROM claim_entities ce
          JOIN scenes sc ON sc.id = ce.entity_id
          WHERE ce.claim_id = ei.claim_id
            AND ce.entity_type = 'scene'
            AND sc.production_id = ${productionId}
        )
      )
    ORDER BY ei.created_at DESC, ei.id DESC
  `);
}

export async function listEvidenceForReview(
  db: SeedDb = defaultDb,
  filter: {
    status?: EvidenceReviewStatus | 'all';
    limit?: number;
    offset?: number;
  } = {},
): Promise<EvidenceReviewRow[]> {
  const status = filter.status ?? 'pending';
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;
  return db.execute<EvidenceReviewRow>(sql`
    SELECT
      ${evidenceSelect},
      c.slug AS claim_slug,
      c.statement AS claim_statement,
      p.slug AS production_slug,
      p.title AS production_title
    FROM evidence_items ei
    JOIN claims c ON c.id = ei.claim_id
    LEFT JOIN sources s ON s.id = ei.source_id
    LEFT JOIN LATERAL (
      SELECT pp.slug, pp.title
      FROM claim_entities ce
      JOIN productions pp ON pp.id = ce.entity_id
      WHERE ce.claim_id = ei.claim_id
        AND ce.entity_type = 'production'
      ORDER BY pp.title
      LIMIT 1
    ) p ON TRUE
    WHERE ${status === 'all' ? sql`TRUE` : sql`ei.review_status = ${status}::evidence_review_status_enum`}
    ORDER BY ei.created_at DESC, ei.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countEvidenceForReview(
  db: SeedDb = defaultDb,
  status: EvidenceReviewStatus | 'all' = 'pending',
): Promise<number> {
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM evidence_items ei
    WHERE ${status === 'all' ? sql`TRUE` : sql`ei.review_status = ${status}::evidence_review_status_enum`}
  `);
  return Number(row?.count ?? 0);
}

export async function createEvidenceItem(
  db: SeedDb = defaultDb,
  input: {
    claimId: number;
    sourceId?: number | null;
    kind: EvidenceKind;
    reviewStatus?: EvidenceReviewStatus;
    thumbnailUrl?: string | null;
    assetUrl?: string | null;
    caption?: string | null;
    rightsNote?: string | null;
    createdBy?: string | null;
    timestampSeconds?: number | null;
    pageNumber?: number | null;
  },
): Promise<number> {
  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO evidence_items (
      claim_id, source_id, kind, review_status, thumbnail_url, asset_url,
      caption, rights_note, created_by, timestamp_seconds, page_number
    )
    VALUES (
      ${input.claimId},
      ${input.sourceId ?? null},
      ${input.kind}::evidence_kind_enum,
      ${input.reviewStatus ?? 'pending'}::evidence_review_status_enum,
      ${input.thumbnailUrl ?? null},
      ${input.assetUrl ?? null},
      ${input.caption ?? null},
      ${input.rightsNote ?? null},
      ${input.createdBy ?? null},
      ${input.timestampSeconds ?? null},
      ${input.pageNumber ?? null}
    )
    RETURNING id
  `);
  return rows[0]!.id;
}

export async function updateEvidenceReviewStatus(
  db: SeedDb = defaultDb,
  id: number,
  status: EvidenceReviewStatus,
): Promise<void> {
  await db.execute(sql`
    UPDATE evidence_items
    SET review_status = ${status}::evidence_review_status_enum,
        updated_at = NOW()
    WHERE id = ${id}
  `);
}
