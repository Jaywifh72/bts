-- E-25 — film school / alumni column on people, populated from
-- Wikidata's P69 (educated_at) property.
--
-- Same shape as `member_societies` (text[]): keeps the join overhead low
-- since this is a tiny per-person fact most often shown as a single line
-- on the crew detail page. If we later need school detail pages, we
-- promote this to a `schools` table + join.

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS film_schools text[] NOT NULL DEFAULT ARRAY[]::text[];
