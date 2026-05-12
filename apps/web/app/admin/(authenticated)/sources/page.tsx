import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  countSourcesForHealthReview,
  listSourcesForHealthReview,
  type SourceHealthFilter,
} from '@bts/db';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = {
  title: 'Source Health',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;
const FILTERS: SourceHealthFilter[] = [
  'stale',
  'rotted',
  'unchecked',
  'missing_archive',
  'paywalled',
  'all',
];

type Props = {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
};

function parseStatus(value: string | undefined): SourceHealthFilter {
  if (value && (FILTERS as string[]).includes(value)) return value as SourceHealthFilter;
  return 'stale';
}

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

function buildHref(status: SourceHealthFilter, page?: number): string {
  const params = new URLSearchParams();
  if (status !== 'stale') params.set('status', status);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/admin/sources?${qs}` : '/admin/sources';
}

function healthLabel(row: Awaited<ReturnType<typeof listSourcesForHealthReview>>[number]): {
  label: string;
  className: string;
} {
  if (row.last_status === 0 || (row.last_status !== null && row.last_status >= 400)) {
    return { label: 'rotted', className: 'border-red-800 bg-red-950/40 text-red-300' };
  }
  if (row.url && !row.last_checked_at) {
    return { label: 'unchecked', className: 'border-amber-800 bg-amber-950/40 text-amber-300' };
  }
  if (row.url && row.last_checked_at) {
    const checked = new Date(row.last_checked_at).getTime();
    if (Number.isNaN(checked) || Date.now() - checked > 30 * 86_400_000) {
      return { label: 'stale', className: 'border-amber-800 bg-amber-950/40 text-amber-300' };
    }
  }
  return { label: 'healthy', className: 'border-emerald-800 bg-emerald-950/30 text-emerald-300' };
}

export default async function AdminSourcesPage(props: Props) {
  const searchParams = await props.searchParams;
  const status = parseStatus(searchParams.status);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const [sources, total] = await Promise.all([
    listSourcesForHealthReview(db, {
      status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countSourcesForHealthReview(db, status),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Source Health</h1>
        <div className="text-sm text-zinc-500">
          {total.toLocaleString()} {label(status)} source{total === 1 ? '' : 's'}
        </div>
      </header>

      <nav
        aria-label="Filter source health"
        className="mb-6 flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={buildHref(filter)}
            className={`rounded px-2 py-1 ${
              status === filter ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {label(filter)}
          </Link>
        ))}
      </nav>

      {sources.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No sources match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {sources.map((source) => {
            const health = healthLabel(source);
            return (
              <li key={source.id} className="border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                        {label(source.kind)}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${health.className}`}>
                        {health.label}
                      </span>
                      {source.claim_count > 0 && (
                        <span className="text-xs text-zinc-600">
                          {source.claim_count} claim{source.claim_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">{source.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                      {source.publication && <span>{source.publication}</span>}
                      {source.last_checked_at && <span>checked {new Date(source.last_checked_at).toLocaleDateString('en-US')}</span>}
                      {source.last_status !== null && <span>HTTP {source.last_status}</span>}
                      {source.paywall_status !== 'unknown' && <span>{label(source.paywall_status)}</span>}
                      {source.archive_status !== 'unknown' && <span>{label(source.archive_status)}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {source.url && (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                          original
                        </a>
                      )}
                      {source.archive_url && (
                        <a href={source.archive_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                          archive
                        </a>
                      )}
                      {source.canonical_url && source.canonical_url !== source.url && (
                        <a href={source.canonical_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:underline">
                          canonical
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Sources pagination"
        buildHref={(p) => buildHref(status, p)}
      />
    </div>
  );
}
