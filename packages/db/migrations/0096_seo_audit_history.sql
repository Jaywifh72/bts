-- Migration 0096 — persist SEO audit results so /admin/seo/audit can show
-- trends over time instead of just point-in-time results.
--
-- Two tables: one header row per audit run, then one row per URL audited.
-- We don't normalize signals/issues into columns because:
--   • signal set will grow as we add checks
--   • issue list is naturally a list of {severity, code, message} tuples
--   • jsonb is queryable enough for the trend math we actually do

CREATE TABLE IF NOT EXISTS seo_audit_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at       timestamptz NOT NULL DEFAULT now(),
  runtime_ms   integer NOT NULL,
  include_cwv  boolean NOT NULL DEFAULT true,
  pages_count  integer NOT NULL DEFAULT 0,
  ok_count     integer NOT NULL DEFAULT 0,
  warn_count   integer NOT NULL DEFAULT 0,
  fail_count   integer NOT NULL DEFAULT 0,
  avg_score    integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_seo_audit_runs_ran_at
  ON seo_audit_runs (ran_at DESC);

CREATE TABLE IF NOT EXISTS seo_audit_page_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES seo_audit_runs(id) ON DELETE CASCADE,
  url          text NOT NULL,
  http_status  integer NOT NULL,
  worst        text NOT NULL CHECK (worst IN ('ok', 'warn', 'fail')),
  score        integer NOT NULL,
  signals      jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues       jsonb NOT NULL DEFAULT '[]'::jsonb,
  cwv          jsonb,             -- nullable; null if include_cwv=false or PSI errored
  fetched_at   timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_audit_page_results_run
  ON seo_audit_page_results (run_id);

-- For per-URL trend queries: "show me how /films/foo has scored over time"
CREATE INDEX IF NOT EXISTS idx_seo_audit_page_results_url_time
  ON seo_audit_page_results (url, fetched_at DESC);
