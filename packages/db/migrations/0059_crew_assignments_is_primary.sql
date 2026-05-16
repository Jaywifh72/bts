-- Migration 0059 — `is_primary` flag on crew_assignments.
--
-- UX-audit Theme F item F4. Today the codebase fakes "primary DP" /
-- "primary editor" via `credit_order ASC NULLS LAST LIMIT 1` subqueries
-- (six call sites including the new /films/compare). That heuristic
-- breaks when:
--   1. Two co-DPs share a production with identical credit_order
--   2. TMDb's opaque ordering puts a second-unit DP first
--   3. A documentary genuinely has 3 cinematographers and "primary" is
--      an editorial decision, not a credit-order one
--
-- Adding an explicit boolean lets curators mark co-DPs as both primary,
-- and reduces the messy ORDER-BY-NULLS-LAST subquery to a clean
-- `WHERE is_primary = TRUE LIMIT 1`. Partial index keeps the lookup
-- fast — covers the common "primary X on production Y" path without
-- bloating the index for the bulk of FALSE rows.
--
-- Backfill heuristic (run inline below): mark the row with the lowest
-- credit_order in each (production_id, role_id) group as is_primary.
-- Ties broken by created_at. Curators can flip individual rows after
-- the fact via the admin curate form (separate follow-up PR).

ALTER TABLE crew_assignments
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index for the "primary crew on production" lookup. Indexes
-- only TRUE rows — keeps the index tiny (one row per role per
-- production) while covering the queries that scan it.
CREATE INDEX IF NOT EXISTS crew_assignments_primary_idx
  ON crew_assignments (production_id, role_id)
  WHERE is_primary;

-- One-shot backfill. ROW_NUMBER() partitions by (production_id, role_id)
-- and picks the row with the lowest credit_order (NULLs sort last) as
-- the canonical primary. created_at tiebreak gives a stable choice for
-- the "two co-DPs at credit_order=1" case — picks whichever was
-- inserted first; curators can adjust.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY production_id, role_id
           ORDER BY credit_order ASC NULLS LAST, created_at ASC
         ) AS rn
  FROM crew_assignments
)
UPDATE crew_assignments ca
SET is_primary = TRUE
FROM ranked r
WHERE ca.id = r.id AND r.rn = 1;

COMMENT ON COLUMN crew_assignments.is_primary IS
  'Curator-set flag marking the canonical lead for this (production, role). Multiple rows may be primary for the same role (co-DPs, multi-editor docs). Default FALSE; backfilled to lowest credit_order per group on migration 0059.';
