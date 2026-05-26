import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchGscReport, isGscConfigured, gscAuthMode } from '@/lib/gsc';
import { Sparkline } from '@/components/admin/Sparkline';

export const metadata: Metadata = {
  title: 'SEO — Google Search Console',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminSeoPage() {
  if (!isGscConfigured()) {
    return <ConfigurePrompt />;
  }
  const report = await fetchGscReport({ days: 28 }).catch((err) => {
    console.warn('[admin/seo] GSC fetch failed', err);
    return null;
  });
  if (!report) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-3xl text-zinc-50">SEO</h1>
        <div className="rounded border border-red-900/40 bg-red-950/10 p-4 text-sm text-red-300">
          Google Search Console returned an error. Most common cause: the service-account email isn&apos;t
          a verified user on the GSC property. See <code>apps/web/lib/gsc.ts</code> for setup.
        </div>
      </div>
    );
  }

  const t = report.totals;
  const days = report.byDay;
  const clicksSeries = days.map((d) => d.clicks);
  const imprSeries = days.map((d) => d.impressions);
  const ctrSeries = days.map((d) => d.ctr * 100);
  const posSeries = days.map((d) => d.position);
  const dateLabels = days.map((d) => d.keys[0] ?? '');

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-serif text-3xl text-zinc-50">SEO — Google Search Console</h1>
          <span className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400">
            auth: {gscAuthMode()}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Organic Google performance for <code className="text-amber-400">{report.site}</code> over the
          last <span className="text-zinc-200">{days.length} days</span>
          {' '}({report.startDate} → {report.endDate}).
          GSC has a 2–3 day data lag.
        </p>
      </header>

      {/* Totals + sparklines */}
      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Performance · last 4 weeks</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat
            label="Clicks"
            value={t.clicks.toLocaleString()}
            values={clicksSeries}
            labels={dateLabels}
            color="#34d399"
            blurb="Visits from Google search results."
          />
          <BigStat
            label="Impressions"
            value={t.impressions.toLocaleString()}
            values={imprSeries}
            labels={dateLabels}
            color="#a78bfa"
            blurb="How often a CineCanon page appeared in results."
          />
          <BigStat
            label="CTR"
            value={`${(t.ctr * 100).toFixed(2)}%`}
            values={ctrSeries}
            labels={dateLabels}
            color="#f59e0b"
            blurb="Click-through rate on impressions."
          />
          <BigStat
            label="Avg position"
            value={t.position.toFixed(1)}
            values={posSeries}
            labels={dateLabels}
            color="#38bdf8"
            blurb="Average ranking. Lower is better."
            invertSparkline
          />
        </div>
      </section>

      <RowTable
        title="Top queries"
        subtitle="What people are searching that surfaces CineCanon"
        rows={report.topQueries}
        keyLabel="Query"
      />

      <RowTable
        title="Top landing pages"
        subtitle="Which URLs Google sent the traffic to"
        rows={report.topPages}
        keyLabel="URL"
        linkKey
      />

      <RowTable
        title="Top countries"
        subtitle="Where the search audience is"
        rows={report.topCountries}
        keyLabel="Country"
      />
    </div>
  );
}

function BigStat({
  label, value, values, labels, color, blurb, invertSparkline = false,
}: {
  label: string; value: string; values: number[]; labels: string[];
  color: string; blurb: string; invertSparkline?: boolean;
}) {
  // For position, a downward trend is *better* — invert the visual cue.
  const series = invertSparkline ? values.map((v) => -v) : values;
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 font-serif text-3xl text-zinc-50">{value}</p>
      <div className="mt-2">
        <Sparkline
          values={series}
          labels={labels}
          ariaLabel={label}
          width={220}
          height={32}
          color={color}
        />
      </div>
      <p className="mt-1 text-[10px] text-zinc-500">{blurb}</p>
    </div>
  );
}

function RowTable({
  title, subtitle, rows, keyLabel, linkKey = false,
}: {
  title: string; subtitle: string; rows: import('@/lib/gsc').GscRow[];
  keyLabel: string; linkKey?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">{title}</h2>
      <p className="mb-2 text-xs text-zinc-500 italic">{subtitle}</p>
      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-400">
          No data yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-xs">
            <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-normal">{keyLabel}</th>
                <th className="px-3 py-2 text-right font-normal w-20">Clicks</th>
                <th className="px-3 py-2 text-right font-normal w-24">Impressions</th>
                <th className="px-3 py-2 text-right font-normal w-16">CTR</th>
                <th className="px-3 py-2 text-right font-normal w-16">Position</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {rows.slice(0, 25).map((r, i) => {
                const k = r.keys[0] ?? '—';
                return (
                  <tr key={`${k}-${i}`} className="border-b border-zinc-900 last:border-0">
                    <td className="px-3 py-2">
                      {linkKey ? (
                        <a href={k} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">{k}</a>
                      ) : (
                        <span>{k}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.clicks.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.impressions.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{(r.ctr * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right font-mono">{r.position.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ConfigurePrompt() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-zinc-50">SEO — Google Search Console</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Not yet configured. One-time setup unlocks organic-search performance data on this page.
        </p>
      </header>

      <section className="rounded border border-amber-900/40 bg-amber-950/10 p-5 text-sm text-zinc-300">
        <h2 className="mb-3 font-serif text-lg text-amber-400">Setup — full runbook at <code className="not-italic text-amber-300">docs/runbooks/gsc-setup.md</code></h2>
        <p className="mb-3 text-zinc-400 italic">Two auth paths supported — OAuth (recommended) or service-account fallback. Set either group of env vars in Vercel and redeploy.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-amber-400">OAuth (recommended)</p>
            <ul className="mt-2 ml-4 list-disc space-y-1 font-mono text-[11px] text-amber-300">
              <li>GSC_OAUTH_CLIENT_ID</li>
              <li>GSC_OAUTH_CLIENT_SECRET</li>
              <li>GSC_REFRESH_TOKEN</li>
              <li>GSC_SITE_URL <span className="text-zinc-500">(e.g. sc-domain:cinecanon.com)</span></li>
            </ul>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Service-account (fallback)</p>
            <ul className="mt-2 ml-4 list-disc space-y-1 font-mono text-[11px] text-zinc-400">
              <li>GSC_SERVICE_ACCOUNT_EMAIL</li>
              <li>GSC_SERVICE_ACCOUNT_KEY</li>
              <li>GSC_SITE_URL</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 italic">
        <p>
          GSC is the only authoritative source for organic Google performance. Until this is wired,
          there is no way to answer &quot;how is our SEO going&quot; — only AEO data exists. Set this up first.
        </p>
      </section>
    </div>
  );
}
