-- E-23 — geocoded production locations. Distinct from `scenes.location`
-- (which is free text on a per-scene basis) — this is the production-
-- level set of identified shooting locations with lat/lng so the sun
-- planner (E-32) can compute azimuth + golden-hour times.
--
-- One row per shooting location per production. `is_studio` flags
-- soundstage/lot work (where sun position is irrelevant) so the UI can
-- show "shot at Pinewood (studio)" without a useless sun widget.

CREATE TABLE IF NOT EXISTS production_locations (
  id            bigserial PRIMARY KEY,
  production_id bigint NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  name          text NOT NULL,                                -- "Wadi Rum, Jordan"
  region        text,                                         -- "Aqaba Governorate" or "New Mexico"
  country       text,                                         -- ISO-3166 alpha-2 ('JO', 'US')
  -- WGS-84 decimal degrees; numeric over float for index reproducibility
  -- (we'll likely add a btree on (production_id, lat) eventually).
  latitude      numeric(9, 6),
  longitude     numeric(9, 6),
  -- True when the "location" is a soundstage / studio lot. Sun planner
  -- hides itself for these rows.
  is_studio     boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS production_locations_production_idx
  ON production_locations(production_id);
--> statement-breakpoint
CREATE TRIGGER set_updated_at_production_locations
  BEFORE UPDATE ON production_locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
