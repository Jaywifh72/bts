-- Migration 0079 — post_houses + scoring_stages technical-spec extensions.
--
-- Working pros consult these every prep day:
--   - which dub stage is Atmos / Dolby Premier / IMAX certified?
--   - what's the booking day rate for that scoring stage?
--   - is the room atmos-capable for orchestra-to-stem deliverables?
--
-- All nullable so existing rows aren't broken.

ALTER TABLE "post_houses"
  ADD COLUMN IF NOT EXISTS "atmos_certified"          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dolby_premier_certified"  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "imax_certified"           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mix_room_count"           integer,
  ADD COLUMN IF NOT EXISTS "hdr_grading"              boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "spec_notes"               text;

CREATE INDEX IF NOT EXISTS "post_houses_atmos_idx"
  ON "post_houses" ("atmos_certified")
  WHERE "atmos_certified" = TRUE;

ALTER TABLE "scoring_stages"
  ADD COLUMN IF NOT EXISTS "day_rate_usd_min"         integer,
  ADD COLUMN IF NOT EXISTS "day_rate_usd_max"         integer,
  ADD COLUMN IF NOT EXISTS "atmos_capable"            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "year_opened"              integer,
  ADD COLUMN IF NOT EXISTS "console"                  text,                -- "Neve 88RS", "AMS Neve Genesys Black"
  ADD COLUMN IF NOT EXISTS "primary_mic_chain"        text;                -- "Decca Tree (Neumann M50) + spots"
