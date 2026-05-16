import {
  pgTable, bigserial, bigint, integer, text, timestamp, jsonb, index, unique, pgEnum, date,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productionDataTierEnum } from './productions.ts';

/**
 * Phase 22 — polymorphic media foundation. See migration
 * 0049_media_polymorphic.sql for full design rationale.
 */

export const mediaAssetKindEnum = pgEnum('media_asset_kind_enum', [
  'image', 'video', 'audio', 'document', 'link',
]);

export const mediaEntityTypeEnum = pgEnum('media_entity_type_enum', [
  'production', 'person', 'vfx_house', 'stunt_company', 'stunt_school',
  'stunt_sequence', 'stunt_rigging_technique', 'safety_bulletin',
  'equipment_manufacturer', 'equipment_series', 'equipment_item',
  'post_house', 'scene',
]);

export const mediaRoleEnum = pgEnum('media_role_enum', [
  'subject', 'credit_holder', 'reference', 'reel', 'thumbnail', 'related',
]);

export const mediaAssets = pgTable('media_assets', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  kind: mediaAssetKindEnum('kind').notNull(),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  caption: text('caption'),
  credit: text('credit'),
  publication: text('publication'),
  source: text('source'),
  externalId: text('external_id'),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'),
  publishedAt: date('published_at'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  // Migration 0063 — entity-level provenance. data_tier='curated' means
  // a curator hand-attached this URL; last_verified_at is when it was
  // last reached without 404. See migration comment for full semantics.
  dataTier: productionDataTierEnum('data_tier').notNull().default('imported'),
  curatedBy: text('curated_by'),
  curatedByUrl: text('curated_by_url'),
  lastCuratedReview: timestamp('last_curated_review', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  kindIdx: index('media_assets_kind_idx').on(t.kind),
  externalIdx: index('media_assets_external_idx').on(t.source, t.externalId),
  publishedIdx: index('media_assets_published_idx').on(t.publishedAt),
  dataTierIdx: index('media_assets_data_tier_idx').on(t.dataTier),
}));

export const mediaAssociations = pgTable('media_associations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  mediaAssetId: bigint('media_asset_id', { mode: 'number' })
    .notNull()
    .references(() => mediaAssets.id, { onDelete: 'cascade' }),
  entityType: mediaEntityTypeEnum('entity_type').notNull(),
  entityId: bigint('entity_id', { mode: 'number' }).notNull(),
  role: mediaRoleEnum('role').notNull().default('related'),
  captionOverride: text('caption_override'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique('media_associations_media_asset_id_entity_type_entity_id_role_key')
    .on(t.mediaAssetId, t.entityType, t.entityId, t.role),
  entityIdx: index('media_associations_entity_idx').on(t.entityType, t.entityId, t.role, t.sortOrder),
  assetIdx: index('media_associations_asset_idx').on(t.mediaAssetId),
  roleIdx: index('media_associations_role_idx').on(t.role),
}));
