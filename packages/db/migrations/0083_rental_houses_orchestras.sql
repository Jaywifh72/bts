-- Migration 0083 — two new facility entity types.
--
-- (1) rental_houses — Panavision, Keslow, Otto Nemenz, Fletcher Camera,
--     Stray Angel, ARRI Rental, etc. The companies DPs actually phone
--     during prep. Currently invisible on the site.
--
-- (2) recording_orchestras — LSO, Vienna Synchron Stage Orchestra,
--     Hollywood Studio Symphony, Boston Symphony, Skywalker Symphony.
--     These are referenced as text in score_works.recording_orchestra;
--     promoting to entities lets cross-cuts work ("every LSO scoring
--     credit on a 2020+ feature").
--
-- Both follow the FacilityProfile editorial template so they render
-- using the shared component with zero new UI work.

-- ── rental_houses ──────────────────────────────────────────────────
CREATE TABLE "rental_houses" (
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
  "specialties"         text[],                        -- ['camera', 'lens', 'lighting', 'grip', 'sound', 'gimbal']
  "stocks_brands"       text[],                        -- which manufacturers' gear they carry ['arri', 'cooke', 'panavision', 'sony', 'red']
  "branch_count"        integer,                        -- how many physical locations
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "rental_houses_country_idx" ON "rental_houses" ("country");

CREATE TABLE "production_rental_houses" (
  "production_id"   bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "rental_house_id" bigint NOT NULL REFERENCES "rental_houses"("id") ON DELETE RESTRICT,
  "kit_type"        text,                             -- 'A-camera', 'B-camera', 'lighting+grip', 'sound bag'
  "notes"           text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_rental_houses_pk" PRIMARY KEY ("production_id", "rental_house_id", "kit_type")
);

CREATE INDEX "production_rental_houses_rental_idx" ON "production_rental_houses" ("rental_house_id");

-- ── recording_orchestras ───────────────────────────────────────────
CREATE TABLE "recording_orchestras" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "name"                text NOT NULL,
  "short_name"          text,                          -- "LSO", "VSSO", "RPO"
  "country"             text,
  "city"                text,
  "founded_year"        integer,
  "music_director"      text,                          -- current music director
  "primary_scoring_stage_id" bigint REFERENCES "scoring_stages"("id") ON DELETE SET NULL,
  "ensemble_size"       integer,                        -- typical session size
  "specialties"         text[],                        -- ['film scoring', 'classical', 'opera', 'recording']
  "website"             text,
  "wikidata_id"         text UNIQUE,
  "summary"             text,
  "tagline"             text,
  "parent_company"      text,
  "careers_url"         text,
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "recording_orchestras_country_idx" ON "recording_orchestras" ("country");

-- Productions × orchestra (the canonical "Recorded by X" credit on a film score).
CREATE TABLE "score_work_orchestras" (
  "score_work_id"  bigint NOT NULL REFERENCES "score_works"("id") ON DELETE CASCADE,
  "orchestra_id"   bigint NOT NULL REFERENCES "recording_orchestras"("id") ON DELETE RESTRICT,
  "ensemble_size"  integer,                            -- size for THIS specific session
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "score_work_orchestras_pk" PRIMARY KEY ("score_work_id", "orchestra_id")
);

CREATE INDEX "score_work_orchestras_orch_idx" ON "score_work_orchestras" ("orchestra_id");
