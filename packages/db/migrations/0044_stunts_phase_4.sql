-- Stunt section, phase 4 — lineage graph. A directed mentor →
-- protégé relationship stored as an array of mentor slugs on the
-- protégé row. Querying the inverse direction (who did X mentor?)
-- uses the GIN index on the array column.
ALTER TABLE people
  ADD COLUMN mentor_person_slugs TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX people_mentor_slugs_gin_idx
  ON people USING gin (mentor_person_slugs);
