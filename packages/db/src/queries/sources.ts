import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

export type SourceHealthFilter =
  | 'all'
  | 'unchecked'
  | 'stale'
  | 'rotted'
  | 'paywalled'
  | 'missing_archive';

export type SourceHealthRow = {
  id: number;
  slug: string;
  kind: string;
  title: string;
  publication: string | null;
  url: string | null;
  archive_url: string | null;
  canonical_url: string | null;
  last_checked_at: string | null;
  last_status: number | null;
  content_hash: string | null;
  paywall_status: string;
  archive_status: string;
  claim_count: number;
};

function sourceHealthWhere(filter: SourceHealthFilter) {
  switch (filter) {
    case 'unchecked':
      return sql`s.url IS NOT NULL AND s.last_checked_at IS NULL`;
    case 'stale':
      return sql`s.url IS NOT NULL AND (s.last_checked_at IS NULL OR s.last_checked_at < NOW() - INTERVAL '30 days')`;
    case 'rotted':
      return sql`s.url IS NOT NULL AND (s.last_status = 0 OR s.last_status >= 400)`;
    case 'paywalled':
      return sql`s.paywall_status IN ('soft_paywall', 'hard_paywall', 'login_required')`;
    case 'missing_archive':
      return sql`s.url IS NOT NULL AND s.archive_url IS NULL AND s.archive_status IN ('unknown', 'missing', 'failed')`;
    case 'all':
    default:
      return sql`TRUE`;
  }
}

export async function listSourcesForHealthReview(
  db: SeedDb = defaultDb,
  filter: {
    status?: SourceHealthFilter;
    limit?: number;
    offset?: number;
  } = {},
): Promise<SourceHealthRow[]> {
  const status = filter.status ?? 'stale';
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;

  return db.execute<SourceHealthRow>(sql`
    SELECT
      s.id,
      s.slug,
      s.kind,
      s.title,
      s.publication,
      s.url,
      s.archive_url,
      s.canonical_url,
      s.last_checked_at::text AS last_checked_at,
      s.last_status,
      s.content_hash,
      s.paywall_status,
      s.archive_status,
      COUNT(DISTINCT cs.claim_id)::int AS claim_count
    FROM sources s
    LEFT JOIN claim_sources cs ON cs.source_id = s.id
    WHERE ${sourceHealthWhere(status)}
    GROUP BY s.id
    ORDER BY
      CASE
        WHEN s.url IS NOT NULL AND (s.last_status = 0 OR s.last_status >= 400) THEN 1
        WHEN s.url IS NOT NULL AND s.last_checked_at IS NULL THEN 2
        WHEN s.url IS NOT NULL AND s.last_checked_at < NOW() - INTERVAL '30 days' THEN 3
        ELSE 4
      END,
      s.last_checked_at ASC NULLS FIRST,
      s.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countSourcesForHealthReview(
  db: SeedDb = defaultDb,
  status: SourceHealthFilter = 'stale',
): Promise<number> {
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM sources s
    WHERE ${sourceHealthWhere(status)}
  `);
  return Number(row?.count ?? 0);
}

export async function countSourceHealthWarnings(db: SeedDb = defaultDb): Promise<number> {
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM sources s
    WHERE s.url IS NOT NULL
      AND (
        s.last_checked_at IS NULL
        OR s.last_checked_at < NOW() - INTERVAL '30 days'
        OR s.last_status = 0
        OR s.last_status >= 400
        OR (s.archive_url IS NULL AND s.archive_status IN ('unknown', 'missing', 'failed'))
      )
  `);
  return Number(row?.count ?? 0);
}

export async function updateSourceHealthMetadata(
  db: SeedDb = defaultDb,
  id: number,
  input: {
    canonicalUrl?: string | null;
    contentHash?: string | null;
    paywallStatus?: string | null;
    archiveStatus?: string | null;
    archiveUrl?: string | null;
  },
): Promise<void> {
  await db.execute(sql`
    UPDATE sources
    SET canonical_url = COALESCE(${input.canonicalUrl ?? null}, canonical_url),
        content_hash = COALESCE(${input.contentHash ?? null}, content_hash),
        paywall_status = COALESCE(${input.paywallStatus ?? null}, paywall_status),
        archive_status = COALESCE(${input.archiveStatus ?? null}, archive_status),
        archive_url = COALESCE(${input.archiveUrl ?? null}, archive_url),
        updated_at = NOW()
    WHERE id = ${id}
  `);
}
