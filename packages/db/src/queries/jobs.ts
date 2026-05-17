import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

export type JobRunStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

export type JobRunRow = {
  id: number;
  job_id: string;
  job_label: string;
  status: JobRunStatus;
  params: Record<string, unknown>;
  triggered_by: string;
  started_at: string;
  finished_at: string | null;
  exit_code: number | null;
  log_text: string;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  warning_count: number;
  error_message: string | null;
  command_bin: string | null;
  command_args: string[] | null;
  command_cwd: string | null;
  github_run_url: string | null;
};

/** List runs with optional job filter, newest first. Capped at 200. */
export async function listJobRuns(
  db: SeedDb = defaultDb,
  filters: { jobId?: string; status?: JobRunStatus; limit?: number } = {},
): Promise<JobRunRow[]> {
  const limit = filters.limit ?? 50;
  return db.execute<JobRunRow>(sql`
    SELECT id, job_id, job_label, status, params, triggered_by,
           started_at::text, finished_at::text,
           exit_code, log_text,
           inserted_count, updated_count, skipped_count, warning_count,
           error_message,
           command_bin, command_args, command_cwd, github_run_url
    FROM job_runs
    WHERE
      ${filters.jobId ? sql`job_id = ${filters.jobId}` : sql`TRUE`}
      AND ${filters.status ? sql`status = ${filters.status}::job_run_status_enum` : sql`TRUE`}
    ORDER BY started_at DESC
    LIMIT ${Math.min(limit, 200)}
  `);
}

export async function getJobRun(
  db: SeedDb = defaultDb,
  id: number,
): Promise<JobRunRow | null> {
  const [row] = await db.execute<JobRunRow>(sql`
    SELECT id, job_id, job_label, status, params, triggered_by,
           started_at::text, finished_at::text,
           exit_code, log_text,
           inserted_count, updated_count, skipped_count, warning_count,
           error_message,
           command_bin, command_args, command_cwd, github_run_url
    FROM job_runs
    WHERE id = ${id}
  `);
  return row ?? null;
}

/**
 * Last-run summary per job, for the ingest dashboard. Returns one row
 * per distinct job_id with the most recent started_at.
 */
export type JobLastRunRow = {
  job_id: string;
  job_label: string;
  status: JobRunStatus;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  run_id: number;
};

export async function getLastRunPerJob(db: SeedDb = defaultDb): Promise<JobLastRunRow[]> {
  return db.execute<JobLastRunRow>(sql`
    SELECT DISTINCT ON (job_id)
      job_id, job_label, status, started_at::text, finished_at::text,
      EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at))::int AS duration_seconds,
      inserted_count, updated_count, skipped_count,
      id AS run_id
    FROM job_runs
    ORDER BY job_id, started_at DESC
  `);
}

export async function insertJobRun(
  db: SeedDb = defaultDb,
  args: {
    jobId: string;
    jobLabel: string;
    params: Record<string, unknown>;
    triggeredBy?: string;
    /** 'queued' for remote dispatch, 'running' for in-process spawn. */
    status?: JobRunStatus;
    commandBin?: string;
    commandArgs?: string[];
    commandCwd?: string;
  },
): Promise<number> {
  const [row] = await db.execute<{ id: number }>(sql`
    INSERT INTO job_runs (
      job_id, job_label, status, params, triggered_by,
      command_bin, command_args, command_cwd
    )
    VALUES (
      ${args.jobId}, ${args.jobLabel},
      ${args.status ?? 'running'}::job_run_status_enum,
      ${JSON.stringify(args.params)}::jsonb,
      ${args.triggeredBy ?? 'admin'},
      ${args.commandBin ?? null},
      ${args.commandArgs ? JSON.stringify(args.commandArgs) : null}::jsonb,
      ${args.commandCwd ?? null}
    )
    RETURNING id
  `);
  return row!.id;
}

/**
 * Mark a queued run as actually running (called by the GHA worker
 * when the workflow starts executing). Also records the GitHub run URL
 * so the operator can tail logs on github.com.
 */
export async function markJobRunStarted(
  db: SeedDb = defaultDb,
  id: number,
  args: { githubRunUrl?: string | null },
): Promise<void> {
  await db.execute(sql`
    UPDATE job_runs
    SET status = 'running'::job_run_status_enum,
        started_at = NOW(),
        github_run_url = COALESCE(${args.githubRunUrl ?? null}, github_run_url)
    WHERE id = ${id}
  `);
}

/**
 * Attach a GitHub Actions run URL to a queued/running job. Called from
 * the dispatch path as soon as the workflow run is discoverable.
 */
export async function setJobRunGithubUrl(
  db: SeedDb = defaultDb,
  id: number,
  githubRunUrl: string,
): Promise<void> {
  await db.execute(sql`
    UPDATE job_runs SET github_run_url = ${githubRunUrl} WHERE id = ${id}
  `);
}


export async function appendJobRunLog(
  db: SeedDb = defaultDb,
  id: number,
  chunk: string,
): Promise<void> {
  await db.execute(sql`
    UPDATE job_runs
    SET log_text = log_text || ${chunk}
    WHERE id = ${id}
  `);
}

export async function finalizeJobRun(
  db: SeedDb = defaultDb,
  id: number,
  args: {
    status: JobRunStatus;
    exitCode: number | null;
    insertedCount?: number;
    updatedCount?: number;
    skippedCount?: number;
    warningCount?: number;
    errorMessage?: string | null;
  },
): Promise<void> {
  await db.execute(sql`
    UPDATE job_runs
    SET status = ${args.status}::job_run_status_enum,
        exit_code = ${args.exitCode},
        finished_at = NOW(),
        inserted_count = ${args.insertedCount ?? 0},
        updated_count = ${args.updatedCount ?? 0},
        skipped_count = ${args.skippedCount ?? 0},
        warning_count = ${args.warningCount ?? 0},
        error_message = ${args.errorMessage ?? null}
    WHERE id = ${id}
  `);
}
