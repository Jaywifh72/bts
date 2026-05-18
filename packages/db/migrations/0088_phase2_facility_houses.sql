-- Migration 0088 — Phase 2 per-craft missing entities.
--
-- Three facility-shaped tables that fill obvious gaps in coverage:
--
--   costume_construction_houses — Western Costume, Cosprop, Tirelli,
--     Angels Costumes, Sands Films. The fabricators who actually make
--     the costumes; distinct from the designer credit.
--
--   music_supervision_agencies — Format Entertainment, Bonfire Music,
--     Loudhouse, Manners McDade. Source music clearance + needle drops.
--
--   adr_studios — Margarita Mix, Larson Studios, Loop Group rooms.
--     Distinct from full post houses; ADR-specialist rooms.
--
-- All three follow the FacilityProfile shape (summary, tagline,
-- headquarters, parent_company, employee_count, website, references,
-- data_tier, curated_by).
--
-- Each has a production_<entity> join table (productions × house).

CREATE TABLE "costume_construction_houses" (
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
  "specialties"         text[],
  "founders"            text[],
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "costume_construction_houses_country_idx"
  ON "costume_construction_houses" ("country");

CREATE TABLE "production_costume_construction_houses" (
  "production_id"  bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "house_id"       bigint NOT NULL REFERENCES "costume_construction_houses"("id") ON DELETE RESTRICT,
  "credited_use"   text,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("production_id", "house_id")
);
CREATE INDEX "production_costume_construction_houses_house_idx"
  ON "production_costume_construction_houses" ("house_id");

CREATE TABLE "music_supervision_agencies" (
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
  "specialties"         text[],
  "founders"            text[],
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "music_supervision_agencies_country_idx"
  ON "music_supervision_agencies" ("country");

CREATE TABLE "production_music_supervision_agencies" (
  "production_id"  bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "agency_id"      bigint NOT NULL REFERENCES "music_supervision_agencies"("id") ON DELETE RESTRICT,
  "credited_use"   text,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("production_id", "agency_id")
);
CREATE INDEX "production_music_supervision_agencies_agency_idx"
  ON "production_music_supervision_agencies" ("agency_id");

CREATE TABLE "adr_studios" (
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
  "specialties"         text[],
  "founders"            text[],
  "room_count"          integer,
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "adr_studios_country_idx" ON "adr_studios" ("country");

CREATE TABLE "production_adr_studios" (
  "production_id"  bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "studio_id"      bigint NOT NULL REFERENCES "adr_studios"("id") ON DELETE RESTRICT,
  "credited_use"   text,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("production_id", "studio_id")
);
CREATE INDEX "production_adr_studios_studio_idx"
  ON "production_adr_studios" ("studio_id");
