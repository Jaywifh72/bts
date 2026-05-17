-- Migration 0072 (PROPOSED) — Award citations via sources junction.
--
-- Mirrors production_sources / scene_sources / crew_assignment_sources:
-- (award_id, source_id) PK, confidence enum, optional claim quote.
-- This is the chosen citation path (over polymorphic media_assets)
-- because the spec calls for a confidence rating on every citation —
-- award_sources gets that for free via sourceConfidenceEnum.
--
-- The legacy `awards.source_url` text column is kept (nullable) so
-- existing rows display correctly. A follow-up migration will
-- backfill it into award_sources + sources and drop the column.

CREATE TABLE "award_sources" (
  "award_id"     bigint NOT NULL REFERENCES "awards"("id")   ON DELETE CASCADE,
  "source_id"    bigint NOT NULL REFERENCES "sources"("id")  ON DELETE RESTRICT,
  "confidence"   source_confidence NOT NULL,
  "claim_quote"  text,
  "notes"        text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "award_sources_pk" PRIMARY KEY ("award_id", "source_id")
);

CREATE INDEX "award_sources_source_idx" ON "award_sources" ("source_id");

-- Convention reminder for ingest code (no DB enforcement — same as
-- the other *_sources tables):
--   - Org-archive citations (oscars.org, ascmag.com, etc.)        → 'primary'
--   - Reputable secondary (Variety, Hollywood Reporter, NYT)      → 'secondary'
--   - Aggregators / wikis / fan databases                          → 'tertiary'
