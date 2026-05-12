import 'server-only';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  db,
  insertJobRun,
  appendJobRunLog,
  finalizeJobRun,
} from '@bts/db';
import { getJobById, type JobDef, type JobInputField } from './job-registry';

/**
 * Resolve the monorepo root from the dev server's cwd. The Next.js app
 * runs out of apps/web; the scraper + db packages live two levels up.
 */
function repoRoot(): string {
  return path.resolve(process.cwd(), '..', '..');
}

/**
 * Build the argv for the spawned process. Form-supplied params append
 * as --<name> <value> for `text`/`number` fields; `boolean` fields
 * append as --<name> when truthy and are omitted when falsy.
 */
function buildArgs(job: JobDef, params: Record<string, unknown>): string[] {
  const args = [...job.command.args];
  if (!job.inputs) return args;
  for (const input of job.inputs) {
    const raw = params[input.name];
    if (raw === undefined || raw === null || raw === '') continue;
    if (input.type === 'boolean') {
      if (raw === true || raw === 'true' || raw === 'on' || raw === '1') {
        args.push(`--${input.name}`);
      }
    } else {
      args.push(`--${input.name}`, String(raw));
    }
  }
  return args;
}

/**
 * Parse a chunk of stdout for the seed-script convention prefixes
 * we already use across packages/db/scripts/:
 *   [+] inserted, [~] updated, [!] warning/skipped
 */
function countMarkers(chunk: string): { inserted: number; updated: number; warning: number } {
  let inserted = 0;
  let updated = 0;
  let warning = 0;
  for (const line of chunk.split(/\r?\n/)) {
    const t = line.trimStart();
    if (t.startsWith('[+]')) inserted++;
    else if (t.startsWith('[~]')) updated++;
    else if (t.startsWith('[!]')) warning++;
  }
  return { inserted, updated, warning };
}

/**
 * Coerce form-action FormData (or a plain object) into the params
 * shape the runner expects. Boolean fields come through as 'on' from
 * checkboxes and need normalization.
 */
export function paramsFromForm(
  job: JobDef,
  form: FormData | Record<string, FormDataEntryValue | null>,
): Record<string, unknown> {
  const get = (k: string) =>
    form instanceof FormData ? form.get(k) : form[k] ?? null;
  const out: Record<string, unknown> = {};
  if (!job.inputs) return out;
  for (const input of job.inputs) {
    const raw = get(input.name);
    if (raw === null || raw === undefined) {
      if (input.type === 'boolean' && input.default === true) out[input.name] = true;
      continue;
    }
    if (input.type === 'boolean') {
      out[input.name] = raw === 'on' || raw === 'true' || raw === '1';
    } else if (input.type === 'number') {
      const s = String(raw).trim();
      if (s !== '') out[input.name] = Number(s);
    } else {
      const s = String(raw).trim();
      if (s !== '') out[input.name] = s;
    }
  }
  return out;
}

/**
 * Spawn a job and run it asynchronously. Returns the run_id immediately
 * (after the row is inserted) so the caller can navigate to the log
 * viewer; the spawned process continues in the background and the
 * job_runs row is updated as output arrives.
 *
 * NOTE: this assumes the process running Next.js can spawn child
 * processes (true for `next dev` and self-hosted `next start`; not
 * true for Vercel serverless). Long-running jobs on serverless need
 * a separate worker queue — out of scope for Phase 7.1.
 */
export async function startJobRun(
  jobId: string,
  params: Record<string, unknown>,
  triggeredBy: string = 'admin',
): Promise<{ runId: number; jobId: string } | { error: string }> {
  const job = getJobById(jobId);
  if (!job) return { error: `Unknown job: ${jobId}` };

  const runId = await insertJobRun(db, {
    jobId: job.id,
    jobLabel: job.label,
    params,
    triggeredBy,
  });

  const cwd = job.command.cwd ? path.join(repoRoot(), job.command.cwd) : repoRoot();
  const bin = job.command.bin ?? 'pnpm';
  const args = buildArgs(job, params);

  const child = spawn(bin, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: process.platform === 'win32',
  });

  let totals = { inserted: 0, updated: 0, warning: 0 };
  let buffer = '';

  const pipeChunk = async (data: Buffer | string) => {
    const text = typeof data === 'string' ? data : data.toString('utf8');
    buffer += text;
    const counts = countMarkers(text);
    totals.inserted += counts.inserted;
    totals.updated += counts.updated;
    totals.warning += counts.warning;
    // Flush in small batches so the log viewer doesn't see one big
    // post-completion blob. Two-line threshold matches our scripts'
    // typical output cadence.
    if (buffer.length > 0 && (text.includes('\n') || buffer.length > 2000)) {
      const flush = buffer;
      buffer = '';
      try {
        await appendJobRunLog(db, runId, flush);
      } catch (err) {
        // Logging failure shouldn't crash the spawned process; surface
        // it to stderr but keep going.
        console.error('appendJobRunLog failed:', err);
      }
    }
  };

  child.stdout.on('data', pipeChunk);
  child.stderr.on('data', pipeChunk);

  child.on('close', async (exitCode) => {
    if (buffer.length > 0) {
      try { await appendJobRunLog(db, runId, buffer); } catch { /* swallow */ }
    }
    await finalizeJobRun(db, runId, {
      status: exitCode === 0 ? 'success' : 'failed',
      exitCode: exitCode ?? null,
      insertedCount: totals.inserted,
      updatedCount: totals.updated,
      warningCount: totals.warning,
      errorMessage: exitCode === 0 ? null : `Process exited with code ${exitCode}`,
    });
  });

  child.on('error', async (err) => {
    await finalizeJobRun(db, runId, {
      status: 'failed',
      exitCode: null,
      insertedCount: totals.inserted,
      updatedCount: totals.updated,
      warningCount: totals.warning,
      errorMessage: err.message,
    });
  });

  // Detach so the response doesn't block on the spawned process.
  child.unref?.();

  return { runId, jobId: job.id };
}

export type { JobInputField };
