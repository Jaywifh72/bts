-- Migration 0093 — extend claim_entity_type_enum with decision_tree
-- and partnership.
--
-- CineCanon-Sentinel Phase 2 follow-up. Both /decisions/[slug] and
-- /partnerships/[slug] have UI surfaces with editorial claims (option
-- pros/cons, partnership arcs, signature collaborations) but no way
-- to attach a sourced claim to those entities for ClaimReview emission.
--
-- Adding values to a Postgres enum is non-blocking and irreversible.
-- ADD VALUE IF NOT EXISTS keeps the migration idempotent.

ALTER TYPE claim_entity_type_enum ADD VALUE IF NOT EXISTS 'decision_tree';
ALTER TYPE claim_entity_type_enum ADD VALUE IF NOT EXISTS 'partnership';
