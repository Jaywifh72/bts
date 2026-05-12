-- T2-4: regional release dates from TMDb /movie/{id}/release_dates.
--
-- Stored as a JSONB array on productions rather than a separate table:
-- the data is read together with the production, never queried by region
-- in v1, and it'd add a join to the most-trafficked page query for no
-- analytical upside. Promote to a table if a "released this week in DE"
-- query ever shows up.
--
-- Shape: [{ country: 'US', date: '2024-03-01', type: 3, certification: 'PG-13' }, ...]
-- Type values mirror TMDb: 1=premiere, 2=theatrical_limited, 3=theatrical,
-- 4=digital, 5=physical, 6=tv.

ALTER TABLE productions ADD COLUMN IF NOT EXISTS release_dates jsonb;
