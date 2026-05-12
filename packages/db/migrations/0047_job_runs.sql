-- Admin section, phase 7.1 — job runs.
--
-- A `job_run` is one execution of a registered ingest/seed job.
-- Jobs themselves are defined in TypeScript (apps/web/lib/admin/
-- job-registry.ts) — the registry IS the source of truth, so we
-- intentionally do not have a `jobs` table. The job_id column is
-- a free-form text key into the registry, not a foreign-key.
--
-- Output is captured into `log_text` as the spawned process emits
-- to stdout/stderr. `inserted/updated/skipped` counts are parsed
-- from the script's own [+]/[~]/[!] line prefixes (the convention
-- already established across packages/db/scripts/).

CREATE TYPE job_run_status_enum AS ENUM (
  'queued', 'running', 'success', 'failed', 'cancelled'
);

CREATE TABLE job_runs (
  id                  BIGSERIAL PRIMARY KEY,
  job_id              TEXT NOT NULL,                       -- key into the TS job registry
  job_label           TEXT NOT NULL,                       -- human label snapshotted at run time
  status              job_run_status_enum NOT NULL DEFAULT 'queued',
  params              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- the args this run was launched with
  triggered_by        TEXT NOT NULL DEFAULT 'admin',       -- 'admin', 'cron', 'webhook'
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at         TIMESTAMPTZ,
  exit_code           INTEGER,                             -- null until finished
  log_text            TEXT NOT NULL DEFAULT '',
  inserted_count      INTEGER NOT NULL DEFAULT 0,
  updated_count       INTEGER NOT NULL DEFAULT 0,
  skipped_count       INTEGER NOT NULL DEFAULT 0,
  warning_count       INTEGER NOT NULL DEFAULT 0,
  error_message       TEXT
);

CREATE INDEX job_runs_job_idx ON job_runs(job_id, started_at DESC);
CREATE INDEX job_runs_started_idx ON job_runs(started_at DESC);
CREATE INDEX job_runs_status_idx ON job_runs(status, started_at DESC);
