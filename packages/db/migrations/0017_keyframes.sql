-- T2-7: curated key frames per production. Hand-picked stills (3-4 per
-- curated film) that represent the visual signature of the production —
-- the kind of frames a DP would clip out of a film as reference.
--
-- Distinct from `productions.backdrop_path` (single TMDb hero) and from
-- MediaGallery's auto-pulled TMDb backdrops: those are marketing assets,
-- these are editorial choices.

CREATE TABLE IF NOT EXISTS production_keyframes (
  id           bigserial PRIMARY KEY,
  production_id bigint NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  image_url    text NOT NULL,
  caption      text,
  -- Optional FK to a specific scene the frame illustrates. `set null` so
  -- deleting the scene doesn't drop the frame; the frame degrades to a
  -- production-level still.
  scene_id     bigint REFERENCES scenes(id) ON DELETE SET NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS production_keyframes_production_idx
  ON production_keyframes(production_id, sort_order);
--> statement-breakpoint
CREATE TRIGGER set_updated_at_production_keyframes
  BEFORE UPDATE ON production_keyframes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
