-- Migration 0074 (PROPOSED) — music_cues: flagship cues per score.
--
-- Goal per locked decision: full coverage for the curated tier — roughly
-- 500 cues across the top 50 films. Cue rows are intentionally sparse:
-- title + runtime + scene_label + function + recording_session_date are
-- enough for the listening-guide UI. Citations attach via music_cue_sources.
--
-- The `cue_function` enum codifies what the cue DOES in the picture, not
-- what it sounds like — that's how composers and music editors talk.

CREATE TYPE "music_cue_function_enum" AS ENUM (
  'main_title',          -- opening titles
  'end_credits',
  'theme_intro',         -- first statement of a theme
  'theme_restatement',
  'transition',          -- bridges scenes
  'underscore',          -- general scene scoring
  'source',              -- diegetic, in-world music
  'source_to_score',     -- transition diegetic → non-diegetic
  'montage',
  'action_set_piece',
  'reveal',
  'emotional_beat',
  'silence_to_score',    -- entry from silence (notable cue type)
  'other'
);

CREATE TABLE "music_cues" (
  "id"                          bigserial PRIMARY KEY,
  "score_work_id"               bigint NOT NULL REFERENCES "score_works"("id") ON DELETE CASCADE,
  "slug"                        text NOT NULL,                       -- unique within score_work
  "title"                       text NOT NULL,                       -- cue sheet name, e.g. "Time"
  "track_number"                integer,                              -- release-album track if applicable
  "runtime_seconds"             integer,
  "scene_label"                 text,                                 -- "warehouse drop, chapter 2"
  "scene_minute"                integer,                              -- approximate timecode in mins
  "cue_function"                music_cue_function_enum NOT NULL DEFAULT 'underscore',
  "key_signature"               text,                                 -- editorial; nullable
  "tempo_bpm"                   integer,
  "instrumentation_summary"     text,                                 -- "solo cello + sub bass + orchestral pads"
  "recording_session_date"      date,
  "listening_notes"             text,                                 -- editorial: what to listen for
  "notable_for"                 text,                                 -- single-sentence why-it-matters
  "is_flagship"                 boolean NOT NULL DEFAULT false,       -- "must-include in any listening guide"
  "data_tier"                   production_data_tier NOT NULL DEFAULT 'imported',
  "created_at"                  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "music_cues_score_slug_unique" UNIQUE ("score_work_id", "slug")
);

CREATE INDEX "music_cues_score_work_idx" ON "music_cues" ("score_work_id", "track_number");
CREATE INDEX "music_cues_flagship_idx"   ON "music_cues" ("is_flagship") WHERE "is_flagship" = TRUE;
CREATE INDEX "music_cues_function_idx"   ON "music_cues" ("cue_function");

CREATE TABLE "music_cue_sources" (
  "cue_id"        bigint NOT NULL REFERENCES "music_cues"("id") ON DELETE CASCADE,
  "source_id"     bigint NOT NULL REFERENCES "sources"("id")    ON DELETE RESTRICT,
  "confidence"    source_confidence_enum NOT NULL,
  "claim_quote"   text,
  "notes"         text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "music_cue_sources_pk" PRIMARY KEY ("cue_id", "source_id")
);

CREATE INDEX "music_cue_sources_source_idx" ON "music_cue_sources" ("source_id");

-- Performer credits per cue (soloists). Nullable orchestra column when
-- the cue uses ensemble that's already on score_works.recording_orchestra.
CREATE TABLE "music_cue_performers" (
  "id"             bigserial PRIMARY KEY,
  "cue_id"         bigint NOT NULL REFERENCES "music_cues"("id") ON DELETE CASCADE,
  "person_id"      bigint REFERENCES "people"("id")              ON DELETE SET NULL,
  "credited_as"    text,                                          -- override display when person_id null
  "instrument"     text NOT NULL,                                 -- "solo cello", "vocals"
  "is_soloist"     boolean NOT NULL DEFAULT true,
  "sort_order"     integer NOT NULL DEFAULT 0,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "music_cue_performers_cue_idx"    ON "music_cue_performers" ("cue_id", "sort_order");
CREATE INDEX "music_cue_performers_person_idx" ON "music_cue_performers" ("person_id") WHERE "person_id" IS NOT NULL;
