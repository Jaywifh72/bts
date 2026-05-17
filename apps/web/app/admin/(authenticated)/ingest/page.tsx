import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listJobRuns, getLastRunPerJob, type JobRunStatus } from '@bts/db';
import { JOBS, JOB_GROUPS, type JobDef } from '@/lib/admin/job-registry';
import { runJobAction } from './actions';
import { TmdbQuickAdd } from '@/components/admin/TmdbQuickAdd';
// import { BulkRunBar } from '@/components/admin/BulkRunBar';

export const metadata: Metadata = {
  title: 'Ingest',
  robots: { index: false, follow: false },
};

// Force dynamic so the page is rendered per-request — diagnosing whether
// SSR'd-and-cached output is what's breaking React hydration here.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_BADGE: Record<JobRunStatus, string> = {
  queued: 'bg-zinc-700 text-zinc-200',
  running: 'bg-sky-600 text-zinc-50',
  success: 'bg-emerald-700 text-emerald-50',
  failed: 'bg-red-700 text-red-50',
  cancelled: 'bg-zinc-600 text-zinc-200',
};

const WEIGHT_LABEL: Record<JobDef['weight'], string> = {
  fast: '< 1 min',
  medium: '~minutes',
  long: '~tens of min+',
};

const WEIGHT_BADGE: Record<JobDef['weight'], string> = {
  fast: 'border-emerald-900/50 text-emerald-400/80',
  medium: 'border-amber-900/50 text-amber-400/80',
  long: 'border-red-900/50 text-red-400/80',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function JobCard({
  job,
  lastRun,
}: {
  job: JobDef;
  lastRun:
    | { status: JobRunStatus; started_at: string; duration_seconds: number | null; run_id: number; inserted_count: number; updated_count: number }
    | null;
}) {
  return (
    <form action={runJobAction} className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <input type="hidden" name="job_id" value={job.id} />

      <div className="flex items-baseline justify-between gap-2">
        <label className="flex flex-1 cursor-pointer items-baseline gap-2 select-none">
          {/* Checkbox associated with the page-level bulk-run form via
              the `form` attribute. Lives inside this card visually but
              belongs to a different form so the individual Run button
              isn't affected. */}
          <input
            type="checkbox"
            name="selected"
            value={job.id}
            form="bulk-run-form"
            className="h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900"
            aria-label={`Select ${job.label} for bulk run`}
          />
          <h3 className="font-serif text-base text-zinc-100">{job.label}</h3>
        </label>
        <span
          className={`shrink-0 rounded border ${WEIGHT_BADGE[job.weight]} px-1.5 py-0.5 text-[10px] uppercase tracking-wide`}
          title={WEIGHT_LABEL[job.weight]}
        >
          {job.weight}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">{job.description}</p>

      {job.inputs && job.inputs.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {job.inputs.map((input) => (
            <label key={input.name} className="block text-[10px] uppercase tracking-wide text-zinc-500">
              <span className="block">{input.label}</span>
              {input.type === 'boolean' ? (
                <input
                  name={input.name}
                  type="checkbox"
                  defaultChecked={input.default === true}
                  className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                />
              ) : (
                <input
                  name={input.name}
                  type={input.type === 'number' ? 'number' : 'text'}
                  placeholder={input.placeholder}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950/60 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-amber-700 focus:outline-none"
                />
              )}
            </label>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
          {lastRun ? (
            <>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${STATUS_BADGE[lastRun.status]}`}
              >
                {lastRun.status}
              </span>
              <span>{formatRelative(lastRun.started_at)}</span>
              <span className="text-zinc-600">·</span>
              <span>{formatDuration(lastRun.duration_seconds)}</span>
              {(lastRun.inserted_count > 0 || lastRun.updated_count > 0) && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="font-mono">
                    +{lastRun.inserted_count} ~{lastRun.updated_count}
                  </span>
                </>
              )}
            </>
          ) : (
            <span>Never run</span>
          )}
        </div>
        <button
          type="submit"
          className="rounded bg-amber-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
        >
          Run
        </button>
      </div>

      {lastRun && (
        <Link
          href={`/admin/ingest/runs/${lastRun.run_id}`}
          className="self-start text-[10px] uppercase tracking-wide text-zinc-500 hover:text-amber-400"
        >
          View last run →
        </Link>
      )}
    </form>
  );
}

export default async function AdminIngestPage(
  props: {
    searchParams: Promise<{ error?: string; dispatched?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const [recentRuns, lastPerJob] = await Promise.all([
    listJobRuns(db, { limit: 15 }),
    getLastRunPerJob(db),
  ]);

  const lastByJob = new Map(lastPerJob.map((r) => [r.job_id, r]));
  const error = searchParams.error;
  const dispatched = Number(searchParams.dispatched ?? 0);

  return (
    <div>
      {/* BulkRunBar (below) renders the form#bulk-run-form. Checkboxes
          on each JobCard reference it via the `form` attribute. */}

      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">Ingest</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Sync jobs and editorial seeds. Each card wraps a CLI
            command — clicking <em className="font-mono not-italic text-amber-400">Run</em> spawns
            it as a child process and streams stdout into a job run record.
            Jobs are idempotent unless explicitly noted.
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div className="font-mono text-zinc-300">{JOBS.length}</div>
          <div className="text-[10px] uppercase tracking-wide">Registered jobs</div>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          Failed to start: {error}
        </div>
      )}
      {dispatched > 0 && (
        <div className="mb-6 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          Dispatched {dispatched} job{dispatched === 1 ? '' : 's'} — see Recent
          runs below or watch{' '}
          <a
            href="https://github.com/Jaywifh72/bts/actions/workflows/admin-job.yml"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-emerald-100"
          >
            GitHub Actions ↗
          </a>
          .
        </div>
      )}

      {/* TMDb quick-add — top of the page so the most-frequent
          single-id workflow is one paste away. */}
      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg text-zinc-100">Quick add</h2>
        <p className="mb-4 max-w-2xl text-xs text-zinc-500">
          Paste a TMDb movie ID to preview and insert a single film
          without running a full bulk import. The form fetches{' '}
          <code className="font-mono text-amber-400">/movie/{'{id}'}</code>,
          shows you what would be inserted, and only writes on confirm.
        </p>
        <TmdbQuickAdd />
      </section>

      {/* Job groups */}
      {JOB_GROUPS.map((group) => {
        const items = JOBS.filter((j) => j.group === group.key);
        if (items.length === 0) return null;
        return (
          <section key={group.key} className="mb-10" data-group={group.key}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-lg text-zinc-100">{group.label}</h2>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-zinc-500">
                <label className="flex items-center gap-1.5 normal-case tracking-normal text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                    data-select-all-group={group.key}
                    aria-label={`Select all ${group.label} jobs`}
                  />
                  Select all
                </label>
                <span>{items.length} {items.length === 1 ? 'job' : 'jobs'}</span>
              </div>
            </div>
            <p className="mb-4 max-w-2xl text-xs text-zinc-500">{group.blurb}</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  lastRun={lastByJob.get(job.id) ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Recent runs */}
      <section className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-lg text-zinc-100">Recent runs</h2>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Last {recentRuns.length}
          </span>
        </div>
        {recentRuns.length === 0 ? (
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
            No job runs yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Started</th>
                  <th className="px-3 py-2 text-left">Job</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">+ / ~ / !</th>
                  <th className="px-3 py-2 text-right">By</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {recentRuns.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-900/40">
                    <td className="px-3 py-2 font-mono text-zinc-400">
                      {formatRelative(r.started_at)}
                    </td>
                    <td className="px-3 py-2 text-zinc-200">{r.job_label}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${STATUS_BADGE[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-400">
                      {r.inserted_count} / {r.updated_count} / {r.warning_count}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-500">
                      {r.triggered_by}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/ingest/runs/${r.id}`}
                        className="text-amber-400 hover:underline"
                      >
                        Log →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* BulkRunBar temporarily disabled — diagnosing hydration */}
      {/* <BulkRunBar /> */}
    </div>
  );
}
