-- VFX house editorial-page additions: long-form summary, headquarters,
-- parent company, headcount, tagline, careers + reel URLs. Plus two
-- side tables for multi-office presence and editor-pinned highlights.
ALTER TABLE vfx_houses
  ADD COLUMN summary         TEXT,
  ADD COLUMN headquarters    TEXT,
  ADD COLUMN parent_company  TEXT,
  ADD COLUMN employee_count  INTEGER CHECK (employee_count IS NULL OR employee_count >= 0),
  ADD COLUMN tagline         TEXT,
  ADD COLUMN careers_url     TEXT,
  ADD COLUMN reel_url        TEXT;

CREATE TABLE vfx_house_offices (
  id              BIGSERIAL PRIMARY KEY,
  vfx_house_id    BIGINT NOT NULL REFERENCES vfx_houses(id) ON DELETE CASCADE,
  city            TEXT NOT NULL,
  country         TEXT,
  is_headquarters BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vfx_house_id, city)
);
CREATE INDEX vfx_house_offices_house_idx ON vfx_house_offices(vfx_house_id, sort_order);
-- One headquarters per house. Partial unique index lets the boolean
-- be FALSE on every other row without conflict.
CREATE UNIQUE INDEX vfx_house_offices_hq_unq
  ON vfx_house_offices(vfx_house_id) WHERE is_headquarters = true;

CREATE TABLE vfx_house_highlights (
  id              BIGSERIAL PRIMARY KEY,
  vfx_house_id    BIGINT NOT NULL REFERENCES vfx_houses(id) ON DELETE CASCADE,
  production_id   BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  editorial_note  TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vfx_house_id, production_id)
);
CREATE INDEX vfx_house_highlights_house_idx ON vfx_house_highlights(vfx_house_id, sort_order);
