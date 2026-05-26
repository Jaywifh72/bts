import type { Metadata } from 'next';
import Link from 'next/link';
import {
  fetchGscReport,
  isGscConfigured,
  gscAuthMode,
  gscErrorMessage,
  listGscSites,
} from '@/lib/gsc';
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

  const result = await fetchGscReport({ days: 28 }).catch((err) => ({
    ok: false as const,
    error: gscErrorMessage(err),
    sites: [],
  }));

  if (!result.ok) {
    const configuredSite = (process.env.GSC_SITE_URL ?? '').trim() || '(unset — auto-discovery)';
    return <ErrorState
      mode={gscAuthMode()}
      configuredSite={configuredSite}
      fetchError={result.error}
      sitesProbe={{ ok: true, sites: result.sites }}
    />;
  }

  const report = result.report;
  const t = report.totals;
  const days = report.byDay;
  // The actual query window in days, not the count of returned rows.
  const windowDays = Math.round(
    (Date.parse(report.endDate) - Date.parse(report.startDate)) / (24 * 3600 * 1000),
  );
  const hasAnyData = t.clicks > 0 || t.impressions > 0 || days.length > 0;
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
          Organic Google performance for <code className="text-amber-400">{report.site}</code>
          {' '}<span className="text-[10px] text-zinc-600">({report.siteOrigin})</span> over the
          last <span className="text-zinc-200">{windowDays} days</span>
          {' '}({report.startDate} → {report.endDate}).
          GSC has a 2–3 day data lag.
        </p>
      </header>

      {!hasAnyData && (
        <section className="rounded border border-amber-900/40 bg-amber-950/10 p-4 text-sm text-amber-200">
          <p className="font-serif text-base text-amber-300">No GSC data yet for this property.</p>
          <p className="mt-2 text-zinc-300">
            The API call succeeded and the OAuth identity has access to{' '}
            <code className="text-amber-400">{report.site}</code> — the property is just empty.
            Most likely causes:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-zinc-300">
            <li>
              <strong>Newly-verified property</strong> — GSC takes 24–72h to backfill data after
              verification.
            </li>
            <li>
              <strong>Site hasn&apos;t been indexed yet</strong> — submit the sitemap at{' '}
              <a href={`https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(report.site)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-amber-400 hover:underline">
                Search Console → Sitemaps
              </a>
              {' '}using <code className="text-amber-400">https://www.cinecanon.com/sitemap.xml</code>
            </li>
            <li>
              <strong>Site genuinely has 0 organic search visibility</strong> — this is fixable;
              ClaimReview emission, the AEO observatory, and llms.txt are all designed to climb
              this from zero.
            </li>
          </ul>
          <p className="mt-3 text-zinc-400 italic">
            Verify directly at{' '}
            <a href={`https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(report.site)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-amber-400 hover:underline">
              Search Console → Performance
            </a>
            . If that UI shows data but this page doesn&apos;t, the OAuth scope or API call is off
            and we need to re-investigate.
          </p>
        </section>
      )}

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

function ErrorState({
  mode, configuredSite, fetchError, sitesProbe,
}: {
  mode: string;
  configuredSite: string;
  fetchError: string | null;
  sitesProbe: { ok: true; sites: Array<{ siteUrl: string; permissionLevel: string }> }
            | { ok: false; error: string };
}) {
  const sites = sitesProbe.ok ? sitesProbe.sites : [];
  const hasSites = sites.length > 0;
  const matched = sites.find((s) => s.siteUrl === configuredSite);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl text-zinc-50">SEO — Google Search Console</h1>
        <span className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400">
          auth: {mode}
        </span>
      </header>

      <section className="rounded border border-red-900/40 bg-red-950/10 p-4 text-sm">
        <p className="font-serif text-base text-red-300">Google Search Console returned an error.</p>
        {fetchError && (
          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-red-200">
            {fetchError}
          </pre>
        )}
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 font-serif text-lg text-zinc-100">Diagnosis</h2>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-[10rem_1fr] gap-2">
            <span className="text-zinc-500">Configured site URL:</span>
            <code className="text-amber-400">{configuredSite}</code>
          </div>
          <div className="grid grid-cols-[10rem_1fr] gap-2">
            <span className="text-zinc-500">Auth mode:</span>
            <code className="text-amber-400">{mode}</code>
          </div>
          <div className="grid grid-cols-[10rem_1fr] gap-2">
            <span className="text-zinc-500">Matches a property:</span>
            <span className={matched ? 'text-emerald-400' : 'text-red-300'}>
              {matched ? `✓ yes (${matched.permissionLevel})` : '✗ no — fix below'}
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
          What this identity CAN see (via sites.list)
        </h2>
        {!sitesProbe.ok ? (
          <div className="rounded border border-red-900/40 bg-red-950/10 p-3 text-sm text-red-200">
            <p>sites.list also failed:</p>
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] text-red-100">
              {sitesProbe.error}
            </pre>
            <p className="mt-2 text-zinc-400 italic">
              Most likely the OAuth client is missing the Search Console API enablement,
              the refresh token was revoked, or the scope is wrong (must include{' '}
              <code className="text-amber-400">webmasters.readonly</code>).
            </p>
          </div>
        ) : !hasSites ? (
          <div className="rounded border border-amber-900/40 bg-amber-950/10 p-3 text-sm text-amber-200">
            <p>The identity authenticated successfully but does not have access to any GSC property.</p>
            <p className="mt-2 text-zinc-400 italic">
              The OAuth principal needs to be added as a user on the GSC property,
              OR a different identity that owns the property should be used.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/40">
            <table className="w-full text-xs">
              <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">Property (siteUrl)</th>
                  <th className="px-3 py-2 text-left font-normal w-32">Permission</th>
                  <th className="px-3 py-2 text-left font-normal w-32">Matches config?</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {sites.map((s) => (
                  <tr key={s.siteUrl} className="border-b border-zinc-900 last:border-0">
                    <td className="px-3 py-2 font-mono">{s.siteUrl}</td>
                    <td className="px-3 py-2 font-mono text-zinc-400">{s.permissionLevel}</td>
                    <td className="px-3 py-2">
                      {s.siteUrl === configuredSite ? (
                        <span className="text-emerald-400">✓ current</span>
                      ) : (
                        <span className="text-zinc-500">— set GSC_SITE_URL to this</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {hasSites && !matched && (
        <section className="rounded border border-amber-900/40 bg-amber-950/10 p-4 text-sm text-zinc-200">
          <p className="font-serif text-base text-amber-300">Fix</p>
          <p className="mt-2 text-zinc-300">
            Update <code className="text-amber-400">GSC_SITE_URL</code> in Vercel to one of the property
            identifiers in the table above. Most likely:
          </p>
          <pre className="mt-2 rounded bg-zinc-950 px-3 py-2 font-mono text-[11px] text-amber-300">GSC_SITE_URL={sites[0]!.siteUrl}</pre>
          <p className="mt-2 text-zinc-400 italic">Then redeploy (push any commit, or click Redeploy in Vercel).</p>
        </section>
      )}
    </div>
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
