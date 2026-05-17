-- Migration 0075 (PROPOSED) — sound_libraries + production credits.
--
-- Sparse table — catalogs the third-party SFX libraries credited on
-- productions. Uniquely citable surface: nobody else compiles "which
-- films credit Soundly / A Sound Effect / Boom Library / Pro Sound
-- Effects". Useful for sound-design landing pages and "what was used
-- on this film" production-side queries.

CREATE TABLE "sound_libraries" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "name"                text NOT NULL,
  "publisher"           text,                        -- "Boom Library GmbH"
  "country"             text,
  "founded_year"        integer,
  "website_url"         text,
  "summary"             text,
  "specialties"         text[],                      -- ['weapons', 'vehicles', 'ambience']
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "sound_libraries_country_idx" ON "sound_libraries" ("country") WHERE "country" IS NOT NULL;

CREATE TABLE "production_sound_libraries" (
  "production_id"      bigint NOT NULL REFERENCES "productions"("id")     ON DELETE CASCADE,
  "library_id"         bigint NOT NULL REFERENCES "sound_libraries"("id") ON DELETE RESTRICT,
  "credited_use"       text,                          -- "creature vocalizations", "ambience beds"
  "credited_in"        text,                          -- "end credits" | "press kit" | "interview"
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_sound_libraries_pk" PRIMARY KEY ("production_id", "library_id")
);

CREATE INDEX "production_sound_libraries_lib_idx" ON "production_sound_libraries" ("library_id");

-- Cite individual library credits via the same sources table everything
-- else uses. Junction table for completeness.
CREATE TABLE "production_sound_library_sources" (
  "production_id"  bigint NOT NULL,
  "library_id"     bigint NOT NULL,
  "source_id"      bigint NOT NULL REFERENCES "sources"("id") ON DELETE RESTRICT,
  "confidence"     source_confidence NOT NULL,
  "claim_quote"    text,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_sound_library_sources_pk" PRIMARY KEY ("production_id", "library_id", "source_id"),
  CONSTRAINT "production_sound_library_sources_credit_fk" FOREIGN KEY ("production_id", "library_id")
    REFERENCES "production_sound_libraries" ("production_id", "library_id") ON DELETE CASCADE
);
