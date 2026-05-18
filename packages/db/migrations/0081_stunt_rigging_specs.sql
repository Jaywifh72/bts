-- Migration 0081 — engineering spec fields for stunt_rigging_techniques.
--
-- Working coordinators evaluating a rig need the load + stop-distance +
-- force numbers up front. These mirror manufacturer spec cards (Decelerator
-- Systems, Air Ramp, ISC Ratchet) so the page is a real reference.

ALTER TABLE "stunt_rigging_techniques"
  ADD COLUMN IF NOT EXISTS "max_load_kg"           integer,
  ADD COLUMN IF NOT EXISTS "stop_distance_m"       numeric(5,2),
  ADD COLUMN IF NOT EXISTS "typical_g_force"       numeric(4,1),
  ADD COLUMN IF NOT EXISTS "max_height_m"          numeric(5,1),
  ADD COLUMN IF NOT EXISTS "decelerator_type"      text,            -- 'Type I (personal)' | 'Type II (vehicle)' | 'none'
  ADD COLUMN IF NOT EXISTS "primary_manufacturer"  text,            -- 'Decelerator Systems', 'Air Ramp', 'ISC', etc.
  ADD COLUMN IF NOT EXISTS "performer_certification" text;          -- e.g. 'IATSE 80 fall-rig certified', 'ICG 798 stunts'
