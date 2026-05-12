-- E-01 expansion: add VES Awards (Visual Effects Society) to the
-- award_org_enum so the Wikidata backfill can tag VFX-specific honors
-- as their own org instead of bucketing under 'other'.
--
-- Reason: VES Awards are the canonical industry recognition for VFX
-- work and deserve a distinct facet on the AwardsList UI alongside
-- Oscars, BAFTAs, ASC Awards.

ALTER TYPE award_org_enum ADD VALUE IF NOT EXISTS 'ves_award';
