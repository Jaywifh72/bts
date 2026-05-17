-- Migration 0070 (PROPOSED) — Rename production_awards → awards;
-- replace freeform (award_org enum + category text) with FKs into the
-- taxonomy added in 0069.
--
-- Strategy:
--   1. Rename table + indexes/constraints.
--   2. Add nullable award_org_id + category_id columns.
--   3. Backfill from existing (award_org enum, category text) by
--      matching org slug + best-effort category slug derivation.
--   4. Categories that don't yet exist in award_categories are
--      auto-created (slug = slugified(category text), craft_id = NULL).
--   5. Make category_id NOT NULL; drop legacy award_org enum column;
--      drop the awardOrgEnum Postgres type.
--
-- Rollback note: this migration is destructive (drops the enum column
-- and type). The previous values are recoverable from
-- award_categories.org_id → award_orgs.slug and category_id.slug.

-- ── 1. Rename ──────────────────────────────────────────────────────
ALTER TABLE "production_awards" RENAME TO "awards";

ALTER INDEX "production_awards_production_idx"      RENAME TO "awards_production_idx";
ALTER INDEX "production_awards_recipient_idx"       RENAME TO "awards_recipient_person_idx";
ALTER INDEX "production_awards_recipient_vfx_idx"   RENAME TO "awards_recipient_vfx_idx";
ALTER INDEX "production_awards_recipient_stunt_co_idx" RENAME TO "awards_recipient_stunt_co_idx";
ALTER INDEX "production_awards_org_year_idx"        RENAME TO "awards_org_year_idx";
ALTER TABLE "awards" RENAME CONSTRAINT "production_awards_unique" TO "awards_unique";

-- ── 2. Add new FK columns (nullable for backfill) ──────────────────
ALTER TABLE "awards"
  ADD COLUMN "award_org_id" bigint REFERENCES "award_orgs"("id") ON DELETE RESTRICT,
  ADD COLUMN "category_id"  bigint REFERENCES "award_categories"("id") ON DELETE RESTRICT,
  ADD COLUMN "recipient_kind" award_recipient_kind_enum;

-- ── 3. Backfill org_id ─────────────────────────────────────────────
UPDATE "awards" a
SET "award_org_id" = o.id
FROM "award_orgs" o
WHERE o.slug = a.award_org::text;

-- ── 4. Backfill category_id (auto-create missing categories) ───────
-- 4a. Insert any (org, category text) pair that doesn't yet exist as
--     an award_categories row. slug is a lowercase dash-form of the
--     original freeform category text.
INSERT INTO "award_categories" ("org_id", "slug", "name", "recipient_kind", "is_active", "notes")
SELECT DISTINCT
  a."award_org_id",
  regexp_replace(lower(trim(a."category")), '[^a-z0-9]+', '-', 'g'),
  a."category",
  CASE
    WHEN a."recipient_vfx_house_id" IS NOT NULL THEN 'vfx_house'::award_recipient_kind_enum
    WHEN a."recipient_stunt_company_id" IS NOT NULL THEN 'stunt_company'::award_recipient_kind_enum
    WHEN a."recipient_person_id" IS NOT NULL THEN 'person'::award_recipient_kind_enum
    ELSE 'production'::award_recipient_kind_enum
  END,
  true,
  'auto-created during 0070 backfill'
FROM "awards" a
WHERE a."award_org_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "award_categories" c
    WHERE c."org_id" = a."award_org_id"
      AND c."slug" = regexp_replace(lower(trim(a."category")), '[^a-z0-9]+', '-', 'g')
  )
ON CONFLICT ("org_id", "slug") DO NOTHING;

-- 4b. Link awards to categories.
UPDATE "awards" a
SET "category_id" = c.id
FROM "award_categories" c
WHERE c."org_id" = a."award_org_id"
  AND c."slug"   = regexp_replace(lower(trim(a."category")), '[^a-z0-9]+', '-', 'g');

-- 4c. Derive recipient_kind on each award row.
UPDATE "awards"
SET "recipient_kind" = CASE
  WHEN "recipient_vfx_house_id"     IS NOT NULL THEN 'vfx_house'::award_recipient_kind_enum
  WHEN "recipient_stunt_company_id" IS NOT NULL THEN 'stunt_company'::award_recipient_kind_enum
  WHEN "recipient_person_id"        IS NOT NULL THEN 'person'::award_recipient_kind_enum
  ELSE 'production'::award_recipient_kind_enum
END;

-- ── 5. Tighten constraints + drop legacy enum ──────────────────────
ALTER TABLE "awards"
  ALTER COLUMN "award_org_id"   SET NOT NULL,
  ALTER COLUMN "category_id"    SET NOT NULL,
  ALTER COLUMN "recipient_kind" SET NOT NULL;

ALTER TABLE "awards" DROP COLUMN "award_org";
DROP TYPE "award_org";

-- Replace the old unique constraint with one based on category_id.
ALTER TABLE "awards" DROP CONSTRAINT "awards_unique";
ALTER TABLE "awards"
  ADD CONSTRAINT "awards_unique"
  UNIQUE NULLS NOT DISTINCT
  ("production_id", "category_id", "year",
   "recipient_person_id", "recipient_vfx_house_id", "recipient_stunt_company_id");

CREATE INDEX "awards_category_year_idx" ON "awards" ("category_id", "year");
CREATE INDEX "awards_recipient_kind_idx" ON "awards" ("recipient_kind");

-- Drop the redundant org_year_idx (covered by category_year via join).
DROP INDEX "awards_org_year_idx";
