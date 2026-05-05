-- T1-3: data-freshness signal on productions. Working pros need to know
-- if equipment data was last touched in 2022 or last week.
--
-- Default to NOW() so legacy rows get a non-null value. Manual edits
-- through the admin UI (or seed re-runs) bump this; the bulk TMDb
-- enrich does NOT bump it (we only update last_verified_at when human
-- review touches the row, not when machines refresh metadata).

ALTER TABLE productions ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone;
--> statement-breakpoint
-- Backfill: curated rows = NOW() (someone hand-touched them recently).
-- Imported rows = NULL (we've never had a human verify them).
UPDATE productions SET last_verified_at = NOW() WHERE data_tier = 'curated';
