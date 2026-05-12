-- E-22 — per-scene lighting plot beyond what equipment_usage carries.
-- A "setup" groups fixtures into a named lighting configuration
-- ("master coverage", "reverse on Margot", "blue magic-hour wash")
-- with role classification, diffusion stack, color temperature, and
-- supervisor notes.
--
-- equipment_usage stays the source of truth for "which fixture was on
-- this scene". This table promotes a subset of those usages into a
-- structured plot.
CREATE TYPE lighting_role_enum AS ENUM (
  'key',
  'fill',
  'back',
  'rim',
  'kicker',
  'practical',
  'eye_light',
  'ambient',
  'hair_light',
  'set_light',
  'special',
  'natural'
);

CREATE TABLE lighting_setups (
  id          BIGSERIAL PRIMARY KEY,
  scene_id    BIGINT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  setup_name  TEXT NOT NULL,
  motivation  TEXT,
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scene_id, setup_name)
);
CREATE INDEX lighting_setups_scene_idx ON lighting_setups(scene_id, sort_order);

CREATE TABLE lighting_setup_fixtures (
  id                  BIGSERIAL PRIMARY KEY,
  setup_id            BIGINT NOT NULL REFERENCES lighting_setups(id) ON DELETE CASCADE,
  equipment_usage_id  BIGINT NOT NULL REFERENCES equipment_usage(id) ON DELETE CASCADE,
  role                lighting_role_enum NOT NULL,
  diffusion           TEXT,
  color_temp_k        INTEGER CHECK (color_temp_k IS NULL OR color_temp_k BETWEEN 1500 AND 25000),
  intensity_pct       INTEGER CHECK (intensity_pct IS NULL OR intensity_pct BETWEEN 0 AND 100),
  position_notes      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (setup_id, equipment_usage_id)
);
CREATE INDEX lighting_setup_fixtures_setup_idx ON lighting_setup_fixtures(setup_id);
CREATE INDEX lighting_setup_fixtures_role_idx ON lighting_setup_fixtures(role);
