import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';

export const metadata: Metadata = {
  title: 'AEO — Interventions',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  page_url: string;
  intervention_type: string;
  github_pr_number: number | null;
  github_pr_url: string | null;
  rationale: string | null;
  predicted_lift: string | null;
  pre_precision_mean: string | null;
  pre_n: number | null;
  decision: string | null;
  drafted_at: string;
  decided_at: string | null;
  post_precision_mean: string | null;
};

export default async function AeoInterventionsPage() {
  const pending = await db.execute<Row>(sql`
    SELECT
      id::text, page_url, intervention_type,
      github_pr_number, github_pr_url, rationale,
      predicted_lift::text, pre_precision_mean::text, pre_n,
      decision, drafted_at::text, decided_at::text, post_precision_mean::text
    FROM aeo_interventions
    WHERE decision IS NULL OR decision = 'pending'
    ORDER BY drafted_at DESC
    LIMIT 100
  `);

  const recent = await db.execute<Row>(sql`
    SELECT
      id::text, page_url, intervention_type,
      github_pr_number, github_pr_url, rationale,
      predicted_lift::text, pre_precision_mean::text, pre_n,
      decision, drafted_at::text, decided_at::text, post_precision_mean::text
    FROM aeo_interventions
    WHERE decision IN ('booked','reverted','inconclusive')
    ORDER BY decided_at DESC NULLS LAST
    LIMIT 50
  `);

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">Interventions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Content-optimizer drafts and their day-14/day-28 decisions. Pending items need editorial review.
          </p>
        </div>
        <Link href="/admin/aeo" className="text-sm text-zinc-400 hover:text-amber-400">← AEO home</Link>
      </header>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
          Pending review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState>No pending interventions. The content-optimizer agent drafts these after observed precision dips.</EmptyState>
        ) : (
          <InterventionList rows={pending} />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
          Recent decisions ({recent.length})
        </h2>
        {recent.length === 0 ? (
          <EmptyState>No decided interventions yet.</EmptyState>
        ) : (
          <InterventionList rows={recent} />
        )}
      </section>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
      {children}
    </div>
  );
}

function InterventionList({ rows }: { rows: Row[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex flex-wrap items-baseline gap-3 text-sm">
            <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400">
              {r.intervention_type}
            </span>
            <Link href={r.page_url} className="text-amber-400 hover:underline">{r.page_url}</Link>
            {r.github_pr_url && (
              <a href={r.github_pr_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-amber-400">
                PR #{r.github_pr_number} ↗
              </a>
            )}
            {r.decision && (
              <span className={`ml-auto rounded px-2 py-0.5 text-[10px] uppercase tracking-widest ${decisionStyle(r.decision)}`}>
                {r.decision}
              </span>
            )}
          </div>
          {r.rationale && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{r.rationale}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            <span>drafted {short(r.drafted_at)}</span>
            {r.decided_at && <span>decided {short(r.decided_at)}</span>}
            {r.predicted_lift && <span>predicted lift {fmt(r.predicted_lift)}</span>}
            {r.pre_precision_mean && <span>pre {fmt(r.pre_precision_mean)} (n={r.pre_n ?? 0})</span>}
            {r.post_precision_mean && <span>post {fmt(r.post_precision_mean)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function fmt(s: string | null): string {
  if (s == null) return '—';
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n.toFixed(3) : '—';
}

function short(ts: string): string {
  return ts.replace('T', ' ').slice(0, 16);
}

function decisionStyle(d: string): string {
  switch (d) {
    case 'booked':       return 'border border-emerald-900/40 bg-emerald-950/20 text-emerald-400';
    case 'reverted':     return 'border border-red-900/40 bg-red-950/20 text-red-400';
    case 'inconclusive': return 'border border-zinc-700 bg-zinc-900/40 text-zinc-400';
    default:             return 'border border-amber-900/40 bg-amber-950/20 text-amber-400';
  }
}
