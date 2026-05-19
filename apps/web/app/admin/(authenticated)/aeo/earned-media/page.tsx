import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';

export const metadata: Metadata = {
  title: 'AEO — Earned media',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  source_url: string;
  source_domain: string;
  pool_name: string | null;
  pool_tier: number | null;
  discovery_method: string;
  topical_cluster: string | null;
  observed_competitor_mentions: number | null;
  observed_cinecanon_mentions: number | null;
  outreach_brief: string | null;
  status: string;
  placement_observed_in_ai: boolean;
  discovered_at: string;
  sent_at: string | null;
  placed_at: string | null;
};

export default async function AeoEarnedMediaPage() {
  const rows = await db.execute<Row>(sql`
    SELECT
      t.id::text, t.source_url, t.source_domain,
      p.name AS pool_name,
      p.tier AS pool_tier,
      t.discovery_method, t.topical_cluster,
      t.observed_competitor_mentions, t.observed_cinecanon_mentions,
      t.outreach_brief, t.status, t.placement_observed_in_ai,
      t.discovered_at::text, t.sent_at::text, t.placed_at::text
    FROM aeo_earned_media_targets t
    LEFT JOIN aeo_citation_pools p ON p.id = t.pool_id
    ORDER BY
      CASE t.status
        WHEN 'discovered' THEN 1
        WHEN 'brief_drafted' THEN 2
        WHEN 'sent' THEN 3
        WHEN 'placed' THEN 4
        WHEN 'declined' THEN 5
        WHEN 'expired' THEN 6
      END,
      t.discovered_at DESC
    LIMIT 200
  `);

  const grouped = groupBy(rows, (r) => r.status);

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">Earned-media targets</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Outreach pipeline discovered by citation-landscape-watcher and cluster-lift analysis.
          </p>
        </div>
        <Link href="/admin/aeo" className="text-sm text-zinc-400 hover:text-amber-400">← AEO home</Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded border border-amber-900/40 bg-amber-950/10 p-6 text-sm text-zinc-300">
          <p className="text-amber-400">No outreach targets yet.</p>
          <p className="mt-2 text-zinc-400">
            The citation-landscape-watcher agent populates these when competitor citation patterns indicate an
            earned-media opportunity (e.g. fxguide running a CineCanon-relevant article without citing us).
          </p>
        </div>
      ) : (
        STATUS_ORDER.map((status) => {
          const subset = grouped[status] ?? [];
          if (subset.length === 0) return null;
          return (
            <section key={status}>
              <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
                {label(status)} ({subset.length})
              </h2>
              <ul className="space-y-2">
                {subset.map((r) => (
                  <li key={r.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                        {r.source_domain}
                      </a>
                      {r.pool_name && (
                        <span className="text-xs text-zinc-500">{r.pool_name}{r.pool_tier ? ` · T${r.pool_tier}` : ''}</span>
                      )}
                      {r.topical_cluster && (
                        <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400">
                          {r.topical_cluster}
                        </span>
                      )}
                      {r.placement_observed_in_ai && (
                        <span className="rounded border border-emerald-900/40 bg-emerald-950/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-400">
                          AI-confirmed
                        </span>
                      )}
                    </div>
                    {r.outreach_brief && (
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-400">{r.outreach_brief}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                      <span>via {r.discovery_method}</span>
                      <span>competitor mentions: {r.observed_competitor_mentions ?? 0}</span>
                      <span>cinecanon mentions: {r.observed_cinecanon_mentions ?? 0}</span>
                      <span>discovered {short(r.discovered_at)}</span>
                      {r.sent_at && <span>sent {short(r.sent_at)}</span>}
                      {r.placed_at && <span>placed {short(r.placed_at)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

const STATUS_ORDER = ['discovered', 'brief_drafted', 'sent', 'placed', 'declined', 'expired'];

function label(s: string): string {
  return s.replace(/_/g, ' ');
}

function short(ts: string): string {
  return ts.replace('T', ' ').slice(0, 16);
}

function groupBy<T>(rows: T[], key: (r: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) {
    const k = key(r);
    (out[k] ??= []).push(r);
  }
  return out;
}
