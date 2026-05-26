import type { Metadata } from 'next';
import Link from 'next/link';
import { scanInternalLinks, persistLinkScan, listLinkScanRuns, type LinkCheck, type LinkScanRunRow } from '@/lib/link-scan';
import { Sparkline } from '@/components/admin/Sparkline';

export const metadata: Metadata = {
  title: 'SEO — Broken-link scan',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Props = { searchParams: Promise<{ run?: string }> };

export default async function SeoLinksPage(props: Props) {
  const params = await props.searchParams;
  const shouldRun = params.run === '1';
  let report: Awaited<ReturnType<typeof scanInternalLinks>> | null = null;
  let runtimeMs = 0;
  if (shouldRun) {
    const t0 = Date.now();
    report = await scanInternalLinks();
    runtimeMs = Date.now() - t0;
    await persistLinkScan(report, runtimeMs);
  }
  const history = await listLinkScanRuns(20);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">Broken-link scan</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Crawls the priority pages, extracts every internal <code>&lt;a href&gt;</code>,
            and HEAD-checks each destination. Surfaces 404s and unintended redirects
            before Googlebot trips on them.
          </p>
        </div>
        <Link href="/admin/seo" className="text-sm text-zinc-400 hover:text-amber-400">← SEO home</Link>
      </header>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <form method="GET" className="flex flex-wrap items-baseline gap-3 text-sm">
          <input type="hidden" name="run" value="1" />
          <button
            type="submit"
            className="rounded border border-amber-700/60 bg-amber-600/20 px-4 py-2 font-serif text-amber-300 hover:border-amber-500 hover:bg-amber-600/30"
          >
            Run scan
          </button>
          <span className="text-zinc-500 italic">
            Server-side; ~10–30s. Capped at 500 unique destinations.
          </span>
        </form>
      </section>

      {!report ? (
        <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400 italic">
          No scan yet. Click <strong className="not-italic text-amber-400">Run scan</strong> above.
        </section>
      ) : (
        <ReportView report={report} runtimeMs={runtimeMs} />
      )}

      {history.length > 0 && <HistorySection history={history} />}
    </div>
  );
}

function HistorySection({ history }: { history: LinkScanRunRow[] }) {
  const series = [...history].reverse().map((r) => r.broken_count);
  return (
    <section>
      <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Scan history</h2>
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex items-baseline gap-4">
          <span className="text-xs text-zinc-400">Broken-link count, last {history.length} runs:</span>
          <Sparkline values={series} width={220} height={32} ariaLabel="Broken-link count trend" />
        </div>
        <table className="w-full text-xs">
          <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-2 py-2 text-left font-normal">When</th>
              <th className="px-2 py-2 text-right font-normal">Pages</th>
              <th className="px-2 py-2 text-right font-normal">Discovered</th>
              <th className="px-2 py-2 text-right font-normal">Checked</th>
              <th className="px-2 py-2 text-right font-normal">Broken</th>
              <th className="px-2 py-2 text-right font-normal">Redirects</th>
              <th className="px-2 py-2 text-right font-normal">Runtime</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {history.map((r) => (
              <tr key={r.id} className="border-b border-zinc-900 last:border-0">
                <td className="px-2 py-2 font-mono text-[11px]">{r.ran_at.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-2 py-2 text-right font-mono">{r.pages_crawled}</td>
                <td className="px-2 py-2 text-right font-mono">{r.links_discovered}{r.hit_cap && <span className="text-amber-500">*</span>}</td>
                <td className="px-2 py-2 text-right font-mono">{r.links_checked}</td>
                <td className="px-2 py-2 text-right font-mono" style={{ color: r.broken_count > 0 ? '#ef4444' : '#10b981' }}>{r.broken_count}</td>
                <td className="px-2 py-2 text-right font-mono text-amber-400">{r.redirect_count}</td>
                <td className="px-2 py-2 text-right font-mono text-zinc-500">{(r.runtime_ms / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] text-zinc-600 italic">* = scan hit the MAX_LINKS cap; raise the cap if you suspect more links exist.</p>
      </div>
    </section>
  );
}

function ReportView({ report, runtimeMs }: { report: NonNullable<Awaited<ReturnType<typeof scanInternalLinks>>>; runtimeMs: number }) {
  const okCount = report.linksChecked - report.broken.length - report.redirects.length;
  return (
    <>
      <section
        className="rounded border-2 p-5"
        style={{
          borderColor: report.broken.length > 0 ? '#7f1d1d66' : '#10b98166',
          background: report.broken.length > 0 ? '#7f1d1d11' : '#10b98111',
        }}
      >
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">Scan summary</p>
        <p className="mt-2 font-serif text-2xl text-zinc-50">
          {report.broken.length === 0 ? (
            <span className="text-emerald-400">No broken links found 🎉</span>
          ) : (
            <span className="text-red-300">
              {report.broken.length} broken link{report.broken.length === 1 ? '' : 's'} found
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Crawled {report.pagesCrawled} pages · discovered {report.linksDiscovered} unique destinations ·
          checked {report.linksChecked} · {okCount} OK · {report.redirects.length} redirected ·{' '}
          {report.broken.length} broken · ran in {(runtimeMs / 1000).toFixed(1)}s
        </p>
      </section>

      {report.broken.length > 0 && (
        <LinkSection title="Broken (non-2xx)" rows={report.broken} severity="fail" />
      )}
      {report.redirects.length > 0 && (
        <LinkSection title="Redirects (200 OK, but URL was rewritten)" rows={report.redirects} severity="warn" />
      )}

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 italic">
        <p>
          <strong className="not-italic text-amber-400">What to do:</strong>{' '}
          Broken (red) links are unambiguous bugs — fix the source pages.{' '}
          Redirects (amber) are usually harmless but indicate stale links worth updating
          (Google sees them as soft signals about content freshness).
        </p>
        <p className="mt-2">
          The scan crawls only the priority pages (12 pages) to keep runtime bounded.
          External destinations (anything not on cinecanon.com) are skipped.
        </p>
      </section>

      <details className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-amber-400">Sample of OK links ({report.okSample.length} of {okCount})</summary>
        <ul className="mt-2 ml-5 list-disc space-y-1">
          {report.okSample.map((l) => (
            <li key={l.href}><code>{l.href}</code></li>
          ))}
        </ul>
      </details>
    </>
  );
}

function LinkSection({ title, rows, severity }: { title: string; rows: LinkCheck[]; severity: 'fail' | 'warn' }) {
  const color = severity === 'fail' ? '#ef4444' : '#f59e0b';
  return (
    <section>
      <h2 className="mb-2 text-[10px] uppercase tracking-widest" style={{ color }}>{title} ({rows.length})</h2>
      <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/40">
        <table className="w-full text-xs">
          <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-normal">URL</th>
              <th className="px-3 py-2 text-right font-normal w-16">Status</th>
              <th className="px-3 py-2 text-left font-normal">Found on</th>
              <th className="px-3 py-2 text-left font-normal">Redirect target</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {rows.map((r) => (
              <tr key={r.href} className="border-b border-zinc-900 last:border-0 align-top">
                <td className="px-3 py-2 font-mono text-[11px] break-all">
                  <a href={r.href} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400">{r.href}</a>
                </td>
                <td className="px-3 py-2 text-right font-mono" style={{ color: r.status >= 400 || r.status === 0 ? '#ef4444' : '#f59e0b' }}>
                  {r.status === 0 ? 'ERR' : r.status}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                  {r.foundOn.slice(0, 3).map((p) => (
                    <div key={p} className="break-all">{pathOf(p)}</div>
                  ))}
                  {r.foundOn.length > 3 && <div className="text-zinc-600">…and {r.foundOn.length - 3} more</div>}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-500 break-all">
                  {r.finalUrl ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}
