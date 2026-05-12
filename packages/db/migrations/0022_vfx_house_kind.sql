-- E-19 — classify VFX houses by kind so /films/[slug] and the gear
-- browser can group ILM (full-service) from a boutique like Important
-- Looking Pirates from an in-house studio team.

CREATE TYPE vfx_house_kind_enum AS ENUM (
  'full_service',
  'boutique',
  'in_house',
  'rendering',
  'previsualization',
  'other'
);
--> statement-breakpoint
ALTER TABLE vfx_houses ADD COLUMN IF NOT EXISTS kind vfx_house_kind_enum;
