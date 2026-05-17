import { pgTable, bigserial, text, integer, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Job runs — one row per execution of a registered ingest/seed job.
 * Jobs themselves are defined in TypeScript (apps/web/lib/admin/
 * job-registry.ts); the registry is the source of truth, so we
 * intentionally do not have a `jobs` table.
 */

export const jobRunStatusEnum = pgEnum('job_run_status_enum', [
  'queued', 'running', 'success', 'failed', 'cancelled',
]);

export const jobRuns = pgTable('job_runs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  jobId: text('job_id').notNull(),
  jobLabel: text('job_label').notNull(),
  status: jobRunStatusEnum('status').notNull().default('queued'),
  params: jsonb('params').notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  triggeredBy: text('triggered_by').notNull().default('admin'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  exitCode: integer('exit_code'),
  logText: text('log_text').notNull().default(''),
  insertedCount: integer('inserted_count').notNull().default(0),
  updatedCount: integer('updated_count').notNull().default(0),
  skippedCount: integer('skipped_count').notNull().default(0),
  warningCount: integer('warning_count').notNull().default(0),
  errorMessage: text('error_message'),
  // Execution details populated by the runner when the job is queued.
  // The GitHub Actions worker reads these to know what to spawn; the
  // local (spawn-in-process) runner uses them for parity.
  commandBin: text('command_bin'),
  commandArgs: jsonb('command_args').$type<string[]>(),
  commandCwd: text('command_cwd'),
  // Set after successful GitHub workflow_dispatch so the operator can
  // tail the GHA log from the run page. NULL when run locally.
  githubRunUrl: text('github_run_url'),
}, (t) => ({
  jobIdx: index('job_runs_job_idx').on(t.jobId, t.startedAt),
  startedIdx: index('job_runs_started_idx').on(t.startedAt),
  statusIdx: index('job_runs_status_idx').on(t.status, t.startedAt),
}));
