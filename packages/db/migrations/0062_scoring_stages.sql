-- Migration 0062 — scoring_stages table for the /music vendor panel.
--
-- UX-audit Theme F item F3a. The `/music` department index has a
-- `vendors` slot in DepartmentIndex that's currently empty. For working
-- composers and music supervisors, the scoring stage credit (Newman
-- Stage / Eastwood Stage / AIR Lyndhurst / Abbey Road One / Capitol
-- Studios) is as recognizable as ILM is to a VFX supervisor.
--
-- Shape mirrors `post_houses` exactly so the rendering pattern can
-- mirror the sound vendor panel. Adds scoring-specific columns
-- (capacity_orchestra / capacity_chorus) that wouldn't fit on
-- post_houses.
--
-- `production_scoring_stages` is the many-to-many join — most
-- productions use one stage, but Atmos remixes and re-records can use
-- multiple stages so we don't constrain to 1:1.

CREATE TABLE IF NOT EXISTS scoring_stages (
  id                    BIGSERIAL PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  -- e.g. "Newman Scoring Stage" inside parent "Fox Studios"
  facility_name         TEXT,
  country               TEXT,
  city                  TEXT,
  -- Typical orchestra capacity (players that can be seated for a
  -- session). Used in the panel summary; null for stages that don't
  -- publish a number.
  capacity_orchestra    INT,
  capacity_chorus       INT,
  website               TEXT,
  notes                 TEXT,
  "references"          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Theme F1 provenance — same shape as people/vfx_houses.
  data_tier             production_data_tier NOT NULL DEFAULT 'imported',
  curated_by            TEXT,
  curated_by_url        TEXT,
  last_curated_review   TIMESTAMPTZ,
  last_verified_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scoring_stages_country_idx ON scoring_stages (country);
CREATE INDEX IF NOT EXISTS scoring_stages_data_tier_idx ON scoring_stages (data_tier);

CREATE TABLE IF NOT EXISTS production_scoring_stages (
  production_id     BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  scoring_stage_id  BIGINT NOT NULL REFERENCES scoring_stages(id) ON DELETE RESTRICT,
  -- Brief context for the credit (e.g. "Recorded with the London Symphony")
  notes             TEXT,
  -- E-49-style sort_order so multi-stage productions can preserve a
  -- curator-set display order.
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (production_id, scoring_stage_id)
);

CREATE INDEX IF NOT EXISTS production_scoring_stages_stage_idx
  ON production_scoring_stages (scoring_stage_id);

COMMENT ON TABLE scoring_stages IS
  'Recording venues used for film score sessions. Powers the /music vendor panel and the per-film "Recorded at" attribution.';
