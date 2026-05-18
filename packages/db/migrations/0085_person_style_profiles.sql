-- Migration 0085 — generic style-profile table.
--
-- Single shared schema for "learn from the greats" content across
-- EVERY craft. One row per practitioner. Renders via a shared
-- <StyleProfile /> component on /crew/[slug] regardless of whether
-- the person is a DP, colorist, editor, composer, costume designer,
-- production designer, makeup department head, or stunt coordinator.
--
-- Fields:
--   philosophy            — text paragraph(s) on the practitioner's
--                           approach (lighting philosophy / cut rhythm /
--                           orchestration approach / set-design ethos).
--   signature_techniques  — text[] — bullet list of moves the
--                           practitioner is known for.
--   tools_of_choice       — text[] — their default gear / software /
--                           libraries / collaborators.
--   tells                 — text — how to RECOGNIZE their work when
--                           you don't know who shot/cut/scored/designed.
--   process_notes         — text — how they actually work day-to-day
--                           (prep depth, on-set tempo, post involvement).
--   influences            — text[] — practitioners they cite as
--                           influences.
--   career_arc            — text — short biography of their path.
--   references            — jsonb — sourced citations.

CREATE TABLE "person_style_profiles" (
  "id"                  bigserial PRIMARY KEY,
  "person_id"           bigint NOT NULL UNIQUE
                          REFERENCES "people"("id") ON DELETE CASCADE,
  "philosophy"          text,
  "signature_techniques" text[] NOT NULL DEFAULT '{}',
  "tools_of_choice"     text[] NOT NULL DEFAULT '{}',
  "tells"               text,
  "process_notes"       text,
  "influences"          text[] NOT NULL DEFAULT '{}',
  "career_arc"          text,
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "person_style_profiles_person_idx"
  ON "person_style_profiles" ("person_id");
