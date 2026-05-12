-- E-29 — color palette per key frame.
--
-- Stored as a JSONB array of hex strings (e.g. ["#1a1a1a", "#f5e6d3", ...])
-- ordered most-dominant first. Populated by a batch job that calls
-- OpenAI's vision API on the image URL. JSONB > text[] because we may
-- later attach per-color weights or roles ({hex, weight, role:'shadow'}).

ALTER TABLE production_keyframes
  ADD COLUMN IF NOT EXISTS palette jsonb;
