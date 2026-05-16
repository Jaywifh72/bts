-- Migration 0060 — provenance columns on non-film entities.
--
-- UX-audit Theme F item F1. The `EntityProvenanceFooter` component is
-- already mounted on 6 non-film entity pages (crew, vfx_houses,
-- stunt_companies, stunt_schools, format, societies, references) but
-- renders only the correction CTA — the rigor badge, verified-N-days-ago
-- timestamp, and curated-by byline are all dark because the underlying
-- columns only exist on `productions`. This migration brings those
-- entity tables to parity.
--
-- Decision (per the Theme F plan doc, 2026-05-15):
--   • Reuse the existing `production_data_tier` enum site-wide rather
--     than fragmenting into per-entity enums. The name is a slight
--     misnomer at this point but renaming the SQL enum is a separate
--     non-blocking cleanup.
--   • Default `data_tier='imported'` on backfill. Curators flip
--     individual rows to 'curated' via the existing admin form as they
--     audit each dossier — UI lights up row-by-row over time.
--   • `last_verified_at` is left NULL on backfill rather than stamped
--     to NOW(). Verification is editorial; auto-stamping would be a lie.
--   • `curated_by` / `curated_by_url` / `last_curated_review` only
--     render in the EntityProvenanceFooter when data_tier='curated' —
--     null values just hide the byline cleanly.
--
-- Tables touched (4):
--   • people                 — biographies, career stats
--   • vfx_houses             — house overviews, filmography
--   • stunt_companies        — company taglines, crew/sequence rolls
--   • stunt_schools          — school programmes
--
-- `media_assets` (the 5th candidate) is deferred to a follow-up
-- migration — its provenance semantics are different enough (data_tier
-- = "did a curator attach this association" rather than "is the row
-- hand-written") that it deserves its own pass.

-- ── people ────────────────────────────────────────────────────────
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS data_tier            production_data_tier NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS curated_by           TEXT,
  ADD COLUMN IF NOT EXISTS curated_by_url       TEXT,
  ADD COLUMN IF NOT EXISTS last_curated_review  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verified_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS people_data_tier_idx ON people (data_tier);

COMMENT ON COLUMN people.data_tier            IS 'Curation tier — ''curated'' means the row carries a hand-written biography + sourced claims; ''imported'' is TMDb metadata only.';
COMMENT ON COLUMN people.curated_by           IS 'Display handle of the curator who last reviewed this dossier. Renders in the EntityProvenanceFooter byline.';
COMMENT ON COLUMN people.curated_by_url       IS 'Optional portfolio URL for the curator (rel=author link target).';
COMMENT ON COLUMN people.last_curated_review  IS 'Timestamp of the most recent editorial review pass — drives the "Last reviewed N months ago" sub-line.';
COMMENT ON COLUMN people.last_verified_at     IS 'Timestamp of the most recent fact-check pass — drives the "Verified N days ago" stamp.';

-- ── vfx_houses ────────────────────────────────────────────────────
ALTER TABLE vfx_houses
  ADD COLUMN IF NOT EXISTS data_tier            production_data_tier NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS curated_by           TEXT,
  ADD COLUMN IF NOT EXISTS curated_by_url       TEXT,
  ADD COLUMN IF NOT EXISTS last_curated_review  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verified_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS vfx_houses_data_tier_idx ON vfx_houses (data_tier);

-- ── stunt_companies ───────────────────────────────────────────────
ALTER TABLE stunt_companies
  ADD COLUMN IF NOT EXISTS data_tier            production_data_tier NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS curated_by           TEXT,
  ADD COLUMN IF NOT EXISTS curated_by_url       TEXT,
  ADD COLUMN IF NOT EXISTS last_curated_review  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verified_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS stunt_companies_data_tier_idx ON stunt_companies (data_tier);

-- ── stunt_schools ─────────────────────────────────────────────────
ALTER TABLE stunt_schools
  ADD COLUMN IF NOT EXISTS data_tier            production_data_tier NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS curated_by           TEXT,
  ADD COLUMN IF NOT EXISTS curated_by_url       TEXT,
  ADD COLUMN IF NOT EXISTS last_curated_review  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verified_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS stunt_schools_data_tier_idx ON stunt_schools (data_tier);
