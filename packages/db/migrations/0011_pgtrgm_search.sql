-- Hand-written migration: pg_trgm extension + GIN trigram indexes for
-- multi-entity search across productions, people, gear, and VFX houses.
--
-- These objects are NOT introspected by Drizzle Kit (no schema.ts changes).
-- If you re-run `drizzle-kit generate`, this migration is unaffected and
-- the indexes remain in place. The corresponding _journal.json entry was
-- also added by hand.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS productions_title_trgm_idx
  ON productions USING gin (title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS productions_original_title_trgm_idx
  ON productions USING gin (original_title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS people_display_name_trgm_idx
  ON people USING gin (display_name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS equipment_manufacturers_name_trgm_idx
  ON equipment_manufacturers USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS equipment_series_name_trgm_idx
  ON equipment_series USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS equipment_items_name_trgm_idx
  ON equipment_items USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS vfx_houses_name_trgm_idx
  ON vfx_houses USING gin (name gin_trgm_ops);
