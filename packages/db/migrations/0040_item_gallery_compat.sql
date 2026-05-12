-- Per-item editorial expansion: image gallery, value-proposition
-- blurb, structured camera/mount compatibility. The existing
-- image_url column from 0039 stays as a fallback hero; the new
-- images jsonb supersedes it for proper galleries.
--
-- Compatibility shape:
--   {
--     mount?: string,                    -- canonical mount name
--     compatible_cameras?: string[],     -- common bodies the item attaches to
--     compatible_lens_mounts?: string[], -- for cameras: mounts they accept
--     adapter_notes?: string             -- editorial freetext
--   }
--
-- Images shape:
--   [{ url, caption?, credit?, source? }]   -- source = 'wikipedia_commons' | 'manufacturer'
ALTER TABLE equipment_items
  ADD COLUMN value_proposition TEXT,
  ADD COLUMN images            JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN compatibility     JSONB NOT NULL DEFAULT '{}'::jsonb;
