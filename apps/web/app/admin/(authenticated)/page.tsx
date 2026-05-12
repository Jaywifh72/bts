import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  countClaimsForReview,
  countEvidenceForReview,
  countOpenCorrections,
  countSourceHealthWarnings,
  countVideoTimestampAnnotationsForReview,
  listJobRuns,
  type JobRunStatus,
} from '@bts/db';
import {
  getEntityTotals,
  getCoverageStats,
  getRecentEdits,
  getRunStats24h,
} from '@/lib/admin/dashboard-queries';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

// The dashboard is intentionally dynamic — every panel is live and
// the cost of a stale tile is operator confusion.
export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<JobRunStatus, string> = {
  queued: 'bg-zinc-700 text-zinc-200',
  running: 'bg-sky-600 text-zinc-50 animate-pulse',
  success: 'bg-emerald-700 text-emerald-50',
  failed: 'bg-red-700 text-red-50',
  cancelled: 'bg-zinc-600 text-zinc-200',
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function HeroTile({
  label,
  value,
  hint,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  accent?: 'amber' | 'red' | 'emerald' | 'sky' | 'zinc';
}) {
  const accentClasses: Record<string, string> = {
    amber: 'border-amber-900/40 bg-amber-950/10 hover:border-amber-700/60',
    red: 'border-red-900/40 bg-red-950/10 hover:border-red-700/60',
    emerald: 'border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-700/60',
    sky: 'border-sky-900/40 bg-sky-950/10 hover:border-sky-700/60',
    zinc: 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
  };
  const cls = accentClasses[accent ?? 'zinc'];
  const inner = (
    <div className={`flex h-full flex-col justify-between rounded border p-4 transition-colors ${cls}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <div>
        <div className="font-serif text-3xl text-zinc-50">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function CoverageBar({ percent }: { percent: number }) {
  const tone =
    percent >= 80 ? 'bg-emerald-600' :
    percent >= 50 ? 'bg-amber-600' :
    'bg-red-600';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full ${tone}`} style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
    </div>
  );
}

const TABLE_LABEL: Record<string, string> = {
  productions: 'Production',
  people: 'Crew',
  vfx_houses: 'VFX house',
  stunt_companies: 'Stunt company',
  stunt_rigging_techniques: 'Rigging',
  safety_bulletins: 'Bulletin',
  stunt_sequences: 'Sequence',
};

export default async function AdminDashboardPage() {
  const [
    totals,
    coverage,
    recentRuns,
    recentEdits,
    runStats24h,
    openCorrections,
    claimsNeedingSources,
    evidencePending,
    timestampPending,
    sourceHealthWarnings,
  ] = await Promise.all([
    getEntityTotals(),
    getCoverageStats(),
    listJobRuns(db, { limit: 5 }),
    getRecentEdits(8),
    getRunStats24h(),
    countOpenCorrections(db),
    countClaimsForReview(db, { status: 'needs_source' }),
    countEvidenceForReview(db, 'pending'),
    countVideoTimestampAnnotationsForReview(db, { status: 'pending' }),
    countSourceHealthWarnings(db),
  ]);

  const totalQueue =
    openCorrections + claimsNeedingSources + evidencePending +
    timestampPending + sourceHealthWarnings;

  const totalEditorial =
    totals.vfx_houses + totals.stunt_companies + totals.stunt_schools +
    totals.stunt_sequences + totals.stunt_rigging + totals.safety_bulletins +
    totals.equipment_manufacturers + totals.equipment_series + totals.equipment_items +
    totals.post_houses;

  const lastRun = recentRuns[0];
  const successes24h = runStats24h.find((r) => r.status === 'success')?.n ?? 0;
  const failures24h = runStats24h.find((r) => r.status === 'failed')?.n ?? 0;
  const runs24hTotal = runStats24h.reduce((acc, r) => acc + r.n, 0);

  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">Admin overview</h1>
          <p className="mt-1 text-sm text-zinc-400">
            What changed, what needs attention, what to run next.
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div className="font-mono text-zinc-300">
            {(totals.productions + totals.people + totalEditorial).toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wide">Total rows tracked</div>
        </div>
      </header>

      {/* Hero tiles — four numbers that summarise the operation. */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeroTile
          label="Productions"
          value={totals.productions}
          hint={`${totals.people.toLocaleString()} crew tracked`}
          href="/admin/curate"
          accent="zinc"
        />
        <HeroTile
          label="Editorial entities"
          value={totalEditorial}
          hint={`${totals.vfx_houses} VFX · ${totals.stunt_rigging} rigs · ${totals.safety_bulletins} bulletins`}
          href="/admin/curate"
          accent="amber"
        />
        <HeroTile
          label="Open queue"
          value={totalQueue}
          hint={
            totalQueue > 0
              ? `${openCorrections} corrections · ${claimsNeedingSources} claims · ${sourceHealthWarnings} sources`
              : 'Inbox is clear.'
          }
          href={openCorrections > 0 ? '/admin/corrections' : '/admin/claims'}
          accent={totalQueue > 10 ? 'red' : totalQueue > 0 ? 'amber' : 'emerald'}
        />
        <HeroTile
          label="Last sync"
          value={lastRun ? relativeTime(lastRun.started_at) : '—'}
          hint={
            lastRun
              ? `${lastRun.job_label} · ${lastRun.status}`
              : 'No runs yet — visit /admin/ingest.'
          }
          href={lastRun ? `/admin/ingest/runs/${lastRun.id}` : '/admin/ingest'}
          accent={lastRun?.status === 'failed' ? 'red' : lastRun?.status === 'running' ? 'sky' : 'emerald'}
        />
      </section>

      {/* 24-hour ingest summary + Quick actions */}
      <section className="mb-8 grid gap-3 lg:grid-cols-3">
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 lg:col-span-1">
          <h2 className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Ingest · last 24h
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-serif text-2xl text-zinc-100">{runs24hTotal}</div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Runs</div>
            </div>
            <div>
              <div className="font-serif text-2xl text-emerald-400">{successes24h}</div>
              <div className="text-[10px] uppercase tracking-wide text-emerald-500/70">Success</div>
            </div>
            <div>
              <div className="font-serif text-2xl text-red-400">{failures24h}</div>
              <div className="text-[10px] uppercase tracking-wide text-red-500/70">Failed</div>
            </div>
          </div>
          <Link
            href="/admin/ingest"
            className="mt-3 inline-block text-xs text-amber-400 hover:underline"
          >
            Run something →
          </Link>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 lg:col-span-2">
          <h2 className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link
              href="/admin/ingest"
              className="rounded border border-zinc-800 bg-zinc-950/40 p-3 text-center hover:border-amber-700/60 hover:bg-amber-950/10"
            >
              <div className="font-serif text-base text-zinc-100">Run</div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">A sync job</div>
            </Link>
            <Link
              href="/admin/curate"
              className="rounded border border-zinc-800 bg-zinc-950/40 p-3 text-center hover:border-amber-700/60 hover:bg-amber-950/10"
            >
              <div className="font-serif text-base text-zinc-100">Create</div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">An entity</div>
            </Link>
            <Link
              href="/admin/corrections"
              className="rounded border border-zinc-800 bg-zinc-950/40 p-3 text-center hover:border-amber-700/60 hover:bg-amber-950/10"
            >
              <div className="font-serif text-base text-zinc-100">
                {openCorrections > 0 ? openCorrections : 'Triage'}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Corrections</div>
            </Link>
            <Link
              href="/admin/sources"
              className="rounded border border-zinc-800 bg-zinc-950/40 p-3 text-center hover:border-amber-700/60 hover:bg-amber-950/10"
            >
              <div className="font-serif text-base text-zinc-100">
                {sourceHealthWarnings > 0 ? sourceHealthWarnings : 'OK'}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">Source health</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Coverage breakdown */}
      <section className="mb-8 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Editorial coverage
          </h2>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            % of rows with the load-bearing field populated
          </span>
        </div>
        <div className="space-y-2.5">
          {coverage.map((c) => {
            const pct = c.total === 0 ? 0 : Math.round((c.complete / c.total) * 100);
            return (
              <div key={c.label} className="grid grid-cols-12 items-center gap-3">
                <Link
                  href={c.href}
                  className="col-span-3 text-sm text-zinc-200 hover:text-amber-400"
                >
                  {c.label}
                </Link>
                <span className="col-span-2 text-[10px] uppercase tracking-wide text-zinc-500">
                  {c.measure}
                </span>
                <div className="col-span-5">
                  <CoverageBar percent={pct} />
                </div>
                <div className="col-span-2 text-right font-mono text-xs text-zinc-300">
                  <span className="text-zinc-500">{c.complete}/{c.total}</span>
                  <span className="ml-2 inline-block w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-column lower row: Recent runs + Recent edits */}
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-baseline justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Recent ingest runs
            </h2>
            <Link href="/admin/ingest" className="text-[10px] uppercase tracking-wide text-amber-400 hover:underline">
              All →
            </Link>
          </div>
          {recentRuns.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">No runs yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {recentRuns.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/ingest/runs/${r.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-zinc-900/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-zinc-200">{r.job_label}</div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {relativeTime(r.started_at)}
                        {r.inserted_count > 0 && ` · +${r.inserted_count}`}
                        {r.updated_count > 0 && ` · ~${r.updated_count}`}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${STATUS_BADGE[r.status]}`}>
                      {r.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-baseline justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Recent edits
            </h2>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              {recentEdits.length}
            </span>
          </div>
          {recentEdits.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">Quiet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {recentEdits.map((e) => (
                <li key={`${e.table_name}-${e.slug}`}>
                  <Link
                    href={e.href}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-zinc-900/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-zinc-200">{e.display_name}</div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {TABLE_LABEL[e.table_name] ?? e.table_name}
                        <span className="ml-2 text-zinc-600">{relativeTime(e.updated_at)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-400">
                      View →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
