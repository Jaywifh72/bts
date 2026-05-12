-- Stunt section, phase 1 — companies + schools as first-class
-- entities, mirroring the vfx_houses / equipment_manufacturers
-- editorial pattern. Phase 2 will extend `people` with stunt-specific
-- fields and add the stunt_sequences detail layer.
--
-- Both tables carry the same editorial shape: tagline + summary +
-- references jsonb so the detail pages can render rich content
-- consistently with the rest of the archive.

CREATE TABLE stunt_companies (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  founded_year    INTEGER,
  headquarters    TEXT,
  country         TEXT,
  parent_company  TEXT,
  website         TEXT,
  reel_url        TEXT,
  careers_url     TEXT,
  founder_names   TEXT[] NOT NULL DEFAULT '{}',
  specialties     TEXT[] NOT NULL DEFAULT '{}',
  member_count    INTEGER CHECK (member_count IS NULL OR member_count >= 0),
  summary         TEXT,
  tagline         TEXT,
  "references"    JSONB NOT NULL DEFAULT '[]'::jsonb,
  wikidata_id     TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX stunt_companies_country_idx ON stunt_companies(country);

CREATE TABLE stunt_schools (
  id                       BIGSERIAL PRIMARY KEY,
  slug                     TEXT NOT NULL UNIQUE,
  name                     TEXT NOT NULL,
  founded_year             INTEGER,
  headquarters             TEXT,
  country                  TEXT,
  website                  TEXT,
  curriculum_disciplines   TEXT[] NOT NULL DEFAULT '{}',
  summary                  TEXT,
  tagline                  TEXT,
  "references"             JSONB NOT NULL DEFAULT '[]'::jsonb,
  wikidata_id              TEXT UNIQUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX stunt_schools_country_idx ON stunt_schools(country);

-- Seed the canonical stunt-department roles so credit data has a
-- consistent target. Idempotent — uses ON CONFLICT on the slug.
INSERT INTO roles (slug, name, category)
VALUES
  ('stunt-coordinator',           'Stunt Coordinator',            'stunts'),
  ('second-unit-director-stunts', '2nd Unit Director (Stunts)',   'stunts'),
  ('stunt-performer',             'Stunt Performer',              'stunts'),
  ('stunt-double',                'Stunt Double',                 'stunts'),
  ('stunt-rigger',                'Stunt Rigger',                 'stunts'),
  ('safety-officer',              'Safety Officer',               'stunts'),
  ('precision-driver',            'Precision Driver',             'stunts'),
  ('fight-choreographer',         'Fight Choreographer',          'stunts'),
  ('weapons-master',              'Weapons Master',               'stunts')
ON CONFLICT (slug) DO NOTHING;
