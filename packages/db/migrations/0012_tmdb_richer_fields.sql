-- Hand-written migration: extra TMDb-sourced fields on productions, plus
-- a 'data_tier' marker so the UI can distinguish hand-curated rows from
-- bulk-imported metadata stubs.

-- Genres are stored as a text[] array (we don't need a normalized table for
-- a small fixed enum and TMDb's genre list is stable).
ALTER TABLE productions ADD COLUMN IF NOT EXISTS genres text[];
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS original_language text;
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS production_country text;
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS popularity numeric(8,2);
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS vote_average numeric(3,1);
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS vote_count integer;
--> statement-breakpoint
-- Cached TMDb image paths so we don't re-fetch /images on every render.
-- Path only (e.g. '/abc.jpg'); the size segment is added at render time.
ALTER TABLE productions ADD COLUMN IF NOT EXISTS poster_path text;
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS backdrop_path text;
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS tmdb_collection_id integer;
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS tmdb_collection_name text;
--> statement-breakpoint
-- 'curated' = hand-seeded with crew/scenes/equipment depth.
-- 'imported' = bulk TMDb metadata only; UI should signal this.
DO $$ BEGIN
  CREATE TYPE production_data_tier AS ENUM ('curated', 'imported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS data_tier production_data_tier NOT NULL DEFAULT 'imported';
--> statement-breakpoint
-- Hand-seeded productions are everything that pre-existed before the TMDb
-- bulk import. We can detect them as productions referenced by hand-curated
-- crew/scenes/equipment data.
UPDATE productions SET data_tier = 'curated'
  WHERE id IN (
    SELECT DISTINCT production_id FROM crew_assignments
    UNION
    SELECT DISTINCT production_id FROM scenes
    UNION
    SELECT DISTINCT production_id FROM production_studios
  );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS productions_data_tier_idx ON productions (data_tier);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS productions_popularity_idx ON productions (popularity DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS productions_vote_average_idx ON productions (vote_average DESC NULLS LAST);
--> statement-breakpoint
-- TMDb person id on people for crew ingestion dedup. Nullable because
-- hand-seeded people pre-date this column; the upsert in the credits
-- importer fills it in lazily.
ALTER TABLE people ADD COLUMN IF NOT EXISTS tmdb_person_id integer;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS people_tmdb_person_id_unique
  ON people (tmdb_person_id) WHERE tmdb_person_id IS NOT NULL;
--> statement-breakpoint
-- Optional cached profile image path (relative TMDb path; size suffix added at render).
ALTER TABLE people ADD COLUMN IF NOT EXISTS profile_path text;
