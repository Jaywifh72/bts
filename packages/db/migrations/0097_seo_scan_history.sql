-- Migration 0097 — persist link-scan and duplicate-scan results so the
-- admin pages can show trends instead of just point-in-time output.
--
-- Mirrors 0096's shape: one header row per run + a jsonb payload with the
-- full report. We don't normalize the broken/redirect/duplicate-group
-- arrays into rows because:
--   • the payload is bounded by per-scan caps (already enforced in code)
--   • we query the trend headers (counts over time), not individual rows
--   • re-running an old report from jsonb is trivial

CREATE TABLE IF NOT EXISTS seo_link_scan_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at             timestamptz NOT NULL DEFAULT now(),
  runtime_ms         integer NOT NULL,
  pages_crawled      integer NOT NULL DEFAULT 0,
  links_discovered   integer NOT NULL DEFAULT 0,
  links_checked      integer NOT NULL DEFAULT 0,
  ok_count           integer NOT NULL DEFAULT 0,
  redirect_count     integer NOT NULL DEFAULT 0,
  broken_count       integer NOT NULL DEFAULT 0,
  hit_cap            boolean NOT NULL DEFAULT false,
  report             jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_seo_link_scan_runs_ran_at
  ON seo_link_scan_runs (ran_at DESC);

CREATE TABLE IF NOT EXISTS seo_duplicate_scan_runs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at                   timestamptz NOT NULL DEFAULT now(),
  runtime_ms               integer NOT NULL,
  urls_scanned             integer NOT NULL DEFAULT 0,
  title_dup_group_count    integer NOT NULL DEFAULT 0,
  desc_dup_group_count     integer NOT NULL DEFAULT 0,
  missing_title_count      integer NOT NULL DEFAULT 0,
  missing_desc_count       integer NOT NULL DEFAULT 0,
  report                   jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_seo_duplicate_scan_runs_ran_at
  ON seo_duplicate_scan_runs (ran_at DESC);
