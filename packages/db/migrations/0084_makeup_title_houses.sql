-- Migration 0084 — two more facility entity types.
--
-- (1) makeup_effects_houses — KNB EFX, Spectral Motion, Legacy Effects,
--     Tom Savini Studios. Practical-effects fabrication shops.
--     Sister-discipline to costume construction; same shape.
--
-- (2) title_sequence_houses — Imaginary Forces, Prologue Films, Mill+,
--     Picturemill. Title + main-on-end / opening-credits design shops.
--     Distinct industry from VFX or motion graphics.

-- ── makeup_effects_houses ──────────────────────────────────────────
CREATE TABLE "makeup_effects_houses" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "name"                text NOT NULL,
  "country"             text,
  "city"                text,
  "headquarters"        text,
  "founded_year"        integer,
  "parent_company"      text,
  "employee_count"      integer,
  "website"             text,
  "careers_url"         text,
  "reel_url"            text,
  "wikidata_id"         text UNIQUE,
  "summary"             text,
  "tagline"             text,
  "specialties"         text[],                        -- ['prosthetics', 'creature design', 'aging makeup', 'animatronics']
  "founders"            text[],                        -- ['Greg Nicotero', 'Howard Berger', 'Robert Kurtzman']
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "makeup_effects_houses_country_idx" ON "makeup_effects_houses" ("country");

CREATE TABLE "production_makeup_effects_houses" (
  "production_id" bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "house_id"      bigint NOT NULL REFERENCES "makeup_effects_houses"("id") ON DELETE RESTRICT,
  "credited_use"  text,
  "notes"         text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_makeup_effects_houses_pk" PRIMARY KEY ("production_id", "house_id")
);

CREATE INDEX "production_makeup_effects_houses_house_idx"
  ON "production_makeup_effects_houses" ("house_id");

-- ── title_sequence_houses ──────────────────────────────────────────
CREATE TABLE "title_sequence_houses" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "name"                text NOT NULL,
  "country"             text,
  "city"                text,
  "headquarters"        text,
  "founded_year"        integer,
  "parent_company"      text,
  "employee_count"      integer,
  "website"             text,
  "careers_url"         text,
  "reel_url"            text,
  "wikidata_id"         text UNIQUE,
  "summary"             text,
  "tagline"             text,
  "specialties"         text[],                        -- ['main-on-end', 'opening sequence', 'motion graphics', 'broadcast graphics']
  "founders"            text[],                        -- ['Karin Fong', 'Saul Bass', etc.]
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "title_sequence_houses_country_idx" ON "title_sequence_houses" ("country");

CREATE TABLE "production_title_sequence_houses" (
  "production_id" bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "house_id"      bigint NOT NULL REFERENCES "title_sequence_houses"("id") ON DELETE RESTRICT,
  "sequence_kind" text,                                -- 'main-title' | 'main-on-end' | 'in-show graphics'
  "notes"         text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_title_sequence_houses_pk" PRIMARY KEY ("production_id", "house_id", "sequence_kind")
);

CREATE INDEX "production_title_sequence_houses_house_idx"
  ON "production_title_sequence_houses" ("house_id");
