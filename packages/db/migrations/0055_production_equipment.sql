-- Migration 0055 — Production-level equipment attribution.
--
-- QA finding: `equipment_usage` is scoped to scenes only. 482/539 productions
-- in the archive have no scenes seeded — so they can't surface gear via the
-- existing schema even though their crew, format, and post-house data is
-- known. This is the single biggest cross-link bottleneck.
--
-- Adding `production_equipment` as a parallel attribution path: row keyed by
-- (production, series, optional item) with role enum + cite. The existing
-- `equipment_usage` table remains the canonical per-scene path; this new
-- table is the per-production path. Queries that surface "every film
-- ARRI ALEXA 65 has shot" UNION both tables.

CREATE TABLE IF NOT EXISTS production_equipment (
  id BIGSERIAL PRIMARY KEY,
  production_id BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  equipment_series_id BIGINT NOT NULL REFERENCES equipment_series(id) ON DELETE RESTRICT,
  equipment_item_id BIGINT REFERENCES equipment_items(id) ON DELETE RESTRICT,
  -- role: 'primary' = main A-camera/key-light/etc, 'secondary' = B-cam/fill,
  -- 'specialty' = one specific sequence (e.g. Phantom for high-speed inserts).
  role TEXT NOT NULL DEFAULT 'primary',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT production_equipment_natural_key
    UNIQUE NULLS NOT DISTINCT (production_id, equipment_series_id, equipment_item_id, role)
);

CREATE INDEX IF NOT EXISTS production_equipment_production_idx
  ON production_equipment (production_id);
CREATE INDEX IF NOT EXISTS production_equipment_series_idx
  ON production_equipment (equipment_series_id);
CREATE INDEX IF NOT EXISTS production_equipment_item_idx
  ON production_equipment (equipment_item_id)
  WHERE equipment_item_id IS NOT NULL;
