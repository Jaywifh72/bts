import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  countEvidenceForReview,
  listEvidenceForReview,
  type EvidenceReviewStatus,
} from '@bts/db';
import { EvidenceReviewRow } from '@/components/admin/EvidenceReviewRow';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = {
  title: 'Evidence Review',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;
const STATUSES: (EvidenceReviewStatus | 'all')[] = ['pending', 'reviewed', 'rejected', 'all'];

type Props = {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
};

function parseStatus(value: string | undefined): EvidenceReviewStatus | 'all' {
  if (value && (STATUSES as string[]).includes(value)) return value as EvidenceReviewStatus | 'all';
  return 'pending';
}

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

function buildHref(status: EvidenceReviewStatus | 'all', page?: number): string {
  const params = new URLSearchParams();
  if (status !== 'pending') params.set('status', status);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/admin/evidence?${qs}` : '/admin/evidence';
}

export default async function AdminEvidencePage(props: Props) {
  const searchParams = await props.searchParams;
  const status = parseStatus(searchParams.status);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const [evidence, total] = await Promise.all([
    listEvidenceForReview(db, {
      status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countEvidenceForReview(db, status),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Evidence Review</h1>
        <div className="text-sm text-zinc-500">
          {total.toLocaleString()} {label(status)} item{total === 1 ? '' : 's'}
        </div>
      </header>

      <nav
        aria-label="Filter evidence"
        className="mb-6 flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref(s)}
            className={`rounded px-2 py-1 ${
              status === s ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {label(s)}
          </Link>
        ))}
      </nav>

      {evidence.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No evidence items match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {evidence.map((item) => (
            <EvidenceReviewRow key={item.id} evidence={item} />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Evidence review pagination"
        buildHref={(p) => buildHref(status, p)}
      />
    </div>
  );
}
