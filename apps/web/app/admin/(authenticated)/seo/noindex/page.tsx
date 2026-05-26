import type { Metadata } from 'next';
import Link from 'next/link';
import { scanForNoindex } from '@/lib/noindex-scan';

export const metadata: Metadata = {
  title: 'SEO — Noindex scan',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Props = { searchParams: Promise<{ run?: string }> };

export default async function SeoNoindexPage(props: Props) {
  const params = await props.searchParams;
  const shouldRun = params.run === '1';
  let report: Awaited<ReturnType<typeof scanForNoindex>> | null = null;
  let runtimeMs = 0;
  if (shouldRun) {
    const t0 = Date.now();
    report = await scanForNoindex();
    runtimeMs = Date.now() - t0;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">Noindex / robots scan</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Sweeps up to 400 indexable URLs (index pages + 200 films + 100 crew)
            and flags any with <code>meta name=&quot;robots&quot; content=&quot;noindex&quot;</code>{' '}
            or an <code>X-Robots-Tag: noindex</code> response header. Also dumps
            <code>/robots.txt</code> for review.
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
          <span className="text-zinc-500 italic">Server-side; ~20–40s.</span>
        </form>
      </section>

      {!report ? (
        <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400 italic">
          No scan yet. Click <strong className="not-italic text-amber-400">Run scan</strong> above.
        </section>
      ) : (
        <>
          <section
            className="rounded border-2 p-5"
            style={{
              borderColor: report.hits.length > 0 ? '#7f1d1d66' : '#10b98166',
              background: report.hits.length > 0 ? '#7f1d1d11' : '#10b98111',
            }}
          >
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Scan summary</p>
            <p className="mt-2 font-serif text-2xl text-zinc-50">
              {report.hits.length === 0 ? (
                <span className="text-emerald-400">No accidental noindex found 🎉</span>
              ) : (
                <span className="text-red-300">
                  {report.hits.length} URL{report.hits.length === 1 ? '' : 's'} blocked from indexing
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Scanned {report.urlsScanned} URLs · ran in {(runtimeMs / 1000).toFixed(1)}s
              {report.errors.length > 0 && ` · ${report.errors.length} fetch errors`}
            </p>
          </section>

          {report.hits.length > 0 && (
            <section>
              <h2 className="mb-2 text-[10px] uppercase tracking-widest text-red-400">Noindex hits</h2>
              <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/40">
                <table className="w-full text-xs">
                  <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-normal">URL</th>
                      <th className="px-3 py-2 text-left font-normal">Source</th>
                      <th className="px-3 py-2 text-left font-normal">Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    {report.hits.map((h) => (
                      <tr key={h.url} className="border-b border-zinc-900 last:border-0 align-top">
                        <td className="px-3 py-2 font-mono text-[11px] break-all">
                          <a href={h.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400">{pathOf(h.url)}</a>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-red-400">{h.source}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-zinc-500 break-all">{h.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">/robots.txt</h2>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs">
              <p className="text-zinc-400">
                Status: <span className="font-mono">{report.robotsTxt.fetched ? `${report.robotsTxt.status} OK` : 'fetch failed'}</span>
                {' · '}
                <span className="font-mono">{report.robotsTxt.disallows.length}</span> Disallow rule{report.robotsTxt.disallows.length === 1 ? '' : 's'}
              </p>
              {report.robotsTxt.disallows.length > 0 && (
                <ul className="mt-2 ml-5 list-disc text-zinc-300 font-mono">
                  {report.robotsTxt.disallows.map((d, i) => (
                    <li key={`${d}-${i}`}>{d || '(empty)'}</li>
                  ))}
                </ul>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-zinc-500 hover:text-amber-400">Show raw robots.txt</summary>
                <pre className="mt-2 overflow-auto rounded bg-zinc-950 p-3 text-[11px] text-zinc-300">{report.robotsTxt.raw || '(empty)'}</pre>
              </details>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}
