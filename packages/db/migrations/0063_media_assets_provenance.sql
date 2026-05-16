-- Migration 0063 — provenance columns on media_assets.
--
-- UX-audit Theme F item F1 follow-on. Migration 0060 added provenance
-- columns to four entity tables (people, vfx_houses, stunt_companies,
-- stunt_schools) but deferred media_assets because its semantics differ:
--
--   • data_tier='curated' here means the URL was hand-attached to an
--     entity by a curator, vs. auto-ingested from TMDb / imported feeds.
--     The asset row itself isn't "written" the way a biography is.
--   • last_verified_at on a media asset means the URL was last
--     successfully reached (no 404), not editorial verification. The
--     existing link-rot infrastructure on `sources.last_status` will
--     eventually replicate here.
--
-- For now, ship the same column set as the other entity tables so the
-- /references/[id] page can render the EntityProvenanceFooter byline
-- when a curator stamps an asset as authoritative.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS data_tier            production_data_tier NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS curated_by           TEXT,
  ADD COLUMN IF NOT EXISTS curated_by_url       TEXT,
  ADD COLUMN IF NOT EXISTS last_curated_review  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verified_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS media_assets_data_tier_idx ON media_assets (data_tier);

COMMENT ON COLUMN media_assets.data_tier IS
  'Curation tier — ''curated'' means the URL was hand-attached by a curator (e.g. cited in an editorial dossier). ''imported'' is auto-ingested. Drives the EntityProvenanceFooter rigor signal on /references/[id].';
