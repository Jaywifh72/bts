-- Stunt section, phase 8 — company memberships + production-specific
-- doubling credits.
--
-- The pre-existing data model only had:
--   • people.stunt_company_slug — single-valued, "primary affiliation"
--   • people.doubles_for       — text array of actor slugs, no production
--                                 context (can't say "X doubled Y on film Z")
--   • stunt_sequence_credits   — sequence-level only
--
-- This migration adds the two missing layers:
--
-- (a) stunt_company_members — many-to-many people↔companies, lets a
--     company surface its full roster regardless of which "primary"
--     affiliation a person carries on their own row. is_principal
--     marks the prominent / well-known members for the company page's
--     curated section.
--
-- (b) stunt_doubling_credits — production-level doubling records.
--     This is the data layer that powers "Bobby Holland Hanton was
--     Chris Hemsworth's primary stunt double on Thor: Ragnarok". Pure
--     stunt-coordination or sequence-rigging credits stay in
--     crew_assignments / stunt_sequence_credits respectively; this
--     table is specifically for the doubling relationship.

CREATE TABLE stunt_company_members (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES stunt_companies(id) ON DELETE CASCADE,
  person_id           BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  /* 'co_founder' | 'principal' | 'member' | 'associate' | 'alumnus' */
  member_role         TEXT NOT NULL DEFAULT 'member',
  joined_year         INTEGER,
  left_year           INTEGER,
  is_principal        BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, person_id)
);
CREATE INDEX stunt_company_members_company_idx
  ON stunt_company_members(company_id, is_principal DESC, sort_order);
CREATE INDEX stunt_company_members_person_idx
  ON stunt_company_members(person_id);

CREATE TYPE stunt_doubling_kind_enum AS ENUM (
  'primary_double',     -- the lead-actor's main double for the production
  'utility_double',     -- general-purpose doubling across multiple characters / supporting roles
  'driver_double',      -- specifically for vehicle work
  'fight_double',       -- specifically for fight choreography
  'aerial_double',      -- aerial / wirework specialist
  'water_double'        -- underwater / dive specialist
);

CREATE TABLE stunt_doubling_credits (
  id                          BIGSERIAL PRIMARY KEY,
  production_id               BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  doubler_person_id           BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  /* The actor being doubled. Required — without it the credit
     belongs in crew_assignments, not here. */
  doubled_person_id           BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  kind                        stunt_doubling_kind_enum NOT NULL DEFAULT 'primary_double',
  character_name              TEXT,
  notes                       TEXT,
  /* Optional cross-link if the credit ties to a specific seeded
     stunt_sequence row (rare; most rows don't). */
  primary_sequence_id         BIGINT REFERENCES stunt_sequences(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (production_id, doubler_person_id, doubled_person_id, kind)
);
CREATE INDEX stunt_doubling_credits_production_idx
  ON stunt_doubling_credits(production_id);
CREATE INDEX stunt_doubling_credits_doubler_idx
  ON stunt_doubling_credits(doubler_person_id);
CREATE INDEX stunt_doubling_credits_doubled_idx
  ON stunt_doubling_credits(doubled_person_id);
