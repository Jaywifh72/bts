-- Phase 22 — polymorphic media foundation.
--
-- Until now, media (images, videos, references) lived in
-- production-anchored shapes:
--   • production_videos     — one FK to a single production
--   • production_keyframes  — one FK to a single production + scene
--   • <entity>.references jsonb — denormalised per-entity arrays
--
-- That meant a single Variety article cited by both 87Eleven Action
-- Design and Sam Hargrave was duplicated across two jsonb arrays;
-- a stunt-reel video belonged to a production, not to the
-- stuntperson; surfacing media on a person/department/sequence page
-- required indirect joins through productions.
--
-- This migration adds a true polymorphic media model:
--   • media_assets      — one row per unique URL (canonical record)
--   • media_associations — many rows per asset, one per
--                          (asset, entity_type, entity_id, role)
--
-- Existing tables are NOT modified — they remain authoritative for
-- the surfaces that read them today. Backfills (Phase 23+) will
-- populate the new tables alongside, with the old tables eventually
-- becoming derived views.

CREATE TYPE media_asset_kind_enum AS ENUM (
  'image',          -- still photograph or production still
  'video',          -- linked external video (YouTube / Vimeo / etc.)
  'audio',          -- audio interview, podcast episode
  'document',       -- PDF or other long-form document (e.g. SAG-AFTRA bulletin)
  'link'            -- web article / blog post / wikipedia page
);

CREATE TYPE media_entity_type_enum AS ENUM (
  'production',
  'person',
  'vfx_house',
  'stunt_company',
  'stunt_school',
  'stunt_sequence',
  'stunt_rigging_technique',
  'safety_bulletin',
  'equipment_manufacturer',
  'equipment_series',
  'equipment_item',
  'post_house',
  'scene'
);

CREATE TYPE media_role_enum AS ENUM (
  'subject',         -- the entity is the subject of the asset
                     -- (a video about a film → role='subject' for that production)
  'credit_holder',   -- the entity created or is credited on the asset
                     -- (an interview clip → role='credit_holder' for the interviewee)
  'reference',       -- the asset is cited as evidence / source
                     -- (a Variety article cited on a stunt company page)
  'reel',            -- the asset is part of the entity's curated reel / portfolio
                     -- (a stunt person's demo reel video)
  'thumbnail',       -- the asset is used as the entity's primary visual
  'related'          -- catch-all "appears in association"
);

-- ── media_assets — canonical record per unique URL ────────────────

CREATE TABLE media_assets (
  id                  BIGSERIAL PRIMARY KEY,
  kind                media_asset_kind_enum NOT NULL,
  /* Canonical URL — UNIQUE so the same asset isn't duplicated. The
     URL acts as the natural key for upsert flows. */
  url                 TEXT NOT NULL,
  title               TEXT NOT NULL,
  caption             TEXT,
  /* Editorial credit — the person/org responsible for the asset
     (separate from media_associations.role='credit_holder', which
     attaches the credit relationship to a tracked entity). */
  credit              TEXT,
  publication         TEXT,
  /* Source platform — youtube / vimeo / variety / fxguide / etc.
     Free-form to allow new platforms without enum migrations. */
  source              TEXT,
  /* External-platform ID where applicable (YouTube videoId, Vimeo
     numeric ID). Combined with source it gives a deduplication
     key independent of URL formatting. */
  external_id         TEXT,
  thumbnail_url       TEXT,
  duration_seconds    INTEGER,
  /* Original publication date when known. */
  published_at        DATE,
  /* Per-asset metadata bag — view counts, transcript availability,
     archive-org snapshot URL, etc. */
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX media_assets_url_unique ON media_assets(url);
CREATE INDEX media_assets_kind_idx ON media_assets(kind);
CREATE INDEX media_assets_external_idx
  ON media_assets(source, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX media_assets_published_idx
  ON media_assets(published_at DESC)
  WHERE published_at IS NOT NULL;

-- ── media_associations — polymorphic many-to-many ────────────────

CREATE TABLE media_associations (
  id                  BIGSERIAL PRIMARY KEY,
  media_asset_id      BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  /* Polymorphic FK: (entity_type, entity_id) names the row in the
     target table. We do NOT enforce a real FK because Postgres
     doesn't support polymorphic FKs natively — orphaned rows are
     prevented by application code (the inserter resolves the slug
     and aborts if the row doesn't exist) and by the per-table
     ON DELETE behaviour each entity table already carries. */
  entity_type         media_entity_type_enum NOT NULL,
  entity_id           BIGINT NOT NULL,
  role                media_role_enum NOT NULL DEFAULT 'related',
  /* Optional per-association caption. The asset's own caption is
     the canonical one; this lets a single asset render with
     different framing on different entity pages
     (e.g., a stunt-coordinator interview that's described as the
     "Cap-vs-Cap fight breakdown" on the sequence page but as
     "career-spanning interview" on the person page). */
  caption_override    TEXT,
  notes               TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  /* One association row per (asset, entity, role) — same asset
     CAN appear with different roles on the same entity (e.g.,
     'subject' AND 'thumbnail') but not duplicated within a role. */
  UNIQUE (media_asset_id, entity_type, entity_id, role)
);

CREATE INDEX media_associations_entity_idx
  ON media_associations(entity_type, entity_id, role, sort_order);
CREATE INDEX media_associations_asset_idx
  ON media_associations(media_asset_id);
CREATE INDEX media_associations_role_idx
  ON media_associations(role);
