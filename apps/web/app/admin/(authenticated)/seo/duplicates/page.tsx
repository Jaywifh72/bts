import type { Metadata } from 'next';
import Link from 'next/link';
import { scanForDuplicates, type DuplicateGroup } from '@/lib/duplicate-scan';

export const metadata: Metadata = {
  title: 'SEO — Duplicate content',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Props = { searchParams: Promise<{ run?: string }> };

export default async function SeoDuplicatesPage(props: Props) {
  const params = await props.searchParams;
  const shouldRun = params.run === '1';
  let report: Awaited<ReturnType<typeof scanForDuplicates>> | null = null;
  let runtimeMs = 0;
  if (shouldRun) {
    const t0 = Date.now();
    report = await scanForDuplicates();
    runtimeMs = Date.now() - t0;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">Duplicate-content scan</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Finds pages that share the same <code>&lt;title&gt;</code> or meta description.
            Google treats duplicate metadata as a strong duplicate-content signal — fix
            these before they suppress rankings.
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
            Scans index pages + up to 60 curated films. Server-side, ~20–40s.
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
    </div>
  );
}

function ReportView({ report, runtimeMs }: { report: NonNullable<Awaited<ReturnType<typeof scanForDuplicates>>>; runtimeMs: number }) {
  const dupTitleCount = report.titleDuplicates.reduce((a, g) => a + g.urls.length, 0);
  const dupDescCount = report.descriptionDuplicates.reduce((a, g) => a + g.urls.length, 0);
  const totalDup = dupTitleCount + dupDescCount;
  const anyDup = report.titleDuplicates.length > 0 || report.descriptionDuplicates.length > 0;

  return (
    <>
      <section
        className="rounded border-2 p-5"
        style={{
          borderColor: anyDup ? '#92400e66' : '#10b98166',
          background: anyDup ? '#92400e11' : '#10b98111',
        }}
      >
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">Scan summary</p>
        <p className="mt-2 font-serif text-2xl text-zinc-50">
          {!anyDup ? (
            <span className="text-emerald-400">No duplicate metadata found 🎉</span>
          ) : (
            <span className="text-amber-300">
              {report.titleDuplicates.length} title group{report.titleDuplicates.length === 1 ? '' : 's'} ·{' '}
              {report.descriptionDuplicates.length} description group{report.descriptionDuplicates.length === 1 ? '' : 's'}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Scanned {report.urlsScanned} URLs · {totalDup} pages involved in duplicates · ran in {(runtimeMs / 1000).toFixed(1)}s
        </p>
      </section>

      {report.titleDuplicates.length > 0 && (
        <GroupSection
          title="Duplicate <title> tags"
          groups={report.titleDuplicates}
          hint="Each group below shows pages with identical titles. Google treats these as the same page in many cases — give each a unique, descriptive title."
        />
      )}

      {report.descriptionDuplicates.length > 0 && (
        <GroupSection
          title="Duplicate meta descriptions"
          groups={report.descriptionDuplicates}
          hint="Search-result snippets pulled from page text often override the meta description, but identical declared descriptions still signal templated/duplicate content."
        />
      )}

      {report.missingTitleUrls.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-red-400">Missing &lt;title&gt; ({report.missingTitleUrls.length})</h2>
          <ul className="ml-5 list-disc text-xs text-zinc-300">
            {report.missingTitleUrls.map((u) => <li key={u}><code className="break-all">{pathOf(u)}</code></li>)}
          </ul>
        </section>
      )}

      {report.missingDescriptionUrls.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-amber-400">Missing meta description ({report.missingDescriptionUrls.length})</h2>
          <ul className="ml-5 list-disc text-xs text-zinc-300">
            {report.missingDescriptionUrls.slice(0, 30).map((u) => <li key={u}><code className="break-all">{pathOf(u)}</code></li>)}
            {report.missingDescriptionUrls.length > 30 && <li className="text-zinc-500">…and {report.missingDescriptionUrls.length - 30} more</li>}
          </ul>
        </section>
      )}

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 italic">
        <p>
          <strong className="not-italic text-amber-400">What to do:</strong>{' '}
          The fix is almost always in the page&apos;s <code>generateMetadata()</code> —
          interpolate the page&apos;s unique slug/title into the <code>title</code> and{' '}
          <code>description</code> fields. Two pages sharing a default fallback is the
          common cause.
        </p>
      </section>
    </>
  );
}

function GroupSection({ title, groups, hint }: { title: string; groups: DuplicateGroup[]; hint: string }) {
  return (
    <section>
      <h2 className="mb-1 text-[10px] uppercase tracking-widest text-amber-400">{title}</h2>
      <p className="mb-3 text-xs text-zinc-500 italic">{hint}</p>
      <ul className="space-y-3">
        {groups.map((g) => (
          <li key={g.value} className="rounded border border-amber-900/40 bg-amber-950/10 p-3">
            <p className="font-serif text-sm text-amber-200">
              &quot;{g.value.length > 140 ? `${g.value.slice(0, 140)}…` : g.value}&quot;
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">{g.urls.length} pages</p>
            <ul className="mt-2 ml-4 list-disc text-xs text-zinc-300">
              {g.urls.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer" className="font-mono break-all hover:text-amber-400">
                    {pathOf(u)}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}
