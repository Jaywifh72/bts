-- Migration 0086 — practitioner_partnerships.
--
-- Captures the long-term creative pairs that define entire careers:
-- Scorsese × Schoonmaker (27 features), Spielberg × Williams (30+),
-- Coens × Burwell (19), Anderson × Yeoman, Anderson × Stockhausen,
-- Fincher × Ren Klyce, etc.
--
-- The film count + year range are derived at query time from
-- crew_assignments (so always fresh). Only the editorial fields are
-- stored here.
--
-- Self-edges allowed (e.g. composer × director where both are people
-- in the people table). Order is canonical: primary_person_id is
-- the "anchor" (usually the director); partner_person_id is the
-- collaborator.

CREATE TABLE "practitioner_partnerships" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,                    -- "scorsese-schoonmaker"
  "primary_person_id"   bigint NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "partner_person_id"   bigint NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "partner_role"        text NOT NULL,                            -- "editor", "composer", "cinematographer", "production designer"
  "arc_summary"         text,                                     -- 2-4 paragraph editorial on the relationship arc
  "signature_films"     text[] NOT NULL DEFAULT '{}',             -- ['raging-bull', 'goodfellas', 'the-departed']
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "practitioner_partnerships_unique"
    UNIQUE ("primary_person_id", "partner_person_id", "partner_role")
);

CREATE INDEX "practitioner_partnerships_primary_idx"
  ON "practitioner_partnerships" ("primary_person_id");
CREATE INDEX "practitioner_partnerships_partner_idx"
  ON "practitioner_partnerships" ("partner_person_id");
