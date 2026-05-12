-- Stunt section, phase 5 — rigging glossary.
--
-- The canonical reference for the specialised rigs working stunt
-- coordinators actually use: pole-cats, decelerators, ratchets,
-- cannon-rolls, the lot. No other industry reference site catalogues
-- this with mechanism + safety + named productions, even though the
-- vocabulary is regularly used in production reports, SAG-AFTRA
-- safety bulletins, and behind-the-scenes coverage.
--
-- `common_variants` jsonb shape:
--   Array<{ name: string, description: string }>
--
-- `references` jsonb shape (matching the rest of the archive):
--   Array<{ title: string, url: string, publication?: string, kind?: 'video' | 'article' | 'interview' | 'bulletin' | 'wikipedia' }>
--
-- `photos` jsonb shape:
--   Array<{ url: string, caption: string, credit?: string }>
--
-- `related_discipline_tags` lets a sequence carrying e.g.
-- `discipline_tags = ['high-fall', 'pole-cat']` resolve to glossary
-- entries via array overlap on this column.

CREATE TYPE stunt_rigging_category_enum AS ENUM (
  'descender',
  'wire',
  'vehicle',
  'fire',
  'fall',
  'fight',
  'aerial',
  'water'
);

CREATE TABLE stunt_rigging_techniques (
  id                          BIGSERIAL PRIMARY KEY,
  slug                        TEXT NOT NULL UNIQUE,
  name                        TEXT NOT NULL,
  category                    stunt_rigging_category_enum NOT NULL,
  tagline                     TEXT NOT NULL,
  mechanism                   TEXT NOT NULL,                       -- how the rig works mechanically
  safety_considerations       TEXT,
  sag_aftra_bulletin          TEXT,                                -- e.g. 'Bulletin #16 — Recommendations for Safety with Firearms'
  common_variants             JSONB NOT NULL DEFAULT '[]'::jsonb,
  "references"                JSONB NOT NULL DEFAULT '[]'::jsonb,
  photos                      JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_discipline_tags     TEXT[] NOT NULL DEFAULT '{}',
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX stunt_rigging_category_idx ON stunt_rigging_techniques(category, sort_order);
CREATE INDEX stunt_rigging_discipline_tags_gin_idx
  ON stunt_rigging_techniques USING gin (related_discipline_tags);
