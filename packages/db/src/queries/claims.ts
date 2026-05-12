import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

export type ClaimType =
  | 'production_camera'
  | 'production_lens'
  | 'production_filter'
  | 'production_format'
  | 'production_lighting'
  | 'production_color_pipeline'
  | 'production_post_house'
  | 'production_vfx_house'
  | 'production_vfx_sequence'
  | 'scene_camera'
  | 'scene_lens'
  | 'scene_lighting'
  | 'scene_vfx'
  | 'scene_location'
  | 'gear_spec'
  | 'person_credit'
  | 'video_evidence'
  | 'general_bts_fact';

export type ClaimStatus =
  | 'candidate'
  | 'needs_source'
  | 'sourced'
  | 'reviewed'
  | 'verified'
  | 'disputed'
  | 'deprecated'
  | 'rejected';

export type ClaimConfidence =
  | 'primary'
  | 'secondary'
  | 'manufacturer'
  | 'rental_house'
  | 'bts_visual'
  | 'inferred'
  | 'speculative'
  | 'conflicting';

export type ClaimEntityType =
  | 'production'
  | 'scene'
  | 'person'
  | 'role'
  | 'equipment_manufacturer'
  | 'equipment_series'
  | 'equipment_item'
  | 'vfx_house'
  | 'source'
  | 'video'
  | 'post_house'
  | 'location';

export type ClaimConflictKind =
  | 'direct_conflict'
  | 'partial_conflict'
  | 'stale_source'
  | 'duplicate'
  | 'scope_mismatch';

export type ClaimConflictResolutionStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type ClaimRow = {
  id: number;
  slug: string;
  claim_type: ClaimType;
  statement: string;
  normalized_statement: string;
  status: ClaimStatus;
  confidence: ClaimConfidence;
  editorial_note: string | null;
  created_at: string;
  updated_at: string;
  last_verified_at: string | null;
  verified_by: string | null;
  source_count: number;
};

export type ClaimReviewRow = ClaimRow & {
  production_slug: string | null;
  production_title: string | null;
};

export type ClaimSourceRow = {
  id: number;
  claim_id?: number;
  source_id: number;
  title: string;
  publication: string | null;
  author: string | null;
  published_at: string | null;
  url: string | null;
  archive_url: string | null;
  canonical_url: string | null;
  last_checked_at: string | null;
  last_status: number | null;
  paywall_status: string;
  archive_status: string;
  confidence: ClaimConfidence;
  quote: string | null;
  timestamp_seconds: number | null;
  page_number: number | null;
  url_fragment: string | null;
  editorial_note: string | null;
};

export type ClaimEntityRow = {
  id: number;
  entity_type: ClaimEntityType;
  entity_id: number;
  entity_slug: string | null;
};

export type ClaimConflictRow = {
  id: number;
  claim_a_id: number;
  claim_b_id: number;
  other_claim_id: number;
  other_claim_slug: string;
  other_statement: string;
  conflict_kind: ClaimConflictKind;
  resolution_status: ClaimConflictResolutionStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
};

export type ClaimDetail = ClaimRow & {
  sources: ClaimSourceRow[];
  entities: ClaimEntityRow[];
  conflicts: ClaimConflictRow[];
};

function normalizeStatement(statement: string): string {
  return statement.trim().replace(/\s+/g, ' ').toLowerCase();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildClaimSlug(claimType: ClaimType, statement: string): string {
  return `${claimType}-${slugify(statement)}`;
}

const claimSelect = sql`
  c.id,
  c.slug,
  c.claim_type,
  c.statement,
  c.normalized_statement,
  c.status,
  c.confidence,
  c.editorial_note,
  c.created_at::text AS created_at,
  c.updated_at::text AS updated_at,
  c.last_verified_at::text AS last_verified_at,
  c.verified_by,
  COUNT(DISTINCT cs.id)::int AS source_count
`;

function statusFilter(status?: ClaimStatus | 'all') {
  return !status || status === 'all'
    ? sql`TRUE`
    : sql`c.status = ${status}::claim_status_enum`;
}

function typeFilter(claimType?: ClaimType | 'all') {
  return !claimType || claimType === 'all'
    ? sql`TRUE`
    : sql`c.claim_type = ${claimType}::claim_type_enum`;
}

export async function getClaimsForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ClaimRow[]> {
  return db.execute<ClaimRow>(sql`
    SELECT ${claimSelect}
    FROM claims c
    LEFT JOIN claim_sources cs ON cs.claim_id = c.id
    WHERE EXISTS (
      SELECT 1 FROM claim_entities ce
      WHERE ce.claim_id = c.id
        AND ce.entity_type = 'production'
        AND ce.entity_id = ${productionId}
    )
    OR EXISTS (
      SELECT 1
      FROM claim_entities ce
      JOIN scenes sc ON sc.id = ce.entity_id
      WHERE ce.claim_id = c.id
        AND ce.entity_type = 'scene'
        AND sc.production_id = ${productionId}
    )
    GROUP BY c.id
    ORDER BY
      CASE c.status
        WHEN 'verified' THEN 1
        WHEN 'reviewed' THEN 2
        WHEN 'sourced' THEN 3
        WHEN 'candidate' THEN 4
        WHEN 'needs_source' THEN 5
        WHEN 'disputed' THEN 6
        WHEN 'deprecated' THEN 7
        WHEN 'rejected' THEN 8
      END,
      c.updated_at DESC,
      c.id DESC
  `);
}

export async function getClaimsForScene(
  db: SeedDb = defaultDb,
  sceneId: number,
): Promise<ClaimRow[]> {
  return getClaimsForEntity(db, 'scene', sceneId);
}

export async function getClaimsForGear(
  db: SeedDb = defaultDb,
  input: {
    manufacturerId?: number;
    seriesId?: number;
    itemId?: number;
  },
): Promise<ClaimRow[]> {
  const clauses = [
    input.manufacturerId
      ? sql`(ce.entity_type = 'equipment_manufacturer' AND ce.entity_id = ${input.manufacturerId})`
      : null,
    input.seriesId
      ? sql`(ce.entity_type = 'equipment_series' AND ce.entity_id = ${input.seriesId})`
      : null,
    input.itemId
      ? sql`(ce.entity_type = 'equipment_item' AND ce.entity_id = ${input.itemId})`
      : null,
  ].filter((clause): clause is NonNullable<typeof clause> => clause !== null);

  if (clauses.length === 0) return [];
  const where = sql.join(clauses, sql` OR `);
  return db.execute<ClaimRow>(sql`
    SELECT ${claimSelect}
    FROM claims c
    JOIN claim_entities ce ON ce.claim_id = c.id
    LEFT JOIN claim_sources cs ON cs.claim_id = c.id
    WHERE ${where}
    GROUP BY c.id
    ORDER BY c.updated_at DESC, c.id DESC
  `);
}

export async function getClaimsForPerson(
  db: SeedDb = defaultDb,
  personId: number,
): Promise<ClaimRow[]> {
  return getClaimsForEntity(db, 'person', personId);
}

export async function getClaimsForVfxHouse(
  db: SeedDb = defaultDb,
  vfxHouseId: number,
): Promise<ClaimRow[]> {
  return getClaimsForEntity(db, 'vfx_house', vfxHouseId);
}

async function getClaimsForEntity(
  db: SeedDb,
  entityType: ClaimEntityType,
  entityId: number,
): Promise<ClaimRow[]> {
  return db.execute<ClaimRow>(sql`
    SELECT ${claimSelect}
    FROM claims c
    JOIN claim_entities ce ON ce.claim_id = c.id
    LEFT JOIN claim_sources cs ON cs.claim_id = c.id
    WHERE ce.entity_type = ${entityType}::claim_entity_type_enum
      AND ce.entity_id = ${entityId}
    GROUP BY c.id
    ORDER BY c.updated_at DESC, c.id DESC
  `);
}

export async function getClaimSources(
  db: SeedDb = defaultDb,
  claimId: number,
): Promise<ClaimSourceRow[]> {
  return db.execute<ClaimSourceRow>(sql`
    SELECT
      cs.id,
      cs.source_id,
      s.title,
      s.publication,
      s.author,
      s.published_at::text AS published_at,
      s.url,
      s.archive_url,
      s.canonical_url,
      s.last_checked_at::text AS last_checked_at,
      s.last_status,
      s.paywall_status,
      s.archive_status,
      cs.confidence,
      cs.quote,
      cs.timestamp_seconds,
      cs.page_number,
      cs.url_fragment,
      cs.editorial_note
    FROM claim_sources cs
    JOIN sources s ON s.id = cs.source_id
    WHERE cs.claim_id = ${claimId}
    ORDER BY
      CASE cs.confidence
        WHEN 'primary' THEN 1
        WHEN 'secondary' THEN 2
        WHEN 'manufacturer' THEN 3
        WHEN 'rental_house' THEN 4
        WHEN 'bts_visual' THEN 5
        WHEN 'inferred' THEN 6
        WHEN 'speculative' THEN 7
        WHEN 'conflicting' THEN 8
      END,
      s.published_at DESC NULLS LAST,
      s.id
  `);
}

export async function getSourcesForClaims(
  db: SeedDb = defaultDb,
  claimIds: readonly number[],
): Promise<Record<number, ClaimSourceRow[]>> {
  if (claimIds.length === 0) return {};
  const idList = sql.join(claimIds.map((id) => sql`${id}`), sql`, `);
  const rows = await db.execute<ClaimSourceRow & { claim_id: number }>(sql`
    SELECT
      cs.claim_id,
      cs.id,
      cs.source_id,
      s.title,
      s.publication,
      s.author,
      s.published_at::text AS published_at,
      s.url,
      s.archive_url,
      s.canonical_url,
      s.last_checked_at::text AS last_checked_at,
      s.last_status,
      s.paywall_status,
      s.archive_status,
      cs.confidence,
      cs.quote,
      cs.timestamp_seconds,
      cs.page_number,
      cs.url_fragment,
      cs.editorial_note
    FROM claim_sources cs
    JOIN sources s ON s.id = cs.source_id
    WHERE cs.claim_id IN (${idList})
    ORDER BY
      cs.claim_id,
      CASE cs.confidence
        WHEN 'primary' THEN 1
        WHEN 'secondary' THEN 2
        WHEN 'manufacturer' THEN 3
        WHEN 'rental_house' THEN 4
        WHEN 'bts_visual' THEN 5
        WHEN 'inferred' THEN 6
        WHEN 'speculative' THEN 7
        WHEN 'conflicting' THEN 8
      END,
      s.published_at DESC NULLS LAST,
      s.id
  `);
  return rows.reduce<Record<number, ClaimSourceRow[]>>((acc, row) => {
    (acc[row.claim_id] ??= []).push(row);
    return acc;
  }, {});
}

export async function getClaimDetail(
  db: SeedDb = defaultDb,
  slugOrId: string | number,
): Promise<ClaimDetail | null> {
  const rows = await db.execute<ClaimRow>(sql`
    SELECT ${claimSelect}
    FROM claims c
    LEFT JOIN claim_sources cs ON cs.claim_id = c.id
    WHERE ${typeof slugOrId === 'number' ? sql`c.id = ${slugOrId}` : sql`c.slug = ${slugOrId}`}
    GROUP BY c.id
  `);
  const claim = rows[0];
  if (!claim) return null;

  const [sources, entities, conflicts] = await Promise.all([
    getClaimSources(db, claim.id),
    db.execute<ClaimEntityRow>(sql`
      SELECT id, entity_type, entity_id, entity_slug
      FROM claim_entities
      WHERE claim_id = ${claim.id}
      ORDER BY entity_type, entity_id
    `),
    db.execute<ClaimConflictRow>(sql`
      SELECT
        cc.id,
        cc.claim_a_id,
        cc.claim_b_id,
        CASE WHEN cc.claim_a_id = ${claim.id} THEN cc.claim_b_id ELSE cc.claim_a_id END AS other_claim_id,
        oc.slug AS other_claim_slug,
        oc.statement AS other_statement,
        cc.conflict_kind,
        cc.resolution_status,
        cc.resolution_note,
        cc.resolved_by,
        cc.resolved_at::text AS resolved_at
      FROM claim_conflicts cc
      JOIN claims oc
        ON oc.id = CASE WHEN cc.claim_a_id = ${claim.id} THEN cc.claim_b_id ELSE cc.claim_a_id END
      WHERE cc.claim_a_id = ${claim.id} OR cc.claim_b_id = ${claim.id}
      ORDER BY cc.created_at DESC
    `),
  ]);

  return { ...claim, sources, entities, conflicts };
}

export async function listClaimsForReview(
  db: SeedDb = defaultDb,
  filter: {
    status?: ClaimStatus | 'all';
    claimType?: ClaimType | 'all';
    limit?: number;
    offset?: number;
  } = {},
): Promise<ClaimReviewRow[]> {
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;
  return db.execute<ClaimReviewRow>(sql`
    SELECT
      ${claimSelect},
      p.slug AS production_slug,
      p.title AS production_title
    FROM claims c
    LEFT JOIN claim_sources cs ON cs.claim_id = c.id
    LEFT JOIN LATERAL (
      SELECT pp.slug, pp.title
      FROM claim_entities ce
      JOIN productions pp ON pp.id = ce.entity_id
      WHERE ce.claim_id = c.id
        AND ce.entity_type = 'production'
      ORDER BY pp.title
      LIMIT 1
    ) p ON TRUE
    WHERE ${statusFilter(filter.status)}
      AND ${typeFilter(filter.claimType)}
    GROUP BY c.id, p.slug, p.title
    ORDER BY
      CASE c.status
        WHEN 'needs_source' THEN 1
        WHEN 'candidate' THEN 2
        WHEN 'sourced' THEN 3
        WHEN 'reviewed' THEN 4
        WHEN 'disputed' THEN 5
        WHEN 'verified' THEN 6
        WHEN 'deprecated' THEN 7
        WHEN 'rejected' THEN 8
      END,
      c.updated_at DESC,
      c.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countClaimsForReview(
  db: SeedDb = defaultDb,
  filter: {
    status?: ClaimStatus | 'all';
    claimType?: ClaimType | 'all';
  } = {},
): Promise<number> {
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM claims c
    WHERE ${statusFilter(filter.status)}
      AND ${typeFilter(filter.claimType)}
  `);
  return Number(row?.count ?? 0);
}

export async function createClaim(
  db: SeedDb = defaultDb,
  input: {
    slug?: string;
    claimType: ClaimType;
    statement: string;
    normalizedStatement?: string;
    status?: ClaimStatus;
    confidence?: ClaimConfidence;
    editorialNote?: string | null;
    lastVerifiedAt?: string | null;
    verifiedBy?: string | null;
  },
): Promise<number> {
  const normalized = input.normalizedStatement ?? normalizeStatement(input.statement);
  const slug = input.slug ?? buildClaimSlug(input.claimType, normalized);
  const status = input.status ?? 'candidate';
  const confidence = input.confidence ?? 'inferred';
  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO claims (
      slug, claim_type, statement, normalized_statement,
      status, confidence, editorial_note, last_verified_at, verified_by
    )
    VALUES (
      ${slug},
      ${input.claimType}::claim_type_enum,
      ${input.statement},
      ${normalized},
      ${status}::claim_status_enum,
      ${confidence}::claim_confidence_enum,
      ${input.editorialNote ?? null},
      ${input.lastVerifiedAt ?? null},
      ${input.verifiedBy ?? null}
    )
    ON CONFLICT (slug) DO UPDATE
      SET statement = EXCLUDED.statement,
          normalized_statement = EXCLUDED.normalized_statement,
          status = EXCLUDED.status,
          confidence = EXCLUDED.confidence,
          editorial_note = EXCLUDED.editorial_note,
          last_verified_at = COALESCE(EXCLUDED.last_verified_at, claims.last_verified_at),
          verified_by = COALESCE(EXCLUDED.verified_by, claims.verified_by),
          updated_at = NOW()
    RETURNING id
  `);
  return rows[0]!.id;
}

export async function updateClaimStatus(
  db: SeedDb = defaultDb,
  id: number,
  status: ClaimStatus,
  options: {
    verifiedBy?: string | null;
    editorialNote?: string | null;
  } = {},
): Promise<void> {
  await db.execute(sql`
    UPDATE claims
    SET status = ${status}::claim_status_enum,
        verified_by = COALESCE(${options.verifiedBy ?? null}, verified_by),
        editorial_note = COALESCE(${options.editorialNote ?? null}, editorial_note),
        last_verified_at = CASE
          WHEN ${status}::claim_status_enum = 'verified' THEN NOW()
          ELSE last_verified_at
        END,
        updated_at = NOW()
    WHERE id = ${id}
  `);
}

export async function attachClaimSource(
  db: SeedDb = defaultDb,
  input: {
    claimId: number;
    sourceId: number;
    confidence: ClaimConfidence;
    quote?: string | null;
    timestampSeconds?: number | null;
    pageNumber?: number | null;
    urlFragment?: string | null;
    editorialNote?: string | null;
  },
): Promise<number> {
  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO claim_sources (
      claim_id, source_id, confidence, quote, timestamp_seconds,
      page_number, url_fragment, editorial_note
    )
    VALUES (
      ${input.claimId},
      ${input.sourceId},
      ${input.confidence}::claim_confidence_enum,
      ${input.quote ?? null},
      ${input.timestampSeconds ?? null},
      ${input.pageNumber ?? null},
      ${input.urlFragment ?? null},
      ${input.editorialNote ?? null}
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  if (rows[0]) return rows[0].id;

  const existing = await db.execute<{ id: number }>(sql`
    SELECT id FROM claim_sources
    WHERE claim_id = ${input.claimId}
      AND source_id = ${input.sourceId}
      AND COALESCE(timestamp_seconds, -1) = COALESCE(${input.timestampSeconds ?? null}, -1)
      AND COALESCE(page_number, -1) = COALESCE(${input.pageNumber ?? null}, -1)
      AND COALESCE(url_fragment, '') = COALESCE(${input.urlFragment ?? null}, '')
    LIMIT 1
  `);
  return existing[0]!.id;
}

export async function attachClaimEntity(
  db: SeedDb = defaultDb,
  input: {
    claimId: number;
    entityType: ClaimEntityType;
    entityId: number;
    entitySlug?: string | null;
  },
): Promise<number> {
  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
    VALUES (
      ${input.claimId},
      ${input.entityType}::claim_entity_type_enum,
      ${input.entityId},
      ${input.entitySlug ?? null}
    )
    ON CONFLICT (claim_id, entity_type, entity_id) DO UPDATE
      SET entity_slug = COALESCE(EXCLUDED.entity_slug, claim_entities.entity_slug)
    RETURNING id
  `);
  return rows[0]!.id;
}

export async function listUnresolvedClaimConflicts(
  db: SeedDb = defaultDb,
  productionId?: number,
): Promise<Array<{
  id: number;
  claim_a_id: number;
  claim_a_slug: string;
  claim_a_statement: string;
  claim_b_id: number;
  claim_b_slug: string;
  claim_b_statement: string;
  conflict_kind: ClaimConflictKind;
  resolution_status: ClaimConflictResolutionStatus;
}>> {
  return db.execute(sql`
    SELECT
      cc.id,
      a.id AS claim_a_id,
      a.slug AS claim_a_slug,
      a.statement AS claim_a_statement,
      b.id AS claim_b_id,
      b.slug AS claim_b_slug,
      b.statement AS claim_b_statement,
      cc.conflict_kind,
      cc.resolution_status
    FROM claim_conflicts cc
    JOIN claims a ON a.id = cc.claim_a_id
    JOIN claims b ON b.id = cc.claim_b_id
    WHERE cc.resolution_status IN ('open', 'reviewing')
      AND ${productionId ? sql`(
        EXISTS (
          SELECT 1 FROM claim_entities ce
          WHERE ce.claim_id IN (a.id, b.id)
            AND ce.entity_type = 'production'
            AND ce.entity_id = ${productionId}
        )
        OR EXISTS (
          SELECT 1
          FROM claim_entities ce
          JOIN scenes sc ON sc.id = ce.entity_id
          WHERE ce.claim_id IN (a.id, b.id)
            AND ce.entity_type = 'scene'
            AND sc.production_id = ${productionId}
        )
      )` : sql`TRUE`}
    ORDER BY cc.created_at DESC
  `);
}
