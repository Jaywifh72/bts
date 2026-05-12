import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  countSourcesForHealthReview,
} from '@bts/db';
import {
  findDuplicateCandidates,
  getCoverageSummary,
  getSourceHealthBuckets,
} from '@/lib/admin/health-queries';

export const metadata: Metadata = {
  title: 'Health',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function Tile({
  label,
  value,
  hint,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href: string;
  accent: 'red' | 'amber' | 'emerald' | 'sky' | 'zinc';
}) {
  const accents: Record<string, string> = {
    red: 'border-red-900/40 bg-red-950/10 hover:border-red-700/60',
    amber: 'border-amber-900/40 bg-amber-950/10 hover:border-amber-700/60',
    emerald: 'border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-700/60',
    sky: 'border-sky-900/40 bg-sky-950/10 hover:border-sky-700/60',
    zinc: 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
  };
  return (
    <Link
      href={href}
      className={`flex h-full flex-col justify-between rounded border p-4 transition-colors ${accents[accent]}`}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <div>
        <div className="font-serif text-3xl text-zinc-50">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </div>
    </Link>
  );
}

export default async function AdminHealthPage() {
  const [
    duplicates,
    coverage,
    healthBuckets,
    rottedCount,
    staleCount,
  ] = await Promise.all([
    findDuplicateCandidates(),
    getCoverageSummary(),
    getSourceHealthBuckets(),
    countSourcesForHealthReview(db, 'rotted'),
    countSourcesForHealthReview(db, 'stale'),
  ]);

  const totalMissing = coverage.reduce((acc, c) => acc + c.missing, 0);
  const buckets = Object.fromEntries(healthBuckets.map((b) => [b.bucket, b.n] as const));
  const totalSources = healthBuckets.reduce((acc, b) => acc + b.n, 0);
  const healthy = buckets.healthy ?? 0;
  const pctHealthy = totalSources === 0 ? 0 : Math.round((healthy / totalSources) * 100);

  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">Health</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Where the data is decaying. Three lenses: external
            references that have rotted, near-duplicate rows that
            should probably merge, and rows missing the editorial
            field that drives their public detail page.
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div className="font-mono text-zinc-300">
            {(rottedCount + duplicates.length + totalMissing).toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wide">Issues surfaced</div>
        </div>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          label="Source health"
          value={rottedCount}
          hint={
            rottedCount > 0
              ? `${rottedCount} rotted · ${staleCount} stale · ${pctHealthy}% healthy overall`
              : `All ${totalSources.toLocaleString()} sources reachable. ${staleCount} due for re-check.`
          }
          href="/admin/sources"
          accent={rottedCount > 10 ? 'red' : rottedCount > 0 ? 'amber' : 'emerald'}
        />
        <Tile
          label="Duplicate candidates"
          value={duplicates.length}
          hint={
            duplicates.length === 0
              ? 'No high-similarity name pairs detected.'
              : `Across ${new Set(duplicates.map((d) => d.table_name)).size} editorial tables.`
          }
          href="/admin/health/duplicates"
          accent={duplicates.length > 5 ? 'red' : duplicates.length > 0 ? 'amber' : 'emerald'}
        />
        <Tile
          label="Coverage gaps"
          value={totalMissing}
          hint={
            totalMissing === 0
              ? 'Every editorial row is populated.'
              : `Across ${coverage.filter((c) => c.missing > 0).length} entity types.`
          }
          href="/admin/health/coverage"
          accent={totalMissing > 1000 ? 'red' : totalMissing > 0 ? 'amber' : 'emerald'}
        />
      </section>

      {/* Source-health bucket breakdown */}
      <section className="mb-8 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Source-health buckets
          </h2>
          <Link href="/admin/sources" className="text-[10px] uppercase tracking-wide text-amber-400 hover:underline">
            All sources →
          </Link>
        </div>
        {totalSources === 0 ? (
          <p className="text-sm text-zinc-500">No sources tracked yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {healthBuckets.map((b) => {
              const pct = Math.round((b.n / totalSources) * 100);
              const tone =
                b.bucket === 'healthy' ? 'text-emerald-400' :
                b.bucket === 'rotted' ? 'text-red-400' :
                b.bucket === 'unchecked' ? 'text-amber-400' :
                'text-zinc-300';
              return (
                <li key={b.bucket} className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className={`font-serif text-2xl ${tone}`}>{b.n.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {b.bucket.replace(/_/g, ' ')}
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-600">{pct}% of total</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Coverage breakdown */}
      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Coverage by entity type
          </h2>
          <Link href="/admin/health/coverage" className="text-[10px] uppercase tracking-wide text-amber-400 hover:underline">
            Drill-down →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wide text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="py-2 text-left">Entity</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2 text-right">Missing field</th>
              <th className="py-2 text-right">Complete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {coverage.map((c) => (
              <tr key={c.table_name} className="hover:bg-zinc-900/40">
                <td className="py-2 text-zinc-200">{c.table_label}</td>
                <td className="py-2 text-right font-mono text-zinc-400">{c.total.toLocaleString()}</td>
                <td className={`py-2 text-right font-mono ${c.missing > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {c.missing.toLocaleString()}
                </td>
                <td className="py-2 text-right font-mono text-zinc-300">{c.percent_complete}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
