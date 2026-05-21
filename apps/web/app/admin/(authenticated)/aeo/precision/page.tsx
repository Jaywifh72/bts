import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';

export const metadata: Metadata = {
  title: 'AEO — Precision history',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Row = {
  metric_date: string;
  engine_code: string | null;
  scope: string;
  topical_cluster: string | null;
  page_url: string | null;
  precision_mean: string | null;
  precision_ci_lo: string | null;
  precision_ci_hi: string | null;
  share_of_answer: string | null;
  n_observations: number;
};

type LeaderRow = {
  cited_url: string;
  cited_domain: string;
  is_cinecanon: boolean;
  hits: number;
  engines: number;
};

async function fetchLeaderboard(): Promise<{ ours: LeaderRow[]; competitors: LeaderRow[] }> {
  const ours = await db.execute<LeaderRow>(sql`
    SELECT
      s.cited_url,
      s.cited_domain,
      s.is_cinecanon,
      COUNT(*)::int AS hits,
      COUNT(DISTINCT o.engine_id)::int AS engines
    FROM aeo_citation_scores s
    JOIN aeo_response_observations o ON o.id = s.observation_id
    WHERE s.is_cinecanon = true
      AND o.observed_at > NOW() - INTERVAL '30 days'
    GROUP BY 1,2,3
    ORDER BY hits DESC
    LIMIT 25
  `);
  const competitors = await db.execute<LeaderRow>(sql`
    SELECT
      s.cited_url,
      s.cited_domain,
      s.is_cinecanon,
      COUNT(*)::int AS hits,
      COUNT(DISTINCT o.engine_id)::int AS engines
    FROM aeo_citation_scores s
    JOIN aeo_response_observations o ON o.id = s.observation_id
    WHERE s.is_cinecanon = false
      AND o.observed_at > NOW() - INTERVAL '30 days'
    GROUP BY 1,2,3
    ORDER BY hits DESC
    LIMIT 25
  `);
  return { ours, competitors };
}

export default async function AeoPrecisionPage() {
  const leaders = await fetchLeaderboard();
  const rows = await db.execute<Row>(sql`
    SELECT
      m.metric_date::text AS metric_date,
      e.code              AS engine_code,
      m.scope,
      m.topical_cluster,
      m.page_url,
      m.precision_mean::text,
      m.precision_ci_lo::text,
      m.precision_ci_hi::text,
      m.share_of_answer::text,
      m.n_observations
    FROM aeo_daily_metrics m
    LEFT JOIN aeo_engines e ON e.id = m.engine_id
    WHERE m.scope = 'cinecanon'
      AND m.metric_date >= (CURRENT_DATE - INTERVAL '30 days')
    ORDER BY m.metric_date DESC, m.page_url NULLS LAST
    LIMIT 500
  `);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">Citation Precision history</h1>
          <p className="mt-1 text-sm text-zinc-400">
            CineCanon-scoped daily precision over the last 30 days. Public feed:{' '}
            <Link href="/api/v1/aeo/precision" className="text-amber-400 hover:underline">/api/v1/aeo/precision</Link>
          </p>
        </div>
        <Link href="/admin/aeo" className="text-sm text-zinc-400 hover:text-amber-400">← AEO home</Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded border border-amber-900/40 bg-amber-950/10 p-6 text-sm text-zinc-300">
          <p className="text-amber-400">No metrics yet.</p>
          <p className="mt-2 text-zinc-400">
            Hermes populates <code>aeo_daily_metrics</code> after its daily cycle. Run the dry-run command from
            <code className="mx-1">.claude/skills/cinecanon-sentinel/README.md</code> to start.
          </p>
        </div>
      ) : null}

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
          CineCanon citation leaderboard · 30d
        </h2>
        {leaders.ours.length === 0 ? (
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            Zero CineCanon citations in the last 30 days. The leaderboard fills as engines start citing
            <code className="mx-1 text-amber-400">cinecanon.com</code> URLs in their answers.
          </div>
        ) : (
          <LeaderTable rows={leaders.ours} />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
          Competitive landscape · 30d (who's being cited instead of us)
        </h2>
        {leaders.competitors.length === 0 ? (
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            No citations recorded yet.
          </div>
        ) : (
          <LeaderTable rows={leaders.competitors} />
        )}
      </section>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-xs">
            <thead className="text-left text-[10px] uppercase tracking-widest text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Engine</th>
                <th className="px-3 py-2">Page</th>
                <th className="px-3 py-2 text-right">Precision</th>
                <th className="px-3 py-2 text-right">CI</th>
                <th className="px-3 py-2 text-right">SoA</th>
                <th className="px-3 py-2 text-right">n</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-zinc-900 last:border-0">
                  <td className="px-3 py-2 font-mono">{r.metric_date}</td>
                  <td className="px-3 py-2">{r.engine_code ?? '—'}</td>
                  <td className="px-3 py-2">
                    {r.page_url ? (
                      <Link href={r.page_url} className="text-amber-400 hover:underline">{r.page_url}</Link>
                    ) : (
                      <span className="text-zinc-500">aggregate</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(r.precision_mean)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-500">{fmt(r.precision_ci_lo)}–{fmt(r.precision_ci_hi)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(r.share_of_answer)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.n_observations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function LeaderTable({ rows }: { rows: LeaderRow[] }) {
  const max = Math.max(...rows.map((r) => r.hits), 1);
  return (
    <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/40">
      <table className="w-full text-xs">
        <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-normal">URL</th>
            <th scope="col" className="px-3 py-2 text-left font-normal w-24">Domain</th>
            <th scope="col" className="px-3 py-2 text-right font-normal w-16">Engines</th>
            <th scope="col" className="px-3 py-2 text-right font-normal w-20">Hits</th>
            <th scope="col" className="px-3 py-2 w-1/3">Share</th>
          </tr>
        </thead>
        <tbody className="text-zinc-300">
          {rows.map((r) => {
            const pct = (r.hits / max) * 100;
            return (
              <tr key={r.cited_url} className="border-b border-zinc-900 last:border-0">
                <td className="px-3 py-2">
                  {r.is_cinecanon ? (
                    <Link href={r.cited_url} className="text-amber-400 hover:underline">{r.cited_url}</Link>
                  ) : (
                    <a href={r.cited_url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-amber-400">{r.cited_url}</a>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{r.cited_domain}</td>
                <td className="px-3 py-2 text-right font-mono">{r.engines}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-zinc-100">{r.hits}</td>
                <td className="px-3 py-2">
                  <div className="h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${r.is_cinecanon ? 'bg-emerald-500' : 'bg-amber-600'}`}
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={r.hits}
                      aria-valuemax={max}
                      aria-label={`${r.hits} hits, ${pct.toFixed(0)}% of leader`}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function fmt(s: string | null): string {
  if (s == null) return '—';
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n.toFixed(3) : '—';
}
