import type { Metadata } from 'next';
import Link from 'next/link';
import { runAudit, type AuditReport, type OnPageResult, type CwvResult, type Severity, PRIORITY_PATHS } from '@/lib/seo-audit';

export const metadata: Metadata = {
  title: 'SEO — Audit',
  robots: { index: false, follow: false },
};

// Audits are heavy. Force dynamic + long timeout.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Props = { searchParams: Promise<{ run?: string; cwv?: string }> };

export default async function SeoAuditPage(props: Props) {
  const params = await props.searchParams;
  const shouldRun = params.run === '1';
  const includeCwv = params.cwv !== '0';

  let report: AuditReport | null = null;
  let runtimeMs = 0;
  if (shouldRun) {
    const t0 = Date.now();
    report = await runAudit({ includeCwv });
    runtimeMs = Date.now() - t0;
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

      {!report ? (
        <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
          <p className="italic">
            No audit run yet. Click <strong className="not-italic text-amber-400">Run audit</strong> above.
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
        <ReportView report={report} runtimeMs={runtimeMs} includeCwv={includeCwv} />
      )}
    </div>
  );
}

// =========================================================================

function ReportView({ report, runtimeMs, includeCwv }: { report: AuditReport; runtimeMs: number; includeCwv: boolean }) {
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
            return <PageCard key={p.url} page={p} cwv={c} includeCwv={includeCwv} />;
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

function PageCard({ page, cwv, includeCwv }: { page: OnPageResult; cwv?: CwvResult; includeCwv: boolean }) {
  const path = pathOf(page.url);
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
