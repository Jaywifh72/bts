-- Migration 0082 — bring facility entities to VFX-house editorial parity.
--
-- vfx_houses already carries: summary, tagline, headquarters,
-- parent_company, employee_count, careers_url, reel_url, references[]
-- (JSONB), wikidata_id, data_tier, curated_by, last_verified_at.
--
-- These are the editorial fields that turn a row from a catalog entry
-- into a real company profile. This migration brings post_houses,
-- scoring_stages, vp_volumes, and sound_libraries up to parity so
-- 'Skywalker Sound' / 'AIR Lyndhurst' / 'Stagecraft Manhattan Beach' /
-- 'BOOM Library' all render as substantive company pages.
--
-- All columns nullable; existing rows unaffected. references column
-- adopts the same JSONB array shape used everywhere else.

-- ── post_houses ────────────────────────────────────────────────────
ALTER TABLE "post_houses"
  ADD COLUMN IF NOT EXISTS "summary"          text,
  ADD COLUMN IF NOT EXISTS "tagline"          text,
  ADD COLUMN IF NOT EXISTS "headquarters"     text,
  ADD COLUMN IF NOT EXISTS "parent_company"   text,
  ADD COLUMN IF NOT EXISTS "employee_count"   integer,
  ADD COLUMN IF NOT EXISTS "careers_url"      text,
  ADD COLUMN IF NOT EXISTS "reel_url"         text,
  ADD COLUMN IF NOT EXISTS "wikidata_id"      text UNIQUE,
  ADD COLUMN IF NOT EXISTS "references"       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "data_tier"        production_data_tier NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS "curated_by"       text,
  ADD COLUMN IF NOT EXISTS "curated_by_url"   text,
  ADD COLUMN IF NOT EXISTS "last_curated_review" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_verified_at"    timestamp with time zone;

-- ── scoring_stages ─────────────────────────────────────────────────
-- Already has: data_tier, references[], last_verified_at, notes,
-- curated_by, curated_by_url, last_curated_review.
-- Add the editorial fields it's missing.
ALTER TABLE "scoring_stages"
  ADD COLUMN IF NOT EXISTS "summary"          text,
  ADD COLUMN IF NOT EXISTS "tagline"          text,
  ADD COLUMN IF NOT EXISTS "parent_company"   text,
  ADD COLUMN IF NOT EXISTS "wikidata_id"      text UNIQUE,
  ADD COLUMN IF NOT EXISTS "careers_url"      text,
  ADD COLUMN IF NOT EXISTS "reel_url"         text;

-- ── vp_volumes ─────────────────────────────────────────────────────
-- Already has: summary, data_tier, last_verified_at. Add the rest.
ALTER TABLE "vp_volumes"
  ADD COLUMN IF NOT EXISTS "tagline"          text,
  ADD COLUMN IF NOT EXISTS "headquarters"     text,
  ADD COLUMN IF NOT EXISTS "parent_company"   text,
  ADD COLUMN IF NOT EXISTS "employee_count"   integer,
  ADD COLUMN IF NOT EXISTS "wikidata_id"      text UNIQUE,
  ADD COLUMN IF NOT EXISTS "careers_url"      text,
  ADD COLUMN IF NOT EXISTS "reel_url"         text,
  ADD COLUMN IF NOT EXISTS "references"       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "curated_by"       text,
  ADD COLUMN IF NOT EXISTS "curated_by_url"   text,
  ADD COLUMN IF NOT EXISTS "last_curated_review" timestamp with time zone;

-- ── sound_libraries ────────────────────────────────────────────────
-- Already has: summary, country, founded_year, website_url, specialties,
-- data_tier, last_verified_at.
ALTER TABLE "sound_libraries"
  ADD COLUMN IF NOT EXISTS "tagline"          text,
  ADD COLUMN IF NOT EXISTS "headquarters"     text,
  ADD COLUMN IF NOT EXISTS "parent_company"   text,
  ADD COLUMN IF NOT EXISTS "employee_count"   integer,
  ADD COLUMN IF NOT EXISTS "wikidata_id"      text UNIQUE,
  ADD COLUMN IF NOT EXISTS "references"       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "curated_by"       text,
  ADD COLUMN IF NOT EXISTS "curated_by_url"   text,
  ADD COLUMN IF NOT EXISTS "last_curated_review" timestamp with time zone;
