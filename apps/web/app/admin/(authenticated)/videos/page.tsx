import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  listVideosForReview,
  countVideosForReview,
  listProductionsWithVideos,
  type VideoStatus,
  type VideoCategory,
} from '@bts/db';
import { VideoReviewFilters } from '@/components/admin/VideoReviewFilters';
import { VideoReviewRow } from '@/components/admin/VideoReviewRow';

export const metadata: Metadata = {
  title: 'Video Review',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

type Props = {
  searchParams: {
    status?: string;
    productionSlug?: string;
    category?: string;
    page?: string;
  };
};

function parseStatus(v: string | undefined): VideoStatus | 'all' {
  if (v === 'published' || v === 'rejected' || v === 'all' || v === 'pending') return v;
  return 'pending';
}

function parseCategory(v: string | undefined): VideoCategory | 'all' {
  const valid: (VideoCategory | 'all')[] = [
    'all', 'vfx_breakdown', 'compositing', 'making_of', 'behind_the_scenes',
    'director_interview', 'dp_interview', 'production_design',
    'stunts', 'sound', 'music', 'other',
  ];
  return valid.includes(v as VideoCategory | 'all') ? (v as VideoCategory | 'all') : 'all';
}

function buildPageHref(base: URLSearchParams, page: number): string {
  const next = new URLSearchParams(base);
  next.set('page', String(page));
  return `/admin/videos?${next.toString()}`;
}

export default async function AdminVideosPage({ searchParams }: Props) {
  const status = parseStatus(searchParams.status);
  const productionSlug = searchParams.productionSlug || null;
  const category = parseCategory(searchParams.category);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const filters = {
    status,
    productionSlug: productionSlug ?? undefined,
    category,
  };

  const [videos, total, productions] = await Promise.all([
    listVideosForReview(db, { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countVideosForReview(db, filters),
    listProductionsWithVideos(db),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Pre-build search params for pagination links (everything except page).
  const baseParams = new URLSearchParams();
  if (status !== 'pending') baseParams.set('status', status);
  if (productionSlug) baseParams.set('productionSlug', productionSlug);
  if (category !== 'all') baseParams.set('category', category);

  return (
    <div>
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="font-serif text-2xl">Video Review</h1>
        <div className="text-sm text-zinc-500">
          {total.toLocaleString()} {status} {total === 1 ? 'video' : 'videos'}
        </div>
      </header>

      <VideoReviewFilters
        status={status}
        productionSlug={productionSlug}
        category={category}
        productions={productions}
      />

      {videos.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No videos match these filters.
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <VideoReviewRow key={v.id} video={v} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm text-zinc-400">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildPageHref(baseParams, page - 1)}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildPageHref(baseParams, page + 1)}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
