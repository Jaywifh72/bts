-- Migration 0054 — Editorial bylines on curated productions.
--
-- E-E-A-T move: every curated production should attribute the human (or
-- pen-name + bio) who authored the dossier. Without bylines, AI engines
-- treat the corpus as anonymous user-generated content. With bylines,
-- it reads as trade publication.
--
-- The columns are nullable so imported rows pass through unchanged. The
-- UI surfaces "Curated by … · Last reviewed YYYY-MM-DD" on the hero of
-- every production whose data_tier = 'curated' AND curated_by IS NOT NULL.

ALTER TABLE productions
  ADD COLUMN IF NOT EXISTS curated_by TEXT,
  ADD COLUMN IF NOT EXISTS curated_by_url TEXT,
  ADD COLUMN IF NOT EXISTS last_curated_review TIMESTAMPTZ;

-- Stamp the 9 deeply-seeded films with the canonical editorial byline.
-- The operator is anonymous-by-default; pen-name "CineCanon Editorial"
-- attributes the work without requiring a real-name disclosure yet.
UPDATE productions
SET curated_by = 'CineCanon Editorial',
    curated_by_url = NULL,
    last_curated_review = NOW()
WHERE slug IN (
  'top-gun-maverick-2022',
  'blade-runner-2049-2017',
  'gravity-2013',
  'the-revenant-2015',
  'parasite-2019',
  'the-brutalist-2024',
  'children-of-men-2006',
  'no-country-for-old-men-2007',
  'anora-2024'
);
