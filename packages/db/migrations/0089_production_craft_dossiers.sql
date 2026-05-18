-- Migration 0089 — production_craft_dossiers.
--
-- Per-production editorial deep-dives for crafts that deserve a long
-- form treatment beyond a credit line: production design, costume,
-- makeup & hair. Each dossier hangs off a single production and
-- carries an editorial body + structured beats (signature_looks,
-- techniques, references_consulted) + sourced references.
--
-- Surfaced via three filtered routes:
--   /pd/works
--   /costume-hair-makeup/works
--   /costume-hair-makeup/makeup-works
--
-- One dossier per (production, craft, lead_credit). lead_credit
-- distinguishes e.g. a costume dossier on a film with two co-designers.

CREATE TABLE "production_craft_dossiers" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "production_id"       bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "craft"               text NOT NULL,                            -- 'pd', 'costume', 'makeup-hair'
  "headline"            text NOT NULL,                            -- "The world of Asteroid City"
  "lead_credit"         text,                                     -- "Adam Stockhausen (PD)"
  "lead_person_id"      bigint REFERENCES "people"("id") ON DELETE SET NULL,
  "summary"             text,                                     -- 1-2 paragraph editorial
  "body"                text,                                     -- long-form deep-dive (markdown-ish)
  "signature_looks"     text[] NOT NULL DEFAULT '{}',             -- e.g. "burnt-orange motel exteriors"
  "techniques"          text[] NOT NULL DEFAULT '{}',             -- ["forced perspective miniatures", "saturated single-source key"]
  "references_consulted" text[] NOT NULL DEFAULT '{}',            -- the research the team did
  "collaborators"       text[] NOT NULL DEFAULT '{}',             -- supporting dept heads
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "production_craft_dossiers_unique"
    UNIQUE ("production_id", "craft", "lead_credit")
);

CREATE INDEX "production_craft_dossiers_craft_idx"
  ON "production_craft_dossiers" ("craft");
CREATE INDEX "production_craft_dossiers_production_idx"
  ON "production_craft_dossiers" ("production_id");
CREATE INDEX "production_craft_dossiers_lead_idx"
  ON "production_craft_dossiers" ("lead_person_id");
