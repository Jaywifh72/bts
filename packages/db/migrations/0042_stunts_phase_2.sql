-- Stunt section, phase 2 — extend `people` with stunt-specific
-- editorial fields and add Taurus / SAG Stunt Ensemble to the award
-- organisation enum so the awards backfill can target them.
--
-- Field choices:
--   stunt_disciplines      array of free-text discipline tags
--   height_cm / weight_kg  performer-card vitals (the standard
--                          casting-card data point pros publish)
--   performer_union        'SAG-AFTRA' | 'BECTU' | 'BSR' | 'ACTRA' | …
--                          stored as text (not enum) — unions and
--                          regional variants change too quickly
--   doubles_for            array of crew/people slugs the performer
--                          regularly doubles
--   training_school_slugs  array of stunt_schools.slug
--   stunt_company_slug     primary stunt_companies.slug affiliation
--
-- All fields are optional — existing TMDb-imported people rows aren't
-- touched, only enriched once curated.

ALTER TABLE people
  ADD COLUMN stunt_disciplines      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN height_cm              INTEGER CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm < 300)),
  ADD COLUMN weight_kg              NUMERIC(5,2) CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 500)),
  ADD COLUMN performer_union        TEXT,
  ADD COLUMN doubles_for            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN training_school_slugs  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN stunt_company_slug     TEXT;

CREATE INDEX people_stunt_disciplines_gin_idx
  ON people USING gin (stunt_disciplines);
CREATE INDEX people_stunt_company_idx
  ON people (stunt_company_slug)
  WHERE stunt_company_slug IS NOT NULL;

ALTER TYPE award_org_enum ADD VALUE IF NOT EXISTS 'taurus_world_stunt_awards';
ALTER TYPE award_org_enum ADD VALUE IF NOT EXISTS 'sag_stunt_ensemble';
