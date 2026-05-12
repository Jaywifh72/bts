-- Migration 0051 — Cascade consistency for person FKs.
--
-- QA finding: the four person-referencing FK columns had divergent
-- ON DELETE semantics. crew_assignments.person_id used 'restrict'
-- (delete blocks if the person has crew credits), but the three
-- stunt-side tables — stunt_sequence_credits, stunt_company_members,
-- stunt_doubling_credits — used 'cascade' (delete silently removes
-- the credit rows).
--
-- The editorial-integrity argument tips strongly toward 'restrict'
-- everywhere: losing the only record that says
--   "Bobby Holland Hanton doubled Chris Hemsworth on Thor"
-- because someone soft-deleted Hanton would be irreversible — the
-- credit row is the only place that fact lives.
--
-- This migration flips the three stunt-side cascades to 'restrict',
-- aligning them with crew_assignments.
--
-- drizzle-kit wraps each migration in its own transaction.

-- stunt_sequence_credits.person_id (the performer)
ALTER TABLE stunt_sequence_credits
  DROP CONSTRAINT IF EXISTS stunt_sequence_credits_person_id_people_id_fk,
  ADD CONSTRAINT stunt_sequence_credits_person_id_people_id_fk
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT;

-- stunt_company_members.person_id (the company-member roster)
ALTER TABLE stunt_company_members
  DROP CONSTRAINT IF EXISTS stunt_company_members_person_id_people_id_fk,
  ADD CONSTRAINT stunt_company_members_person_id_people_id_fk
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT;

-- stunt_doubling_credits.doubler_person_id (the stuntperson)
ALTER TABLE stunt_doubling_credits
  DROP CONSTRAINT IF EXISTS stunt_doubling_credits_doubler_person_id_people_id_fk,
  ADD CONSTRAINT stunt_doubling_credits_doubler_person_id_people_id_fk
    FOREIGN KEY (doubler_person_id) REFERENCES people(id) ON DELETE RESTRICT;

-- stunt_doubling_credits.doubled_person_id (the actor being doubled)
ALTER TABLE stunt_doubling_credits
  DROP CONSTRAINT IF EXISTS stunt_doubling_credits_doubled_person_id_people_id_fk,
  ADD CONSTRAINT stunt_doubling_credits_doubled_person_id_people_id_fk
    FOREIGN KEY (doubled_person_id) REFERENCES people(id) ON DELETE RESTRICT;
