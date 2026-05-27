import type { Metadata } from 'next';
import Link from 'next/link';
import {
  runAudit,
  listAuditRuns,
  getPreviousScores,
  type AuditReport,
  type AuditRunSummary,
  type OnPageResult,
  type CwvResult,
  type Severity,
  PRIORITY_PATHS,
} from '@/lib/seo-audit';
import { Sparkline } from '@/components/admin/Sparkline';

export const metadata: Metadata = {
  title: 'SEO — Audit',
  robots: { index: false, follow: false },
};

// Audits are heavy. Force dynamic + long timeout.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Props = { searchParams: Promise<{ run?: string; cwv?: string }> };

export default async function SeoAuditPage(props: Props) {
  const params = await props.searchParams;
  const shouldRun = params.run === '1';
  const includeCwv = params.cwv !== '0';

  let report: (AuditReport & { runId?: string }) | null = null;
  let runtimeMs = 0;
  if (shouldRun) {
    const t0 = Date.now();
    report = await runAudit({ includeCwv });
    runtimeMs = Date.now() - t0;
  }

  // Trend history regardless of whether we just ran an audit
  const history = await listAuditRuns(20);
  let previousScores = new Map<string, number>();
  if (report?.runId) {
    previousScores = await getPreviousScores(
      report.onPage.map((p) => p.url),
      report.runId,
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">SEO Audit</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Fetches {PRIORITY_PATHS.length} priority pages, parses each for the on-page signals
            Google ranks on (title/meta/canonical/H1/JSON-LD/img alt), and queries Google&apos;s
            PageSpeed Insights for Core Web Vitals.
          </p>
        </div>
        <Link href="/admin/seo" className="text-sm text-zinc-400 hover:text-amber-400">← SEO home</Link>
      </header>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <form method="GET" className="flex flex-wrap items-baseline gap-4 text-sm">
          <input type="hidden" name="run" value="1" />
          <label className="flex items-center gap-2 text-zinc-300">
            <input
              type="checkbox"
              name="cwv"
              value="1"
              defaultChecked
              className="accent-amber-500"
            />
            Include Core Web Vitals (PageSpeed Insights — adds ~3s)
          </label>
          <button
            type="submit"
            className="rounded border border-amber-700/60 bg-amber-600/20 px-4 py-2 font-serif text-amber-300 hover:border-amber-500 hover:bg-amber-600/30"
          >
            Run audit
          </button>
          <span className="text-zinc-500 italic">
            Server-side run, ~5-15s. Safe to run any time; no writes.
          </span>
        </form>
      </section>

      {history.length > 0 && <HistorySection history={history} />}

      {!report ? (
        <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
          <p className="italic">
            {history.length === 0
              ? 'No audit run yet. '
              : 'No audit run this session. '}
            Click <strong className="not-italic text-amber-400">Run audit</strong> above to generate fresh results.
          </p>
          <p className="mt-2 text-xs">
            Priority pages audited:{' '}
            {PRIORITY_PATHS.map((p, i) => (
              <span key={p}>
                <code className="text-zinc-300">{p}</code>
                {i < PRIORITY_PATHS.length - 1 && <span className="text-zinc-600">, </span>}
              </span>
            ))}
          </p>
        </section>
      ) : (
        <ReportView
          report={report}
          runtimeMs={runtimeMs}
          includeCwv={includeCwv}
          previousScores={previousScores}
        />
      )}
    </div>
  );
}

function HistorySection({ history }: { history: AuditRunSummary[] }) {
  // History came back DESC; flip to ASC for the sparkline so left-to-right = oldest → newest.
  const asc = [...history].reverse();
  const scores = asc.map((r) => r.avgScore);
  const labels = asc.map((r) => r.ranAt.slice(0, 16));
  const latest = history[0]!;
  const prev = history[1];
  const delta = prev ? latest.avgScore - prev.avgScore : 0;
  const deltaSign = delta > 0 ? '+' : delta < 0 ? '' : '±';

  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-500">Trend · last {history.length} runs</h2>
          <p className="mt-2 font-serif text-2xl text-zinc-50">
            Latest avg score{' '}
            <span style={{ color: latest.avgScore >= 90 ? '#34d399' : latest.avgScore >= 70 ? '#f59e0b' : '#ef4444' }}>
              {latest.avgScore}/100
            </span>
            {prev && (
              <span className="ml-2 font-sans text-sm" style={{ color: delta > 0 ? '#34d399' : delta < 0 ? '#ef4444' : '#9b9b9b' }}>
                {deltaSign}{delta} vs prior
              </span>
            )}
          </p>
          <p className="text-xs text-zinc-500">Run at {new Date(latest.ranAt).toLocaleString()}</p>
        </div>
        <Sparkline
          values={scores}
          labels={labels}
          ariaLabel="Average audit score"
          width={280}
          height={42}
          color="#f59e0b"
        />
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-zinc-500 hover:text-amber-400">Show table of recent runs</summary>
        <table className="mt-2 w-full">
          <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-2 py-1 text-left font-normal">Ran at</th>
              <th className="px-2 py-1 text-right font-normal">Pages</th>
              <th className="px-2 py-1 text-right font-normal">Score</th>
              <th className="px-2 py-1 text-right font-normal">OK</th>
              <th className="px-2 py-1 text-right font-normal">Warn</th>
              <th className="px-2 py-1 text-right font-normal">Fail</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {history.map((r) => (
              <tr key={r.id} className="border-b border-zinc-900 last:border-0">
                <td className="px-2 py-1 font-mono">{r.ranAt.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-2 py-1 text-right font-mono">{r.pagesCount}</td>
                <td className="px-2 py-1 text-right font-mono font-bold">{r.avgScore}</td>
                <td className="px-2 py-1 text-right font-mono text-emerald-400">{r.okCount}</td>
                <td className="px-2 py-1 text-right font-mono text-amber-400">{r.warnCount}</td>
                <td className="px-2 py-1 text-right font-mono text-red-400">{r.failCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

// =========================================================================

function ReportView({
  report, runtimeMs, includeCwv, previousScores,
}: {
  report: AuditReport;
  runtimeMs: number;
  includeCwv: boolean;
  previousScores: Map<string, number>;
}) {
  const { summary, onPage, cwv } = report;
  return (
    <>
      <section
        className="rounded border-2 p-6"
        style={{
          borderColor: summary.failPages > 0 ? '#7f1d1d66' : summary.warnPages > 2 ? '#92400e66' : '#10b98166',
          background: summary.failPages > 0 ? '#7f1d1d11' : summary.warnPages > 2 ? '#92400e11' : '#10b98111',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Audit summary</p>
            <p className="mt-1 font-serif text-2xl text-zinc-50">
              {onPage.length} pages, average score{' '}
              <span style={{ color: summary.averageScore >= 90 ? '#34d399' : summary.averageScore >= 70 ? '#f59e0b' : '#ef4444' }}>
                {summary.averageScore}/100
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Ran in {(runtimeMs / 1000).toFixed(1)}s · {new Date(report.ranAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <Stat label="OK"   value={summary.okPages}   color="#34d399" />
            <Stat label="Warn" value={summary.warnPages} color="#f59e0b" />
            <Stat label="Fail" value={summary.failPages} color="#ef4444" />
            {includeCwv && (
              <>
                <div className="w-px self-stretch bg-zinc-800" />
                <Stat label="CWV good" value={summary.cwvGoodCount} color="#34d399" />
                <Stat label="CWV poor" value={summary.cwvPoorCount} color="#ef4444" />
              </>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Per-page results</h2>
        <ul className="space-y-3">
          {onPage.map((p) => {
            const c = cwv.find((x) => x.url === p.url);
            const prev = previousScores.get(p.url);
            return <PageCard key={p.url} page={p} cwv={c} includeCwv={includeCwv} previousScore={prev} />;
          })}
        </ul>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 italic">
        <p>
          <strong className="not-italic text-amber-400">What to do with this:</strong>{' '}
          Fix the FAIL items first (red dots). They&apos;re ranking blockers. WARN items
          (amber) are 1-2pt drops each — clean them up before any major content push.
        </p>
        <p className="mt-2">
          Core Web Vitals (LCP/INP/CLS) are direct Google ranking signals.
          Targets: LCP &lt; 2.5s, INP &lt; 200ms, CLS &lt; 0.1. The PSI score
          (0-100) maps roughly to: 90+ green, 50-89 amber, &lt;50 red.
        </p>
      </section>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className="font-serif text-2xl" style={{ color }}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
    </div>
  );
}

function PageCard({
  page, cwv, includeCwv, previousScore,
}: {
  page: OnPageResult;
  cwv?: CwvResult;
  includeCwv: boolean;
  previousScore?: number;
}) {
  const path = pathOf(page.url);
  const delta = previousScore != null ? page.score - previousScore : null;
  return (
    <li className={`rounded border ${cardBorder(page.worst)} bg-zinc-900/40 p-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <SeverityDot s={page.worst} />
          <Link href={path} className="font-mono text-sm text-amber-400 hover:underline truncate">
            {path}
          </Link>
          <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            {page.status === 200 ? '200 OK' : `HTTP ${page.status}`}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-500">
            score <span className="font-mono text-zinc-200">{page.score}</span>
            {delta != null && delta !== 0 && (
              <span
                className="ml-1 font-mono"
                style={{ color: delta > 0 ? '#34d399' : '#ef4444' }}
                title={`Previous score: ${previousScore}`}
              >
                ({delta > 0 ? '+' : ''}{delta})
              </span>
            )}
          </span>
          {includeCwv && cwv && <CwvBadges cwv={cwv} />}
        </div>
      </div>

      {/* Signals snapshot */}
      <div className="mt-3 grid gap-2 text-[11px] text-zinc-400 sm:grid-cols-2 lg:grid-cols-3">
        <Signal label="Title" value={page.signals.title} hint={page.signals.titleLen ? `${page.signals.titleLen} chars` : undefined} />
        <Signal label="Meta desc" value={page.signals.metaDescription ?? '— missing'} hint={page.signals.metaDescriptionLen ? `${page.signals.metaDescriptionLen} chars` : undefined} />
        <Signal label="Canonical" value={page.signals.canonical ?? '— missing'} />
        <Signal label="H1" value={page.signals.h1First ?? '— missing'} hint={page.signals.h1Count > 1 ? `${page.signals.h1Count} found` : undefined} />
        <Signal label="JSON-LD" value={page.signals.jsonLdTypes.length ? page.signals.jsonLdTypes.join(', ') : '— none'} hint={page.signals.claimReviewCount > 0 ? `${page.signals.claimReviewCount} ClaimReview blocks` : undefined} />
        <Signal label="Images" value={`${page.signals.imgCount}`} hint={page.signals.imgMissingAltCount > 0 ? `${page.signals.imgMissingAltCount} missing alt` : 'all have alt'} />
      </div>

      {/* Issues */}
      {page.issues.length > 0 && (
        <ul className="mt-3 space-y-1">
          {page.issues.map((iss, i) => (
            <li key={i} className="flex items-baseline gap-2 text-xs">
              <SeverityDot s={iss.severity} />
              <code className="text-[10px] uppercase tracking-widest text-zinc-500">{iss.code}</code>
              <span className="text-zinc-300">{iss.message}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CwvBadges({ cwv }: { cwv: CwvResult }) {
  if (!cwv.ok) {
    return (
      <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500" title={cwv.error}>
        CWV: n/a
      </span>
    );
  }
  return (
    <span className="flex items-baseline gap-2 font-mono text-[10px]">
      {cwv.performance != null && (
        <span style={{ color: cwv.performance >= 90 ? '#34d399' : cwv.performance >= 50 ? '#f59e0b' : '#ef4444' }}>
          PSI {cwv.performance}
        </span>
      )}
      {cwv.lcpMs != null && (
        <span style={{ color: cwv.lcpMs < 2500 ? '#34d399' : cwv.lcpMs < 4000 ? '#f59e0b' : '#ef4444' }}>
          LCP {(cwv.lcpMs / 1000).toFixed(1)}s
        </span>
      )}
      {cwv.inpMs != null && (
        <span style={{ color: cwv.inpMs < 200 ? '#34d399' : cwv.inpMs < 500 ? '#f59e0b' : '#ef4444' }}>
          INP {cwv.inpMs}ms
        </span>
      )}
      {cwv.cls != null && (
        <span style={{ color: cwv.cls < 0.1 ? '#34d399' : cwv.cls < 0.25 ? '#f59e0b' : '#ef4444' }}>
          CLS {cwv.cls.toFixed(3)}
        </span>
      )}
    </span>
  );
}

function Signal({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950/40 px-2 py-1">
      <p className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="truncate text-zinc-300" title={value ?? undefined}>{value ?? '—'}</p>
      {hint && <p className="text-[9px] text-zinc-600 italic">{hint}</p>}
    </div>
  );
}

function SeverityDot({ s }: { s: Severity }) {
  const color = s === 'ok' ? '#34d399' : s === 'warn' ? '#f59e0b' : '#ef4444';
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-label={s} />;
}

function cardBorder(s: Severity): string {
  if (s === 'fail') return 'border-red-900/40';
  if (s === 'warn') return 'border-amber-900/40';
  return 'border-emerald-900/30';
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}
