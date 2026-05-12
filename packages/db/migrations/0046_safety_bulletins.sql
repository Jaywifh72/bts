-- Stunt section, phase 6 — SAG-AFTRA Safety Bulletins archive.
--
-- The Safety Bulletins are the working stunt department's
-- procedure manual: numbered guidance documents covering firearms,
-- pyro, helicopters, animals, water work and so on. They're freely
-- distributed by SAG-AFTRA but scattered across PDF downloads;
-- nothing on the open web indexes them as cross-referenced entities.
--
-- We do not reproduce the bulletin text itself (which is
-- copyrighted) — instead each row is original prose summarising
-- scope + key requirements, with the canonical PDF at
-- sagaftra.org/safety as the authoritative source.
--
-- `key_requirements` jsonb shape:
--   Array<{ heading: string, detail: string }>
--
-- `references` jsonb shape (matches the rest of the archive):
--   Array<{ title: string, url: string, publication?: string, kind?: string }>

CREATE TYPE safety_bulletin_category_enum AS ENUM (
  'firearms',
  'pyrotechnics',
  'fire',
  'animals',
  'aerial',
  'vehicles',
  'water',
  'stunts_general',
  'environmental',
  'medical'
);

CREATE TABLE safety_bulletins (
  id                          BIGSERIAL PRIMARY KEY,
  slug                        TEXT NOT NULL UNIQUE,
  bulletin_number             TEXT NOT NULL,                       -- e.g. '1', '15', '38'
  title                       TEXT NOT NULL,                       -- e.g. 'Recommendations for Safety with Firearms'
  category                    safety_bulletin_category_enum NOT NULL,
  governing_body              TEXT NOT NULL DEFAULT 'SAG-AFTRA',
  scope                       TEXT NOT NULL,                       -- one paragraph: when does this bulletin apply
  summary                     TEXT NOT NULL,                       -- editorial 2-3 paragraph context
  key_requirements            JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_revision_date          DATE,
  canonical_pdf_url           TEXT,
  "references"                JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_rigging_slugs       TEXT[] NOT NULL DEFAULT '{}',        -- bidirectional with stunt_rigging_techniques.sag_aftra_bulletin
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX safety_bulletins_category_idx ON safety_bulletins(category, sort_order);
CREATE INDEX safety_bulletins_number_idx ON safety_bulletins(bulletin_number);
CREATE INDEX safety_bulletins_rigging_slugs_gin_idx
  ON safety_bulletins USING gin (related_rigging_slugs);
