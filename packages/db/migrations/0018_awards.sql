-- T2-6/T3-5: production awards. Cinematography Oscar nominee/winner is
-- the single biggest "this film mattered" signal for working DPs and
-- directors; surfacing awards next to a film's tech panel and on the
-- crew detail page closes a credibility gap vs. ShotOnWhat / IMDb.
--
-- One row per (production, award_org, category, year). `is_winner`
-- distinguishes win vs nomination. `recipient_person_id` is set when
-- the award was given to a specific named crew member (e.g.
-- Cinematography Oscar → the DP) so /crew/[slug] can list awards too;
-- it's null for production-level awards (Best Picture).

CREATE TYPE award_org_enum AS ENUM (
  'academy_awards',
  'bafta',
  'cannes',
  'golden_globes',
  'critics_choice',
  'asc_award',
  'aso_award',
  'csc_award',
  'bsc_award',
  'spirit_awards',
  'venice',
  'berlin',
  'other'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS production_awards (
  id                  bigserial PRIMARY KEY,
  production_id       bigint NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  award_org           award_org_enum NOT NULL,
  category            text NOT NULL,
  year                integer NOT NULL,
  is_winner           boolean NOT NULL DEFAULT false,
  -- Optional crew recipient. null for production-level awards (Best Picture).
  -- ON DELETE SET NULL so deleting a person doesn't lose the production's award.
  recipient_person_id bigint REFERENCES people(id) ON DELETE SET NULL,
  source_url          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_id, award_org, category, year, recipient_person_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS production_awards_production_idx
  ON production_awards(production_id, year DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS production_awards_recipient_idx
  ON production_awards(recipient_person_id, year DESC)
  WHERE recipient_person_id IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER set_updated_at_production_awards
  BEFORE UPDATE ON production_awards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
