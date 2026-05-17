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
 * Only meaningful when spawning locally — on Vercel the runner
 * dispatches to GitHub Actions and `cwd` is meaningless.
 */
function repoRoot(): string {
  return path.resolve(process.cwd(), '..', '..');
}

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
 * Decide whether to dispatch via GitHub Actions (production / Vercel)
 * or spawn locally (developer's machine). The serverless runtime can't
 * spawn pnpm — see Vercel docs on filesystem + process limits.
 */
function shouldUseGithubDispatch(): boolean {
  // Override knob for testing the GHA path from local dev.
  if (process.env.JOB_RUNNER === 'github') return true;
  if (process.env.JOB_RUNNER === 'local') return false;
  return Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * The repo to dispatch jobs into. Defaults to the canonical fork.
 * Override via GITHUB_REPO env when running a fork or staging branch.
 */
function getGithubRepo(): { owner: string; repo: string } {
  const raw = process.env.GITHUB_REPO ?? 'Jaywifh72/bts';
  const [owner, repo] = raw.split('/');
  if (!owner || !repo) throw new Error(`GITHUB_REPO malformed: ${raw}`);
  return { owner, repo };
}

const WORKFLOW_FILE = 'admin-job.yml';

async function dispatchToGithubActions(
  runId: number,
  job: JobDef,
): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) throw new Error('GITHUB_DISPATCH_TOKEN not configured');
  const { owner, repo } = getGithubRepo();
  const ref = process.env.GITHUB_DISPATCH_REF ?? 'master';

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref,
        inputs: { run_id: String(runId), job_label: job.label },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub dispatch failed (${res.status}): ${text}`);
  }
  // We don't try to resolve the workflow_run.html_url here — the
  // /dispatches API doesn't return it, and identifying "our" run by
  // polling is race-prone. The worker itself sets job_runs.github_run_url
  // via markJobRunStarted() using $GITHUB_RUN_URL once it starts.
}

export async function startJobRun(
  jobId: string,
  params: Record<string, unknown>,
  triggeredBy: string = 'admin',
): Promise<{ runId: number; jobId: string } | { error: string }> {
  const job = getJobById(jobId);
  if (!job) return { error: `Unknown job: ${jobId}` };

  const bin = job.command.bin ?? 'pnpm';
  const args = buildArgs(job, params);

  if (shouldUseGithubDispatch()) {
    // Persist a queued row first so we have a stable id to pass to
    // the workflow. The worker will mark it 'running' on start.
    const runId = await insertJobRun(db, {
      jobId: job.id,
      jobLabel: job.label,
      params,
      triggeredBy,
      status: 'queued',
      commandBin: bin,
      commandArgs: args,
      commandCwd: job.command.cwd,
    });

    try {
      await dispatchToGithubActions(runId, job);
    } catch (err) {
      // Mark the row failed so the operator sees the dispatch error.
      await finalizeJobRun(db, runId, {
        status: 'failed',
        exitCode: null,
        errorMessage: err instanceof Error ? err.message : 'Dispatch failed',
      });
      return { error: err instanceof Error ? err.message : 'Dispatch failed' };
    }
    return { runId, jobId: job.id };
  }

  // ── Local dev path: spawn the child process directly. ────────────
  const runId = await insertJobRun(db, {
    jobId: job.id,
    jobLabel: job.label,
    params,
    triggeredBy,
    status: 'running',
    commandBin: bin,
    commandArgs: args,
    commandCwd: job.command.cwd,
  });

  const cwd = job.command.cwd ? path.join(repoRoot(), job.command.cwd) : repoRoot();
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
    if (buffer.length > 0 && (text.includes('\n') || buffer.length > 2000)) {
      const flush = buffer;
      buffer = '';
      try { await appendJobRunLog(db, runId, flush); }
      catch (err) { console.error('appendJobRunLog failed:', err); }
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

  child.unref?.();
  return { runId, jobId: job.id };
}

// Re-export buildArgs + countMarkers for tests if needed.
export { buildArgs, countMarkers };

// Hint to TS that JobInputField is intentionally referenced (for prop
// types of UI form fields wiring into paramsFromForm).
export type { JobInputField };
