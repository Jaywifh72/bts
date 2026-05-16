-- Migration 0058 — Cinematography societies lookup table.
--
-- `people.member_societies` already stores society codes (ASC, BSC, AFC,
-- etc.) as a text[] populated from curated seed data. That works for "is
-- this DP in the ASC?" but doesn't carry the canonical society metadata
-- (full name, country, founded year, website) that a society's detail
-- page needs.
--
-- This migration adds a `societies` lookup keyed by the same short codes
-- already in the text[]. The text[] stays — joining is a containment
-- check (`people.member_societies @> ARRAY['asc']`), so we don't have to
-- rewrite seed data or build a normalised join table yet. Future E-14
-- (Wikipedia member ingest) and E-20 (proper join table) can layer on
-- top without breaking the current curated path.
--
-- Slug convention: lowercased society code (e.g. 'asc', 'bsc', 'afc').
-- The seed in `people.ts` uses uppercase codes; we lowercase on both
-- sides at query time. Storing lowercase here keeps the URL clean
-- (/societies/asc).

CREATE TABLE IF NOT EXISTS societies (
  id            bigserial   PRIMARY KEY,
  slug          text        NOT NULL UNIQUE,
  -- The short code as used in `people.member_societies` (uppercase, e.g.
  -- 'ASC'). Kept separate from `slug` so we can match the text[] without
  -- case-folding on every read.
  code          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  full_name     text        NOT NULL,
  country       text,
  founded_year  integer,
  website       text,
  wikipedia_url text,
  description   text,
  -- Stable display order on the /societies index (e.g. ASC = 1, BSC = 2).
  -- Falls back to alphabetical when null.
  sort_order    integer     NOT NULL DEFAULT 1000,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);
--> statement-breakpoint

-- Country browse (small index — at most ~30 rows in the lookup, but the
-- "all societies in country X" cross-cut is the next most-common after
-- by-slug, so cheap to add).
CREATE INDEX IF NOT EXISTS societies_country_idx ON societies(country);
--> statement-breakpoint

-- people.member_societies is a text[] of uppercase codes (ASC, BSC, AFC,
-- ...). The `@>` containment operator wants a GIN index to scale once
-- the membership scraper lands. Idempotent because GIN indexes only
-- exist after this migration runs.
CREATE INDEX IF NOT EXISTS people_member_societies_gin_idx
  ON people USING GIN (member_societies);
