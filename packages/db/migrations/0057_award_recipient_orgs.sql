-- Migration 0057 — Extend production_awards with org-level recipients.
--
-- Until now, production_awards.recipient_person_id was the only way to
-- attribute an award to a specific recipient. That covers Oscars and DGA
-- (people) but not the awards that go to organisations:
--   • VES Awards → a VFX house (DNEG, ILM, MPC, Cinesite, …)
--   • SAG Stunt Ensemble / Taurus → a stunt company (87Eleven, Stunts
--     Unlimited, …)
--
-- Adding two optional FK columns alongside recipient_person_id. AT MOST
-- ONE recipient FK is non-null per row (CHECK constraint); a row with
-- ALL NULL recipients is a production-level award (Best Picture etc.).
-- This keeps the existing person-recipient queries unchanged while
-- supporting the new attribution paths.
--
-- Adding `camerimage` to the org enum (Polish festival; among the most
-- important DP-focused awards alongside ASC). Other DP-relevant orgs
-- (Camerimage Frog, BSC Award, ASC Award) already covered.

-- 1. Org enum extension. ADD VALUE is non-transactional and idempotent
--    when guarded with IF NOT EXISTS.
ALTER TYPE award_org_enum ADD VALUE IF NOT EXISTS 'camerimage';
--> statement-breakpoint

-- 2. Recipient FK columns. Both nullable; ON DELETE SET NULL mirrors
--    the existing recipient_person_id behavior so deleting a recipient
--    entity doesn't lose the production's award.
ALTER TABLE production_awards
  ADD COLUMN IF NOT EXISTS recipient_vfx_house_id      bigint REFERENCES vfx_houses(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_stunt_company_id  bigint REFERENCES stunt_companies(id) ON DELETE SET NULL;
--> statement-breakpoint

-- 3. CHECK: at most one recipient FK non-null per row. A row with all
--    three null is still valid — that's a production-level award where
--    no specific recipient is named.
ALTER TABLE production_awards
  DROP CONSTRAINT IF EXISTS production_awards_single_recipient_check;
ALTER TABLE production_awards
  ADD  CONSTRAINT production_awards_single_recipient_check
  CHECK (
    (
      (recipient_person_id IS NOT NULL)::int +
      (recipient_vfx_house_id IS NOT NULL)::int +
      (recipient_stunt_company_id IS NOT NULL)::int
    ) <= 1
  );
--> statement-breakpoint

-- 4. UNIQUE constraint update: previously (production, org, category,
--    year, person_id) — needs the new FK columns folded in so the same
--    award/year can route to a person AND a VFX house (e.g. VES splits
--    a category by recipient kind).
ALTER TABLE production_awards
  DROP CONSTRAINT IF EXISTS production_awards_unique;
ALTER TABLE production_awards
  DROP CONSTRAINT IF EXISTS production_awards_production_id_award_org_category_year_rec_key;
ALTER TABLE production_awards
  ADD CONSTRAINT production_awards_unique
  UNIQUE NULLS NOT DISTINCT (
    production_id, award_org, category, year,
    recipient_person_id, recipient_vfx_house_id, recipient_stunt_company_id
  );
--> statement-breakpoint

-- 5. Partial indexes for the new recipient lookups (matches the
--    existing recipient_person_idx shape — only non-null rows).
CREATE INDEX IF NOT EXISTS production_awards_recipient_vfx_idx
  ON production_awards(recipient_vfx_house_id, year DESC)
  WHERE recipient_vfx_house_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS production_awards_recipient_stunt_co_idx
  ON production_awards(recipient_stunt_company_id, year DESC)
  WHERE recipient_stunt_company_id IS NOT NULL;
--> statement-breakpoint

-- 6. Index for the awards index filter pages (org + year — most-common
--    cross-cut shape; e.g. "all 2024 BAFTA rows").
CREATE INDEX IF NOT EXISTS production_awards_org_year_idx
  ON production_awards(award_org, year DESC);
