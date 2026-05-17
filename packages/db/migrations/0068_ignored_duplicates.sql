-- Migration 0068 — ignored_duplicates table.
--
-- Admin-confirmed "these two rows are NOT actually the same entity"
-- decisions. The /admin/health/duplicates page filters pairs already
-- in this table so dismissed pairs stay dismissed across sessions.
--
-- (table_name, slug_low, slug_high) is canonical (slug_low <
-- slug_high alphabetically) so re-ordering the pair on the page
-- still hits the same row.

CREATE TABLE IF NOT EXISTS "ignored_duplicates" (
  "table_name"  text        NOT NULL,
  "slug_low"    text        NOT NULL,
  "slug_high"   text        NOT NULL,
  "ignored_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "ignored_by"  uuid        REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "ignored_duplicates_pk" PRIMARY KEY ("table_name", "slug_low", "slug_high"),
  CONSTRAINT "ignored_duplicates_slug_order" CHECK ("slug_low" < "slug_high")
);
