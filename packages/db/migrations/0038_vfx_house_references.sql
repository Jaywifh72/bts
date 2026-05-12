-- Further-reading citations per VFX house. JSONB rather than a join
-- table because these are editorial pointers, not weighted citations
-- — each entry is { title, url, publication, kind } where kind is
-- one of: 'wikipedia', 'fxguide', 'interview', 'studio_page',
-- 'book', 'article', 'video'.
ALTER TABLE vfx_houses
  ADD COLUMN "references" JSONB NOT NULL DEFAULT '[]'::jsonb;
