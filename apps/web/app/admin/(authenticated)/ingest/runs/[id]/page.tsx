import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getJobRun, type JobRunStatus } from '@bts/db';
import { JobRunAutoRefresh } from '@/components/admin/JobRunAutoRefresh';

export const metadata: Metadata = {
  title: 'Run',
  robots: { index: false, follow: false },
};

// Don't cache — the log_text mutates in real time as the spawned
// process emits to stdout/stderr.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_BADGE: Record<JobRunStatus, string> = {
  queued: 'bg-zinc-700 text-zinc-200',
  running: 'bg-sky-600 text-zinc-50 animate-pulse',
  success: 'bg-emerald-700 text-emerald-50',
  failed: 'bg-red-700 text-red-50',
  cancelled: 'bg-zinc-600 text-zinc-200',
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(start: string, end: string | null): string {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  return `${(ms / 3_600_000).toFixed(2)}h`;
}

export default async function JobRunDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const run = await getJobRun(db, id);
  if (!run) notFound();

  const isLive = run.status === 'running' || run.status === 'queued';

  return (
    <div>
      {/* Auto-refresh while the job is still running. Uses a client-side
          router.refresh() — silent RSC re-fetch that doesn't unload the
          page. Replaces an earlier <meta httpEquiv="refresh"> which
          forced a hard browser reload every 3s and made the rest of the
          admin UI feel "stuck" because any click competed with the
          in-flight reload. Drops as soon as the row finalises so we stop
          hammering the DB. */}
      {isLive && <JobRunAutoRefresh intervalMs={3000} />}

      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/admin/ingest" className="hover:text-amber-400">Ingest</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <Link href={`/admin/ingest?job=${run.job_id}`} className="hover:text-amber-400">
          {run.job_id}
        </Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">run #{run.id}</span>
      </nav>

      <header className="mb-6">
        <div className="flex items-baseline gap-3">
          <span
            className={`rounded px-2 py-0.5 font-mono text-xs ${STATUS_BADGE[run.status]}`}
          >
            {run.status}
          </span>
          <h1 className="font-serif text-2xl text-zinc-50">{run.job_label}</h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
          <span>
            <span className="uppercase tracking-wide">Started</span>{' '}
            <span className="font-mono text-zinc-300">{formatTimestamp(run.started_at)}</span>
          </span>
          <span>
            <span className="uppercase tracking-wide">Duration</span>{' '}
            <span className="font-mono text-zinc-300">
              {formatDuration(run.started_at, run.finished_at)}
            </span>
          </span>
          {run.exit_code !== null && (
            <span>
              <span className="uppercase tracking-wide">Exit</span>{' '}
              <span className="font-mono text-zinc-300">{run.exit_code}</span>
            </span>
          )}
          <span>
            <span className="uppercase tracking-wide">Trigger</span>{' '}
            <span className="font-mono text-zinc-300">{run.triggered_by}</span>
          </span>
          {run.github_run_url && (
            <a
              href={run.github_run_url}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:text-amber-300"
            >
              <span className="uppercase tracking-wide">GitHub Actions</span>{' '}
              <span className="font-mono">↗</span>
            </a>
          )}
        </div>
      </header>

      {/* Outcome strip */}
      <div className="mb-6 grid grid-cols-3 gap-3 text-xs">
        <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3">
          <div className="font-serif text-2xl text-emerald-400">{run.inserted_count}</div>
          <div className="text-[10px] uppercase tracking-wide text-emerald-200/60">Inserted</div>
        </div>
        <div className="rounded border border-amber-900/40 bg-amber-950/20 p-3">
          <div className="font-serif text-2xl text-amber-400">{run.updated_count}</div>
          <div className="text-[10px] uppercase tracking-wide text-amber-200/60">Updated</div>
        </div>
        <div className="rounded border border-red-900/40 bg-red-950/20 p-3">
          <div className="font-serif text-2xl text-red-400">{run.warning_count}</div>
          <div className="text-[10px] uppercase tracking-wide text-red-200/60">Warnings</div>
        </div>
      </div>

      {run.error_message && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          <div className="font-serif text-base">Error</div>
          <p className="mt-1 font-mono text-xs">{run.error_message}</p>
        </div>
      )}

      {/* Params dump */}
      {Object.keys(run.params).length > 0 && (
        <details className="mb-6 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-zinc-500">
            Params
          </summary>
          <pre className="mt-2 overflow-x-auto font-mono text-zinc-300">
            {JSON.stringify(run.params, null, 2)}
          </pre>
        </details>
      )}

      {/* Live log */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-serif text-base text-zinc-100">Output</h2>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            {run.log_text.length.toLocaleString()} chars
            {isLive && <span className="ml-2 text-sky-400">· auto-refreshing</span>}
          </span>
        </div>
        <pre className="max-h-[60vh] overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
{run.log_text || (isLive ? 'Spawning…' : '(no output)')}
        </pre>
      </section>
    </div>
  );
}
