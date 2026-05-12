import type { Metadata } from 'next';
import Link from 'next/link';
import {
  listCoverageGaps,
  getCoverageSummary,
  type CoverageGap,
} from '@/lib/admin/health-queries';

export const metadata: Metadata = {
  title: 'Coverage gaps',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { table?: string };
}

const TABLE_BLURB: Record<string, string> = {
  vfx_houses: 'VFX houses without an editorial summary. The summary is the load-bearing prose on every detail page.',
  stunt_companies: 'Stunt companies without an editorial summary.',
  equipment_series: 'Equipment series rows without an editorial summary.',
  productions: 'Productions without a synopsis. Sorted by popularity, so the most-visited gaps surface first.',
  people: 'Crew members with credits but no bio. Sorted by credit count.',
};

const TABLE_FIELD: Record<string, string> = {
  vfx_houses: 'summary',
  stunt_companies: 'summary',
  equipment_series: 'summary',
  productions: 'synopsis',
  people: 'bio',
};

// Entity-type slug for the /admin/curate/edit/[type]/[slug] route.
// Tables not in this map don't yet have an edit form (productions,
// people, equipment_series — bigger surface, deferred).
const TABLE_EDIT_TYPE: Record<string, string> = {
  vfx_houses: 'vfx-house',
  stunt_companies: 'stunt-company',
  stunt_rigging_techniques: 'stunt-rigging',
  safety_bulletins: 'safety-bulletin',
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default async function AdminCoverageGapsPage({ searchParams }: Props) {
  const filter = searchParams.table ?? 'all';
  const [allGaps, summary] = await Promise.all([
    listCoverageGaps(50),
    getCoverageSummary(),
  ]);

  const filteredGaps = filter === 'all'
    ? allGaps
    : allGaps.filter((g) => g.table_name === filter);

  // Bucket by table for the page render.
  const byTable = new Map<string, CoverageGap[]>();
  for (const g of filteredGaps) {
    const list = byTable.get(g.table_name) ?? [];
    list.push(g);
    byTable.set(g.table_name, list);
  }

  return (
    <div>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/admin/health" className="hover:text-amber-400">Health</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">Coverage gaps</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-serif text-2xl text-zinc-50">Coverage gaps</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Specific rows missing the editorial field that drives their
          public detail page. Capped at 50 per table so a long backlog
          doesn’t dominate. Click through to the public page to see
          what content the row would carry once curated.
        </p>
      </header>

      {/* Filter pills */}
      <nav
        aria-label="Filter coverage gaps by table"
        className="mb-6 flex flex-wrap gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        <Link
          href="/admin/health/coverage"
          className={`rounded px-2 py-1 ${
            filter === 'all'
              ? 'bg-amber-600 text-zinc-950'
              : 'text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          all
        </Link>
        {summary.map((s) => {
          const active = filter === s.table_name;
          const muted = s.missing === 0;
          return (
            <Link
              key={s.table_name}
              href={`/admin/health/coverage?table=${s.table_name}`}
              className={`rounded px-2 py-1 ${
                active
                  ? 'bg-amber-600 text-zinc-950'
                  : muted
                    ? 'text-zinc-600 hover:bg-zinc-800'
                    : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {s.table_label.toLowerCase()}
              <span className="ml-1 text-[10px] opacity-70">
                {s.missing}
              </span>
            </Link>
          );
        })}
      </nav>

      {filteredGaps.length === 0 ? (
        <div className="rounded border border-emerald-900/40 bg-emerald-950/10 p-8 text-center">
          <p className="font-serif text-lg text-emerald-300">
            No gaps for this filter.
          </p>
          <p className="mt-1 text-sm text-emerald-400/70">
            {filter === 'all'
              ? 'Every editorial row across the curated tables has its load-bearing field populated.'
              : `Every ${filter} row has its load-bearing field populated.`}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...byTable.entries()].map(([tableName, items]) => {
            const summaryRow = summary.find((s) => s.table_name === tableName);
            return (
              <section key={tableName}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    {items[0]?.table_label}
                  </h2>
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {summaryRow ? `${items.length} of ${summaryRow.missing}` : items.length}
                    {' '}missing <code className="font-mono text-zinc-400">{TABLE_FIELD[tableName] ?? '?'}</code>
                  </span>
                </div>
                <p className="-mt-1 mb-3 max-w-2xl text-xs text-zinc-500">
                  {TABLE_BLURB[tableName]}
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((g) => {
                    const editType = TABLE_EDIT_TYPE[g.table_name];
                    return (
                      <li
                        key={`${g.table_name}-${g.slug}`}
                        className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/50 hover:bg-amber-950/10"
                      >
                        <Link href={g.href} className="block min-w-0 flex-1">
                          <div className="truncate text-sm text-zinc-100">{g.display_name}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wide text-zinc-500">
                            <span className="font-mono text-zinc-400">{g.slug}</span>
                            <span>{formatRelative(g.updated_at)}</span>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          {editType && (
                            <Link
                              href={`/admin/curate/edit/${editType}/${g.slug}`}
                              className="rounded border border-amber-900/40 bg-amber-950/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300 hover:border-amber-700 hover:bg-amber-950/40"
                            >
                              Edit
                            </Link>
                          )}
                          <Link
                            href={g.href}
                            className="text-[10px] uppercase tracking-wide text-amber-400"
                          >
                            Open →
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
