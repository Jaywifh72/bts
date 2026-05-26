import type { Metadata } from 'next';
import Link from 'next/link';
import { inspectUrl, isGscConfigured } from '@/lib/gsc';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'SEO — URL Inspector',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Props = { searchParams: Promise<{ url?: string }> };

export default async function SeoInspectPage(props: Props) {
  const params = await props.searchParams;
  const targetUrl = (params.url ?? '').trim();
  const hasGsc = isGscConfigured();
  const result = hasGsc && targetUrl ? await inspectUrl(targetUrl) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">URL Inspector</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Calls Google&apos;s URL Inspection API for any URL on the site. Faster than
            clicking through to Search Console for routine checks.
          </p>
        </div>
        <Link href="/admin/seo" className="text-sm text-zinc-400 hover:text-amber-400">← SEO home</Link>
      </header>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <form method="GET" className="flex flex-col gap-3">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500">URL to inspect</label>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              name="url"
              defaultValue={targetUrl || `${siteUrl()}/films/the-brutalist-2024`}
              placeholder={`${siteUrl()}/films/something`}
              required
              className="flex-1 min-w-0 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded border border-amber-700/60 bg-amber-600/20 px-4 py-2 font-serif text-amber-300 hover:border-amber-500 hover:bg-amber-600/30"
            >
              Inspect
            </button>
          </div>
          <p className="text-xs text-zinc-500 italic">
            Read-only. Calls https://www.googleapis.com/webmasters/v3/urlInspection/index:inspect via your existing OAuth identity.
          </p>
        </form>
      </section>

      {!hasGsc && (
        <section className="rounded border border-amber-900/40 bg-amber-950/10 p-4 text-sm text-amber-200">
          GSC isn&apos;t configured — see <code className="text-amber-400">/admin/seo</code> for setup.
        </section>
      )}

      {result && <ResultCard result={result} />}
    </div>
  );
}

function ResultCard({ result }: { result: Awaited<ReturnType<typeof inspectUrl>> }) {
  if (!result.ok) {
    return (
      <section className="rounded border border-red-900/40 bg-red-950/10 p-4 text-sm">
        <p className="font-serif text-base text-red-300">Inspection failed</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded bg-zinc-950 p-3 font-mono text-[11px] text-red-200">
          {result.error}
        </pre>
      </section>
    );
  }

  const verdict = result.verdict ?? 'unknown';
  const verdictColor =
    verdict === 'PASS' ? '#34d399'
    : verdict === 'NEUTRAL' ? '#f59e0b'
    : verdict === 'PARTIAL' ? '#fb923c'
    : verdict === 'FAIL' ? '#ef4444'
    : '#9b9b9b';

  return (
    <>
      <section className="rounded border-2 p-5" style={{ borderColor: `${verdictColor}66`, background: `${verdictColor}11` }}>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">Verdict</p>
        <p className="mt-1 font-serif text-3xl" style={{ color: verdictColor }}>{verdict}</p>
        <p className="mt-1 text-sm text-zinc-300">
          {result.coverageState ?? 'No coverage info'}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Inspected URL: <code className="text-amber-400">{result.inspectedUrl}</code>{' '}
          via property <code className="text-amber-400">{result.inspectedSite}</code>
        </p>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">Index status</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Field label="Indexing state" value={result.indexingState} />
          <Field label="Robots.txt state" value={result.robotsTxtState} />
          <Field label="Page fetch state" value={result.pageFetchState} />
          <Field label="Last crawl time" value={formatDate(result.lastCrawlTime)} />
          <Field label="Crawled as (bot)" value={result.crawledAs} />
          <Field label="User canonical" value={result.userCanonical} mono />
          <Field label="Google-picked canonical" value={result.googleCanonical} mono />
        </dl>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400">
        <p>
          <strong className="text-amber-400">Reading this:</strong>{' '}
          <code>PASS</code> = indexed and eligible to appear in Google search.{' '}
          <code>NEUTRAL</code> = inspected but not yet a verdict (newly verified property).{' '}
          <code>PARTIAL</code> = indexed but with warnings (canonical mismatch, etc).{' '}
          <code>FAIL</code> = blocked from indexing (robots, noindex, server error, etc).
        </p>
        <p className="mt-2">
          To request indexing for a URL that&apos;s not in Google yet, you still need to use the
          GSC UI — the API is read-only.
        </p>
      </section>

      <details className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-amber-400">Raw API response</summary>
        <pre className="mt-3 overflow-x-auto rounded bg-zinc-950 p-3 font-mono text-[10px] text-zinc-300">
          {JSON.stringify(result.raw, null, 2)}
        </pre>
      </details>
    </>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className={`${mono ? 'font-mono text-[11px]' : 'text-sm'} text-zinc-200`}>
        {value ?? <span className="text-zinc-600 italic">—</span>}
      </dd>
    </div>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
