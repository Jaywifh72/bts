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

export default async function AeoPrecisionPage() {
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
      ) : (
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
      )}
    </div>
  );
}

function fmt(s: string | null): string {
  if (s == null) return '—';
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n.toFixed(3) : '—';
}
