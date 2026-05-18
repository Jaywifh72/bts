-- Migration 0090 — annotated_walkthroughs + walkthrough_beats.
--
-- The annotated-walkthrough layer is what turns CineCanon from a
-- catalog into a teaching tool. Three flavors share the same shape:
--
--   'edit-scene'  — shot-by-shot editing breakdown of a scene
--                   (e.g. the helicopter sequence in Apocalypse Now)
--   'music-cue'   — listening guide for a single score cue
--                   (e.g. Day One from Oppenheimer, every entry beat)
--   'vfx-shot'    — practical-vs-CG shot anatomy
--                   (e.g. the truck flip in The Dark Knight)
--
-- Each walkthrough belongs to a production and carries a string of
-- timestamped beats. A beat has a timecode (00:01:23.5) + optional
-- duration_s + label + notes + optional beat_kind tag
-- ('cut', 'cue-in', 'comp-layer', etc).
--
-- Surfaced via:
--   /editing/walkthroughs
--   /music/cue-guides
--   /vfx/shot-breakdowns
-- All link into shared /walkthroughs/[slug].

CREATE TABLE "annotated_walkthroughs" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "production_id"       bigint NOT NULL REFERENCES "productions"("id") ON DELETE CASCADE,
  "kind"                text NOT NULL,                            -- 'edit-scene' | 'music-cue' | 'vfx-shot'
  "headline"            text NOT NULL,                            -- "Day One — cue entrance map"
  "scene_label"         text,                                     -- "Trinity countdown" or "Helicopter assault"
  "lead_credit"         text,                                     -- "Thelma Schoonmaker (editor)"
  "lead_person_id"      bigint REFERENCES "people"("id") ON DELETE SET NULL,
  "duration_s"          integer,                                  -- length of the scene/cue/shot
  "summary"             text,                                     -- 1-2 paragraph editorial framing
  "body"                text,                                     -- long-form deep-dive
  "tags"                text[] NOT NULL DEFAULT '{}',             -- ['parallel action', 'long take', 'overlap edit']
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "annotated_walkthroughs_kind_idx"
  ON "annotated_walkthroughs" ("kind");
CREATE INDEX "annotated_walkthroughs_production_idx"
  ON "annotated_walkthroughs" ("production_id");
CREATE INDEX "annotated_walkthroughs_lead_idx"
  ON "annotated_walkthroughs" ("lead_person_id");

CREATE TABLE "walkthrough_beats" (
  "id"                  bigserial PRIMARY KEY,
  "walkthrough_id"      bigint NOT NULL REFERENCES "annotated_walkthroughs"("id") ON DELETE CASCADE,
  "timecode"            text NOT NULL,                            -- "00:01:23.500" or "01:24" — display string
  "timecode_s"          numeric(10,3),                            -- seconds from scene start, for ordering
  "duration_s"          numeric(10,3),                            -- optional beat length
  "beat_kind"           text,                                     -- 'cut' | 'cue-in' | 'comp-layer' | 'foley' | 'practical-element' | 'cg-element'
  "label"               text NOT NULL,                            -- "Cut to wide on rotor"
  "notes"               text,                                     -- deeper editorial
  "sort_order"          integer NOT NULL DEFAULT 0,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "walkthrough_beats_walkthrough_idx"
  ON "walkthrough_beats" ("walkthrough_id");
CREATE INDEX "walkthrough_beats_timecode_idx"
  ON "walkthrough_beats" ("walkthrough_id", "timecode_s");
