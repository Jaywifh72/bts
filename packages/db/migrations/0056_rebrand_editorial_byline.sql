-- Migration 0056 — Update editorial byline for the CineCanon rebrand.
--
-- Project rebranded from "Studio Pro" to "CineCanon" (cinecanon.com).
-- Migration 0054 stamped 9 hand-curated film dossiers with the byline
-- 'Studio Pro Editorial'. Already-migrated environments still hold that
-- value; update in place so the curated-by chip on every dossier reads
-- the new brand without requiring a re-seed.
--
-- Migration 0054's source has been updated too (so fresh installs ship
-- with 'CineCanon Editorial' from the start); this migration only
-- catches rows that were inserted under the old value.

UPDATE productions
SET curated_by = 'CineCanon Editorial',
    updated_at = NOW()
WHERE curated_by = 'Studio Pro Editorial';
