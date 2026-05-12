-- E-24 — per-production color pipeline. Captures the camera color
-- science → IDT → working space → ODT → deliverable chain.
--
-- One pipeline per (production, scene) where scene_id NULL means
-- "production-wide default" (the dominant pipeline for the show);
-- per-scene rows let curators flag scenes that diverge (e.g. a
-- Super 16 mag inserted into a digital production).
--
-- We don't enforce values against an enum because the field is
-- evolving fast (new ACES versions, new gamuts, vendor-specific
-- IDTs). Free text + a curated render makes more sense.
CREATE TABLE production_color_pipelines (
  id              BIGSERIAL PRIMARY KEY,
  production_id   BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  scene_id        BIGINT REFERENCES scenes(id) ON DELETE SET NULL,
  pipeline_name   TEXT NOT NULL,
  camera_log      TEXT,
  camera_gamut    TEXT,
  idt             TEXT,
  working_space   TEXT,
  odt             TEXT,
  deliverable     TEXT,
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One default per production (scene_id IS NULL), and one per scene.
CREATE UNIQUE INDEX production_color_pipelines_default_unq
  ON production_color_pipelines(production_id)
  WHERE scene_id IS NULL;
CREATE UNIQUE INDEX production_color_pipelines_scene_unq
  ON production_color_pipelines(scene_id)
  WHERE scene_id IS NOT NULL;
CREATE INDEX production_color_pipelines_production_idx
  ON production_color_pipelines(production_id, sort_order);
