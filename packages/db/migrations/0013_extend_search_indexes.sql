-- Hand-written: trigram GIN indexes on studios, scenes, and published
-- videos so the search query can include them.

CREATE INDEX IF NOT EXISTS studios_name_trgm_idx
  ON studios USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS scenes_title_trgm_idx
  ON scenes USING gin (title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS production_videos_title_trgm_idx
  ON production_videos USING gin (title gin_trgm_ops);
