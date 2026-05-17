-- Migration 0067 — extra fields on job_runs for GitHub Actions dispatch.
--
-- The job runner stores the command spec on the row itself so a remote
-- worker (a GHA workflow_dispatch invocation) can pick it up, execute,
-- and post results back without needing to share the TS job-registry.

ALTER TABLE "job_runs"
  ADD COLUMN IF NOT EXISTS "command_bin" text,
  ADD COLUMN IF NOT EXISTS "command_args" jsonb,
  ADD COLUMN IF NOT EXISTS "command_cwd" text,
  ADD COLUMN IF NOT EXISTS "github_run_url" text;
