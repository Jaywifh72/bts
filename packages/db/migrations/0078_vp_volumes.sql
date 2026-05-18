-- Migration 0078 — vp_volumes.
--
-- Virtual production LED-volume / ICVFX stage catalog. Stagecraft
-- (ILM), MARS (Pinewood), Volume 51 (Disney), Lux Machina, etc.
-- This is a citable cross-cut nobody else aggregates and a high-
-- leverage entity for the VFX / VP side of the working pro audience.
--
-- Shape mirrors post_houses + scoring_stages for rendering parity.

CREATE TABLE "vp_volumes" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "name"                text NOT NULL,
  "facility_name"       text,                                -- "ILM Manhattan Beach"
  "operator"            text,                                -- "Lucasfilm / ILM"
  "country"             text,
  "city"                text,
  "led_brand"           text,                                -- "ROE Visual Black Pearl 2.8mm"
  "led_pitch_mm"        numeric(4,2),                        -- 2.3 / 2.6 / 2.84 / 3.9
  "wall_width_m"        numeric(5,2),
  "wall_height_m"       numeric(5,2),
  "ceiling_present"     boolean NOT NULL DEFAULT false,
  "ceiling_height_m"    numeric(5,2),
  "tracking_system"     text,                                -- "Mo-Sys StarTracker", "Stype"
  "render_engine"       text,                                -- "Unreal Engine 5", "Aximmetry"
  "color_pipeline"      text,                                -- "ACES + OCIO", "ARRI native"
  "completion_year"     integer,
  "atmos_capable"       boolean NOT NULL DEFAULT false,
  "website_url"         text,
  "summary"             text,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "vp_volumes_country_idx" ON "vp_volumes" ("country");
CREATE INDEX "vp_volumes_operator_idx" ON "vp_volumes" ("operator");

-- Per-production usage. A film may have used multiple volumes (Mandalorian
-- shot at two Stagecraft locations across seasons). credited_use captures
-- HOW it was used ("environment plates", "in-camera VFX", "interactive lighting").
CREATE TABLE "production_vp_volumes" (
  "production_id"      bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "volume_id"          bigint NOT NULL REFERENCES "vp_volumes"("id") ON DELETE RESTRICT,
  "credited_use"       text,
  "notes"              text,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_vp_volumes_pk" PRIMARY KEY ("production_id", "volume_id")
);

CREATE INDEX "production_vp_volumes_volume_idx" ON "production_vp_volumes" ("volume_id");

-- Source citations for volume credits.
CREATE TABLE "production_vp_volume_sources" (
  "production_id"  bigint NOT NULL,
  "volume_id"      bigint NOT NULL,
  "source_id"      bigint NOT NULL REFERENCES "sources"("id") ON DELETE RESTRICT,
  "confidence"     source_confidence_enum NOT NULL,
  "claim_quote"    text,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_vp_volume_sources_pk" PRIMARY KEY ("production_id", "volume_id", "source_id"),
  CONSTRAINT "production_vp_volume_sources_credit_fk" FOREIGN KEY ("production_id", "volume_id")
    REFERENCES "production_vp_volumes" ("production_id", "volume_id") ON DELETE CASCADE
);
