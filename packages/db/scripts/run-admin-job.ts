/**
 * Admin-job worker. Runs inside a GitHub Actions workflow_dispatch
 * invocation: reads the job_run row whose id is in $RUN_ID, executes
 * the command stored on that row, streams stdout/stderr into log_text,
 * and finalises the row with success/failure.
 *
 * Env:
 *   RUN_ID         – numeric id of the queued job_runs row
 *   DATABASE_URL   – Postgres connection (Neon prod) for the worker
 *   GITHUB_RUN_URL – optional; the workflow run URL (so the admin UI
 *                    can link to GHA logs)
 *
 * Failure modes are noisy on purpose — the GHA log is the operator's
 * primary debug surface.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  db,
  getJobRun,
  markJobRunStarted,
  appendJobRunLog,
  finalizeJobRun,
} from '../src/index.ts';

function countMarkers(chunk: string): { inserted: number; updated: number; warning: number } {
  let inserted = 0, updated = 0, warning = 0;
  for (const line of chunk.split(/\r?\n/)) {
    const t = line.trimStart();
    if (t.startsWith('[+]')) inserted++;
    else if (t.startsWith('[~]')) updated++;
    else if (t.startsWith('[!]')) warning++;
  }
  return { inserted, updated, warning };
}

async function main() {
  const runIdRaw = process.env.RUN_ID;
  const runId = Number(runIdRaw);
  if (!runId || Number.isNaN(runId)) {
    console.error(`run-admin-job: RUN_ID not set or invalid (got "${runIdRaw}")`);
    process.exit(2);
  }

  const run = await getJobRun(db, runId);
  if (!run) {
    console.error(`run-admin-job: no job_run with id=${runId}`);
    process.exit(2);
  }

  if (!run.command_bin || !run.command_args) {
    console.error(`run-admin-job: job_run ${runId} has no command_bin/args (was it dispatched via the new runner?)`);
    await finalizeJobRun(db, runId, {
      status: 'failed',
      exitCode: null,
      errorMessage: 'No command stored on job_run row',
    });
    process.exit(2);
  }

  await markJobRunStarted(db, runId, { githubRunUrl: process.env.GITHUB_RUN_URL ?? null });

  // Resolve cwd. `command_cwd` is relative to the repo root.
  const repoRoot = path.resolve(process.cwd());
  const cwd = run.command_cwd ? path.join(repoRoot, run.command_cwd) : repoRoot;

  console.log(`run-admin-job: spawning "${run.command_bin} ${run.command_args.join(' ')}" in ${cwd}`);

  const child = spawn(run.command_bin, run.command_args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: process.platform === 'win32',
  });

  let totals = { inserted: 0, updated: 0, warning: 0 };
  let buffer = '';
  let flushTimer: NodeJS.Timeout | null = null;

  const flush = async () => {
    if (buffer.length === 0) return;
    const out = buffer;
    buffer = '';
    try {
      await appendJobRunLog(db, runId, out);
    } catch (err) {
      console.error('appendJobRunLog failed:', err);
    }
  };

  const pipeChunk = async (data: Buffer | string) => {
    const text = typeof data === 'string' ? data : data.toString('utf8');
    process.stdout.write(text); // mirror to GHA log
    buffer += text;
    const counts = countMarkers(text);
    totals.inserted += counts.inserted;
    totals.updated += counts.updated;
    totals.warning += counts.warning;
    // Debounce flushes to ~1 per second so we don't UPDATE on every byte.
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => { void flush(); }, 1000);
  };

  child.stdout.on('data', pipeChunk);
  child.stderr.on('data', pipeChunk);

  const exitCode: number = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', (err) => {
      console.error('spawn error:', err);
      buffer += `\n\nspawn error: ${err.message}\n`;
      resolve(1);
    });
  });

  if (flushTimer) clearTimeout(flushTimer);
  await flush();

  await finalizeJobRun(db, runId, {
    status: exitCode === 0 ? 'success' : 'failed',
    exitCode,
    insertedCount: totals.inserted,
    updatedCount: totals.updated,
    warningCount: totals.warning,
    errorMessage: exitCode === 0 ? null : `Process exited with code ${exitCode}`,
  });

  console.log(`run-admin-job: done — exitCode=${exitCode} totals=${JSON.stringify(totals)}`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('run-admin-job: unhandled error', err);
  process.exit(1);
});
