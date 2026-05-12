-- Migration 0052 — Drop duplicate CASCADE FKs left over from 0051.
--
-- Migration 0051 used `DROP CONSTRAINT IF EXISTS` with the wrong (drizzle-
-- internal) constraint names — the actual auto-generated names from the
-- original stunts migrations were of the form `<table>_<col>_fkey`, not
-- `<table>_<col>_<reftable>_<refcol>_fk`. The DROP IF EXISTS silently
-- skipped, then the ADD CONSTRAINT created the RESTRICT FK alongside
-- (rather than replacing) the original CASCADE FK.
--
-- Postgres applies the most-restrictive policy when multiple FKs cover
-- the same column, so the RESTRICT semantics are already in effect.
-- This migration just removes the now-redundant CASCADE entries to
-- avoid duplicate constraint checks on every insert/update.

ALTER TABLE stunt_sequence_credits
  DROP CONSTRAINT IF EXISTS stunt_sequence_credits_person_id_fkey;

ALTER TABLE stunt_company_members
  DROP CONSTRAINT IF EXISTS stunt_company_members_person_id_fkey;

ALTER TABLE stunt_doubling_credits
  DROP CONSTRAINT IF EXISTS stunt_doubling_credits_doubler_person_id_fkey,
  DROP CONSTRAINT IF EXISTS stunt_doubling_credits_doubled_person_id_fkey;
