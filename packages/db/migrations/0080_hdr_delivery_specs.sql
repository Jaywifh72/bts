-- Migration 0080 — HDR delivery specs on production_color_pipelines.
--
-- The 'deliverable' text column is too coarse for working colorists
-- who need to know: Dolby Vision profile? HDR10+? Peak nits?
-- Mastering display setup? These are the questions every prep call
-- with Netflix / Apple / Dolby Vision finishing has to answer.

ALTER TABLE "production_color_pipelines"
  ADD COLUMN IF NOT EXISTS "hdr_format"               text,         -- 'dolby_vision' | 'hdr10' | 'hdr10_plus' | 'hlg' | 'sdr_only' | 'multiple'
  ADD COLUMN IF NOT EXISTS "hdr_peak_nits"            integer,      -- target peak luminance for mastering
  ADD COLUMN IF NOT EXISTS "dolby_vision_profile"     text,         -- 'Profile 5' | 'Profile 8.1' | 'Profile 8.4'
  ADD COLUMN IF NOT EXISTS "mastering_display_nits"   integer,      -- e.g. 1000 / 2000 / 4000
  ADD COLUMN IF NOT EXISTS "ambient_light_nits"       integer,      -- viewing room ambient — usually 5 nits
  ADD COLUMN IF NOT EXISTS "color_chart"              text,         -- 'X-Rite ColorChecker Passport' / 'DSC Labs OneShot'
  ADD COLUMN IF NOT EXISTS "show_lut_filename"        text,         -- the .cube / .ccc file name shipped to DI
  ADD COLUMN IF NOT EXISTS "show_lut_url"             text;         -- when public, link to it
