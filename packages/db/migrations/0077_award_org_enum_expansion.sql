-- Migration 0077 — extend award_org_enum with sound + music + stunt orgs.
--
-- The enum was frozen at 15 values from 0018. The TS classifier in
-- apps/web/lib/awards/crafts.ts already references several that aren't
-- in the DB enum (camerimage, taurus_world_stunt_awards, sag_stunt_ensemble)
-- — those awards have been seeded as 'other' until now.
--
-- This migration:
--   - Adds the missing previously-referenced values
--   - Adds society-of-X orgs the sound/music sections need: MPSE Golden
--     Reel (sound editing), CAS (sound mixing), ACE Eddie (editing),
--     SCL Awards (composers + supervisors), HPA, ADG, CDG, MUAHS, ASCAP,
--     BMI, Ivor Novello, Academy Stunt Design (placeholder).
--
-- ALTER TYPE … ADD VALUE is non-transactional in some PG versions but
-- works standalone on Neon (PG14+).

ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'camerimage';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'taurus_world_stunt_awards';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'sag_stunt_ensemble';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'academy_stunt_design';

-- Sound editorial + mixing
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'mpse_golden_reel';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'cas_award';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'hpa_award';

-- Editing
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'ace_eddie';

-- Music + composers
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'scl_award';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'ascap_film_award';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'bmi_film_award';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'ivor_novello';
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'gms_award';   -- Guild of Music Supervisors

-- Below-the-line guild + craft
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'adg_award';   -- Art Directors Guild
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'cdg_award';   -- Costume Designers Guild
ALTER TYPE "award_org_enum" ADD VALUE IF NOT EXISTS 'muahs_award'; -- Make-Up Artists & Hair Stylists Guild
