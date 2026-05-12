import type { Metadata } from 'next';
import Link from 'next/link';
import {
  listAuditEvents,
  getAuditTableCounts,
  listAuditTables,
} from '@/lib/admin/audit-queries';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = {
  title: 'Audit',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ table?: string; since?: string; page?: string }>;
}

const PAGE_SIZE = 60;

const SINCE_PRESETS: Array<{ key: string; label: string; days?: number }> = [
  { key: '24h', label: 'last 24h', days: 1 },
  { key: '7d', label: 'last 7 days', days: 7 },
  { key: '30d', label: 'last 30 days', days: 30 },
  { key: 'all', label: 'all time' },
];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function buildHref(args: { table?: string; since?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (args.table && args.table !== 'all') params.set('table', args.table);
  if (args.since && args.since !== '7d') params.set('since', args.since);
  if (args.page && args.page > 1) params.set('page', String(args.page));
  const qs = params.toString();
  return qs ? `/admin/audit?${qs}` : '/admin/audit';
}

export default async function AdminAuditPage(props: Props) {
  const searchParams = await props.searchParams;
  const tableFilter = searchParams.table && searchParams.table !== 'all' ? searchParams.table : undefined;
  const sinceKey = searchParams.since ?? '7d';
  const sincePreset = SINCE_PRESETS.find((p) => p.key === sinceKey) ?? SINCE_PRESETS[1]!;
  const sinceDays = sincePreset.days;
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const [events, tableCounts, tableMeta] = await Promise.all([
    listAuditEvents({
      table: tableFilter,
      sinceDays,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getAuditTableCounts(sinceDays),
    Promise.resolve(listAuditTables()),
  ]);

  const totalForFilter = tableFilter
    ? tableCounts.find((c) => c.table_name === tableFilter)?.n ?? 0
    : tableCounts.reduce((acc, c) => acc + c.n, 0);
  const totalPages = Math.max(1, Math.ceil(totalForFilter / PAGE_SIZE));

  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">Audit</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Every editorial table&apos;s recent <code className="font-mono text-amber-400">updated_at</code>,
            unified into a single feed. Filter by table or date range
            when you&apos;re trying to answer &quot;what changed on this entity
            yesterday?&quot;
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div className="font-mono text-zinc-300">{totalForFilter.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-wide">Events ({sincePreset.label})</div>
        </div>
      </header>

      {/* Filter row: since + table */}
      <div className="mb-6 space-y-3">
        <nav
          aria-label="Date range"
          className="flex flex-wrap gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
        >
          <span className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600">
            Since
          </span>
          {SINCE_PRESETS.map((p) => (
            <Link
              key={p.key}
              href={buildHref({ table: tableFilter, since: p.key })}
              className={`rounded px-2 py-1 ${
                sinceKey === p.key
                  ? 'bg-amber-600 text-zinc-950'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>

        <nav
          aria-label="Table filter"
          className="flex flex-wrap gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
        >
          <span className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600">
            Table
          </span>
          <Link
            href={buildHref({ since: sinceKey })}
            className={`rounded px-2 py-1 ${
              !tableFilter
                ? 'bg-amber-600 text-zinc-950'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            all
            <span className="ml-1 text-[10px] opacity-70">
              {tableCounts.reduce((acc, c) => acc + c.n, 0)}
            </span>
          </Link>
          {tableMeta.map((t) => {
            const count = tableCounts.find((c) => c.table_name === t.key)?.n ?? 0;
            const muted = count === 0;
            return (
              <Link
                key={t.key}
                href={buildHref({ table: t.key, since: sinceKey })}
                className={`rounded px-2 py-1 ${
                  tableFilter === t.key
                    ? 'bg-amber-600 text-zinc-950'
                    : muted
                      ? 'text-zinc-600 hover:bg-zinc-800'
                      : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {t.label.toLowerCase()}
                <span className="ml-1 text-[10px] opacity-70">{count}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Feed */}
      {events.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No events match this filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-zinc-800">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Kind</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Entity</th>
                <th className="px-3 py-2 text-left">Slug</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {events.map((e, i) => (
                <tr key={`${e.table_name}-${e.slug}-${i}`} className="hover:bg-zinc-900/40">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-zinc-400" title={formatTimestamp(e.updated_at)}>
                    {formatRelative(e.updated_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        e.kind === 'created'
                          ? 'bg-emerald-700 text-emerald-50'
                          : 'bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {e.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{e.table_label}</td>
                  <td className="px-3 py-2 text-zinc-200">{e.display_name}</td>
                  <td className="px-3 py-2 font-mono text-zinc-500">{e.slug}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={e.href} className="text-amber-400 hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Audit log pagination"
        buildHref={(p) => buildHref({ table: tableFilter, since: sinceKey, page: p })}
      />
    </div>
  );
}
