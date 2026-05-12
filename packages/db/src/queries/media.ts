import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

/**
 * Phase 22 — read + write helpers for the polymorphic media model.
 *
 * Three patterns the rest of the codebase will lean on:
 *   • upsertMediaAsset — natural-key (URL) upsert, returns asset id
 *   • associateMedia — idempotent (asset, entity, role) join insert
 *   • listMediaForEntity — render-side query: every asset attached
 *     to a given (entity_type, entity_id), with role + caption
 *     override surfaced for per-association rendering.
 */

export type MediaAssetKind = 'image' | 'video' | 'audio' | 'document' | 'link';

export type MediaEntityType =
  | 'production' | 'person' | 'vfx_house' | 'stunt_company' | 'stunt_school'
  | 'stunt_sequence' | 'stunt_rigging_technique' | 'safety_bulletin'
  | 'equipment_manufacturer' | 'equipment_series' | 'equipment_item'
  | 'post_house' | 'scene';

export type MediaRole =
  | 'subject' | 'credit_holder' | 'reference' | 'reel' | 'thumbnail' | 'related';

export type MediaAssetRow = {
  id: number;
  kind: MediaAssetKind;
  url: string;
  title: string;
  caption: string | null;
  credit: string | null;
  publication: string | null;
  source: string | null;
  external_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  metadata: Record<string, unknown>;
};

export type MediaAssociationRow = MediaAssetRow & {
  association_id: number;
  role: MediaRole;
  /** Per-association caption (renders instead of asset.caption when present). */
  caption_override: string | null;
  notes: string | null;
  sort_order: number;
};

export type UpsertMediaAssetInput = {
  kind: MediaAssetKind;
  url: string;
  title: string;
  caption?: string | null;
  credit?: string | null;
  publication?: string | null;
  source?: string | null;
  externalId?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  publishedAt?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Insert-or-update a media asset by URL. Returns the asset id.
 * Idempotent on the URL unique key. Updates mutable fields on
 * conflict so the same upsert call from two different ingest paths
 * (e.g., a backfill pass and a manual add) reconcile cleanly.
 */
export async function upsertMediaAsset(
  db: SeedDb = defaultDb,
  input: UpsertMediaAssetInput,
): Promise<{ id: number; created: boolean }> {
  const [row] = await db.execute<{ id: number; created: boolean }>(sql`
    INSERT INTO media_assets (
      kind, url, title, caption, credit, publication,
      source, external_id, thumbnail_url, duration_seconds,
      published_at, metadata
    ) VALUES (
      ${input.kind}::media_asset_kind_enum,
      ${input.url}, ${input.title},
      ${input.caption ?? null},
      ${input.credit ?? null},
      ${input.publication ?? null},
      ${input.source ?? null},
      ${input.externalId ?? null},
      ${input.thumbnailUrl ?? null},
      ${input.durationSeconds ?? null},
      ${input.publishedAt ? sql`${input.publishedAt}::date` : sql`NULL`},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
    ON CONFLICT (url) DO UPDATE SET
      kind = EXCLUDED.kind,
      title = EXCLUDED.title,
      caption = COALESCE(EXCLUDED.caption, media_assets.caption),
      credit = COALESCE(EXCLUDED.credit, media_assets.credit),
      publication = COALESCE(EXCLUDED.publication, media_assets.publication),
      source = COALESCE(EXCLUDED.source, media_assets.source),
      external_id = COALESCE(EXCLUDED.external_id, media_assets.external_id),
      thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, media_assets.thumbnail_url),
      duration_seconds = COALESCE(EXCLUDED.duration_seconds, media_assets.duration_seconds),
      published_at = COALESCE(EXCLUDED.published_at, media_assets.published_at),
      metadata = media_assets.metadata || EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING id, (xmax = 0) AS created
  `);
  return row!;
}

/**
 * Idempotent association insert. Same (asset, entity, role) tuple
 * is a no-op on re-run; caption_override / notes / sort_order are
 * refreshed on conflict so the metadata stays editable.
 */
export async function associateMedia(
  db: SeedDb = defaultDb,
  args: {
    mediaAssetId: number;
    entityType: MediaEntityType;
    entityId: number;
    role?: MediaRole;
    captionOverride?: string | null;
    notes?: string | null;
    sortOrder?: number;
  },
): Promise<void> {
  await db.execute(sql`
    INSERT INTO media_associations (
      media_asset_id, entity_type, entity_id, role,
      caption_override, notes, sort_order
    ) VALUES (
      ${args.mediaAssetId},
      ${args.entityType}::media_entity_type_enum,
      ${args.entityId},
      ${args.role ?? 'related'}::media_role_enum,
      ${args.captionOverride ?? null},
      ${args.notes ?? null},
      ${args.sortOrder ?? 0}
    )
    ON CONFLICT (media_asset_id, entity_type, entity_id, role)
    DO UPDATE SET
      caption_override = EXCLUDED.caption_override,
      notes = EXCLUDED.notes,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
  `);
}

/**
 * Read every media asset associated with a given (entity_type, entity_id).
 * Returns hydrated rows with role + caption_override surfaced so the
 * render side can pick the right caption per association.
 *
 * Optional `roles` filter narrows to specific association roles
 * (e.g., reel-only for a stunt-person work-reel block).
 * Optional `kind` filter narrows to specific asset kinds.
 */
export async function listMediaForEntity(
  db: SeedDb = defaultDb,
  filters: {
    entityType: MediaEntityType;
    entityId: number;
    roles?: MediaRole[];
    kinds?: MediaAssetKind[];
    limit?: number;
  },
): Promise<MediaAssociationRow[]> {
  const limit = Math.min(filters.limit ?? 50, 200);

  const roleFilter = filters.roles && filters.roles.length > 0
    ? sql`AND ma.role = ANY(${`{${filters.roles.join(',')}}`}::media_role_enum[])`
    : sql``;
  const kindFilter = filters.kinds && filters.kinds.length > 0
    ? sql`AND mas.kind = ANY(${`{${filters.kinds.join(',')}}`}::media_asset_kind_enum[])`
    : sql``;

  return db.execute<MediaAssociationRow>(sql`
    SELECT
      mas.id, mas.kind::text, mas.url, mas.title, mas.caption,
      mas.credit, mas.publication, mas.source, mas.external_id,
      mas.thumbnail_url, mas.duration_seconds,
      mas.published_at::text, mas.metadata,
      ma.id AS association_id,
      ma.role::text,
      ma.caption_override, ma.notes, ma.sort_order
    FROM media_associations ma
    JOIN media_assets mas ON mas.id = ma.media_asset_id
    WHERE ma.entity_type = ${filters.entityType}::media_entity_type_enum
      AND ma.entity_id = ${filters.entityId}
      ${roleFilter}
      ${kindFilter}
    ORDER BY ma.sort_order, mas.published_at DESC NULLS LAST, mas.title
    LIMIT ${limit}
  `);
}

export type EntityAssociation = {
  entity_type: MediaEntityType;
  entity_id: number;
  role: MediaRole;
  caption_override: string | null;
};

/**
 * The inverse — for a single asset, every entity it's associated
 * with. Useful when building admin UI that shows "this Variety
 * article is cited on X, Y, Z; click to detach".
 */
export async function listEntitiesForMedia(
  db: SeedDb = defaultDb,
  mediaAssetId: number,
): Promise<EntityAssociation[]> {
  return db.execute<EntityAssociation>(sql`
    SELECT entity_type::text, entity_id, role::text, caption_override
    FROM media_associations
    WHERE media_asset_id = ${mediaAssetId}
    ORDER BY entity_type, entity_id, role
  `);
}

// ── Phase 27: admin-side queries ───────────────────────────────────

export type AdminMediaRow = MediaAssetRow & { association_count: number };

export async function listAllMediaAssets(
  db: SeedDb = defaultDb,
  filters: { kind?: MediaAssetKind; search?: string; limit?: number; offset?: number } = {},
): Promise<AdminMediaRow[]> {
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const kindFilter = filters.kind
    ? sql`AND mas.kind = ${filters.kind}::media_asset_kind_enum`
    : sql``;
  const searchFilter = filters.search
    ? sql`AND (mas.title ILIKE ${'%' + filters.search + '%'} OR mas.url ILIKE ${'%' + filters.search + '%'})`
    : sql``;

  return db.execute<AdminMediaRow>(sql`
    SELECT
      mas.id, mas.kind::text, mas.url, mas.title, mas.caption,
      mas.credit, mas.publication, mas.source, mas.external_id,
      mas.thumbnail_url, mas.duration_seconds,
      mas.published_at::text, mas.metadata,
      (SELECT COUNT(*)::int FROM media_associations ma WHERE ma.media_asset_id = mas.id) AS association_count
    FROM media_assets mas
    WHERE TRUE ${kindFilter} ${searchFilter}
    ORDER BY mas.updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countAllMediaAssets(
  db: SeedDb = defaultDb,
  filters: { kind?: MediaAssetKind; search?: string } = {},
): Promise<number> {
  const kindFilter = filters.kind
    ? sql`AND kind = ${filters.kind}::media_asset_kind_enum`
    : sql``;
  const searchFilter = filters.search
    ? sql`AND (title ILIKE ${'%' + filters.search + '%'} OR url ILIKE ${'%' + filters.search + '%'})`
    : sql``;
  const [row] = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM media_assets WHERE TRUE ${kindFilter} ${searchFilter}
  `);
  return row?.n ?? 0;
}

export type HydratedAssociation = {
  association_id: number;
  entity_type: MediaEntityType;
  entity_id: number;
  role: MediaRole;
  caption_override: string | null;
  display_name: string;
  slug: string;
  href: string;
};

const ENTITY_TABLE_BY_TYPE: Record<MediaEntityType, { table: string; nameCol: string; hrefPrefix: string }> = {
  production:               { table: 'productions',                nameCol: 'title',        hrefPrefix: '/films/' },
  person:                   { table: 'people',                     nameCol: 'display_name', hrefPrefix: '/crew/' },
  vfx_house:                { table: 'vfx_houses',                 nameCol: 'name',         hrefPrefix: '/vfx/' },
  stunt_company:            { table: 'stunt_companies',            nameCol: 'name',         hrefPrefix: '/stunts/companies/' },
  stunt_school:             { table: 'stunt_schools',              nameCol: 'name',         hrefPrefix: '/stunts/schools/' },
  stunt_sequence:           { table: 'stunt_sequences',            nameCol: 'name',         hrefPrefix: '/stunts/sequences#' },
  stunt_rigging_technique:  { table: 'stunt_rigging_techniques',   nameCol: 'name',         hrefPrefix: '/stunts/rigging/' },
  safety_bulletin:          { table: 'safety_bulletins',           nameCol: 'title',        hrefPrefix: '/stunts/safety/' },
  equipment_manufacturer:   { table: 'equipment_manufacturers',    nameCol: 'name',         hrefPrefix: '/gear/' },
  equipment_series:         { table: 'equipment_series',           nameCol: 'name',         hrefPrefix: '/gear#' },
  equipment_item:           { table: 'equipment_items',            nameCol: 'name',         hrefPrefix: '/gear#' },
  post_house:               { table: 'post_houses',                nameCol: 'name',         hrefPrefix: '/post-houses/' },
  scene:                    { table: 'scenes',                     nameCol: 'title',        hrefPrefix: '/films#scene-' },
};

export async function getMediaAssetById(
  db: SeedDb = defaultDb,
  id: number,
): Promise<{ asset: MediaAssetRow; associations: HydratedAssociation[] } | null> {
  const [asset] = await db.execute<MediaAssetRow>(sql`
    SELECT id, kind::text, url, title, caption, credit, publication,
           source, external_id, thumbnail_url, duration_seconds,
           published_at::text, metadata
    FROM media_assets WHERE id = ${id}
  `);
  if (!asset) return null;

  const rawAssociations = await db.execute<{
    association_id: number;
    entity_type: MediaEntityType;
    entity_id: number;
    role: MediaRole;
    caption_override: string | null;
  }>(sql`
    SELECT id AS association_id, entity_type::text, entity_id, role::text, caption_override
    FROM media_associations
    WHERE media_asset_id = ${id}
    ORDER BY entity_type, entity_id, role
  `);

  const byType = new Map<MediaEntityType, number[]>();
  for (const a of rawAssociations) {
    const list = byType.get(a.entity_type) ?? [];
    list.push(a.entity_id);
    byType.set(a.entity_type, list);
  }
  const lookups = new Map<string, { display_name: string; slug: string }>();
  for (const [entityType, ids] of byType) {
    const meta = ENTITY_TABLE_BY_TYPE[entityType];
    if (!meta || ids.length === 0) continue;
    const rows = await db.execute<{ id: number; slug: string; display_name: string }>(sql`
      SELECT id, slug, ${sql.identifier(meta.nameCol)} AS display_name
      FROM ${sql.identifier(meta.table)}
      WHERE id = ANY(${`{${ids.join(',')}}`}::bigint[])
    `);
    for (const r of rows) {
      lookups.set(`${entityType}:${r.id}`, { display_name: r.display_name, slug: r.slug });
    }
  }
  const associations: HydratedAssociation[] = rawAssociations.map((a) => {
    const meta = ENTITY_TABLE_BY_TYPE[a.entity_type];
    const lookup = lookups.get(`${a.entity_type}:${a.entity_id}`);
    return {
      ...a,
      display_name: lookup?.display_name ?? `(missing #${a.entity_id})`,
      slug: lookup?.slug ?? '',
      href: meta && lookup ? `${meta.hrefPrefix}${lookup.slug}` : '',
    };
  });
  return { asset, associations };
}

export async function resolveEntityIdBySlug(
  db: SeedDb = defaultDb,
  entityType: MediaEntityType,
  slug: string,
): Promise<{ id: number; display_name: string } | null> {
  const meta = ENTITY_TABLE_BY_TYPE[entityType];
  if (!meta) return null;
  const [row] = await db.execute<{ id: number; display_name: string }>(sql`
    SELECT id, ${sql.identifier(meta.nameCol)} AS display_name
    FROM ${sql.identifier(meta.table)}
    WHERE slug = ${slug}
  `);
  return row ?? null;
}

export async function getMostSharedMedia(
  db: SeedDb = defaultDb,
  limit: number = 8,
): Promise<Array<{ id: number; url: string; title: string; kind: string; association_count: number }>> {
  return db.execute<{ id: number; url: string; title: string; kind: string; association_count: number }>(sql`
    SELECT mas.id, mas.url, mas.title, mas.kind::text,
           COUNT(ma.id)::int AS association_count
    FROM media_assets mas
    JOIN media_associations ma ON ma.media_asset_id = mas.id
    GROUP BY mas.id, mas.url, mas.title, mas.kind
    HAVING COUNT(ma.id) > 1
    ORDER BY association_count DESC
    LIMIT ${limit}
  `);
}

// ── Phase 28: public-facing references browse ─────────────────────

export type CitedAssetRow = {
  id: number;
  url: string;
  title: string;
  kind: string;
  publication: string | null;
  thumbnail_url: string | null;
  association_count: number;
  entity_type_count: number;
};

/**
 * Public-side leaderboard for /references — top assets across the
 * archive. Restricted to assets with > 1 association (single-cite
 * assets aren't interesting on a "most-cited" landing).
 */
export async function listMostCitedAssets(
  db: SeedDb = defaultDb,
  filters: { kinds?: MediaAssetKind[]; limit?: number; offset?: number } = {},
): Promise<CitedAssetRow[]> {
  const limit = Math.min(filters.limit ?? 30, 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const kindFilter = filters.kinds && filters.kinds.length > 0
    ? sql`AND mas.kind = ANY(${`{${filters.kinds.join(',')}}`}::media_asset_kind_enum[])`
    : sql``;

  return db.execute<CitedAssetRow>(sql`
    SELECT mas.id, mas.url, mas.title, mas.kind::text,
           mas.publication, mas.thumbnail_url,
           COUNT(ma.id)::int AS association_count,
           COUNT(DISTINCT ma.entity_type)::int AS entity_type_count
    FROM media_assets mas
    JOIN media_associations ma ON ma.media_asset_id = mas.id
    WHERE TRUE ${kindFilter}
    GROUP BY mas.id, mas.url, mas.title, mas.kind, mas.publication, mas.thumbnail_url
    HAVING COUNT(ma.id) > 1
    ORDER BY association_count DESC, mas.title
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function countMostCitedAssets(db: SeedDb = defaultDb): Promise<number> {
  const [row] = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM (
      SELECT mas.id
      FROM media_assets mas
      JOIN media_associations ma ON ma.media_asset_id = mas.id
      GROUP BY mas.id
      HAVING COUNT(ma.id) > 1
    ) sub
  `);
  return row?.n ?? 0;
}

/**
 * Disassociate (delete the join row only — keeps the asset itself).
 */
export async function disassociateMedia(
  db: SeedDb = defaultDb,
  args: {
    mediaAssetId: number;
    entityType: MediaEntityType;
    entityId: number;
    role: MediaRole;
  },
): Promise<void> {
  await db.execute(sql`
    DELETE FROM media_associations
    WHERE media_asset_id = ${args.mediaAssetId}
      AND entity_type = ${args.entityType}::media_entity_type_enum
      AND entity_id = ${args.entityId}
      AND role = ${args.role}::media_role_enum
  `);
}

// ── Phase 31: cross-citation reference rendering ──────────────────

export type ReferenceWithCrossCitations = {
  asset_id: number;
  url: string;
  title: string;
  kind: string;
  publication: string | null;
  caption_override: string | null;
  /** Number of OTHER entities that also cite this same URL —
   *  excludes the calling entity. Drives the "+N also cited" hint. */
  also_cited_count: number;
};

/**
 * The entity's reference-role media, hydrated with a count of how
 * many OTHER entities cite the same canonical URL. Drives the
 * cross-citation hint on entity detail pages — readers can see at
 * a glance which sources are shared with other entities and click
 * through to /references/[id] to navigate the network.
 */
export async function getReferencesWithCrossCitations(
  db: SeedDb = defaultDb,
  entityType: MediaEntityType,
  entityId: number,
): Promise<ReferenceWithCrossCitations[]> {
  return db.execute<ReferenceWithCrossCitations>(sql`
    SELECT
      mas.id AS asset_id,
      mas.url,
      mas.title,
      mas.kind::text,
      mas.publication,
      ma.caption_override,
      (
        SELECT COUNT(DISTINCT (other.entity_type, other.entity_id))::int
        FROM media_associations other
        WHERE other.media_asset_id = mas.id
          AND NOT (other.entity_type = ${entityType}::media_entity_type_enum
                   AND other.entity_id = ${entityId})
      ) AS also_cited_count
    FROM media_associations ma
    JOIN media_assets mas ON mas.id = ma.media_asset_id
    WHERE ma.entity_type = ${entityType}::media_entity_type_enum
      AND ma.entity_id = ${entityId}
      AND ma.role = 'reference'::media_role_enum
    ORDER BY ma.sort_order, mas.title
  `);
}
