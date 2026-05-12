-- Editorial-page expansion for the gear archive — three layers:
-- manufacturers, series, items. Mirrors the VFX-house pattern shipped
-- in 0037/0038: long-form summary, tagline, structured references,
-- plus per-layer fields.

ALTER TABLE equipment_manufacturers
  ADD COLUMN summary         TEXT,
  ADD COLUMN tagline         TEXT,
  ADD COLUMN headquarters    TEXT,
  ADD COLUMN parent_company  TEXT,
  ADD COLUMN employee_count  INTEGER CHECK (employee_count IS NULL OR employee_count >= 0),
  ADD COLUMN "references"    JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE equipment_series
  ADD COLUMN summary         TEXT,
  ADD COLUMN signature_look  TEXT,
  ADD COLUMN "references"    JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE equipment_items
  ADD COLUMN description     TEXT,
  ADD COLUMN image_url       TEXT,
  ADD COLUMN notable_uses    TEXT;
