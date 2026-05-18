-- Migration 0073 (PROPOSED) — score_works: per-production scoring metadata.
--
-- One row per (production, composer). A score by Reznor + Ross is two
-- rows (one per composer) so the index page can rank composers cleanly
-- and the production page renders them together via the join.
--
-- Orchestra / scoring location / themes_text are editorial fields —
-- can land empty and be filled later. score_works is the join surface
-- music_cues hangs off of (migration 0074).

CREATE TABLE "score_works" (
  "id"                       bigserial PRIMARY KEY,
  "production_id"            bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "composer_person_id"       bigint NOT NULL REFERENCES "people"("id")       ON DELETE RESTRICT,
  "co_composer_person_ids"   bigint[] NOT NULL DEFAULT '{}',     -- additional co-composers; UI shows "with X & Y"
  "scoring_mixer_person_id"  bigint REFERENCES "people"("id")    ON DELETE SET NULL,
  "music_editor_person_id"   bigint REFERENCES "people"("id")    ON DELETE SET NULL,
  "scoring_stage_id"         bigint REFERENCES "scoring_stages"("id") ON DELETE SET NULL,
  "recording_orchestra"      text,                                -- "London Symphony Orchestra"
  "recording_location"       text,                                -- "Abbey Road Studio One" (free text fallback when stage_id not set)
  "session_dates"            daterange,                           -- when sessions ran; supports unknown bounds
  "cue_count_estimate"       integer,                             -- editorial; nullable
  "runtime_minutes"          integer,
  "release_label"            text,
  "release_format"           text,                                -- 'cd' | 'digital' | 'vinyl' | 'none' | 'mixed'
  "release_url"              text,
  "themes_summary"           text,                                -- editorial: "three main themes — protagonist, antagonist, place"
  "summary"                  text,                                -- editorial: overall approach
  "data_tier"                production_data_tier NOT NULL DEFAULT 'imported',
  "last_verified_at"         timestamp with time zone,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "score_works_unique" UNIQUE ("production_id", "composer_person_id")
);

CREATE INDEX "score_works_production_idx" ON "score_works" ("production_id");
CREATE INDEX "score_works_composer_idx"   ON "score_works" ("composer_person_id");
CREATE INDEX "score_works_stage_idx"      ON "score_works" ("scoring_stage_id") WHERE "scoring_stage_id" IS NOT NULL;

-- score_work_sources — citations for the score_work as a whole (liner
-- notes, ScoringSessions.com, La-La Land press, composer interview).
CREATE TABLE "score_work_sources" (
  "score_work_id"  bigint NOT NULL REFERENCES "score_works"("id") ON DELETE CASCADE,
  "source_id"      bigint NOT NULL REFERENCES "sources"("id")      ON DELETE RESTRICT,
  "confidence"     source_confidence_enum NOT NULL,
  "claim_quote"    text,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "score_work_sources_pk" PRIMARY KEY ("score_work_id", "source_id")
);

CREATE INDEX "score_work_sources_source_idx" ON "score_work_sources" ("source_id");
