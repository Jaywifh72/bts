import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  countVideoTimestampAnnotationsForReview,
  listProductionsWithVideos,
  listVideoTimestampAnnotationsForReview,
  type VideoAnnotationReviewStatus,
  type VideoAnnotationType,
} from '@bts/db';
import { VideoTimestampAnnotationRow } from '@/components/admin/VideoTimestampAnnotationRow';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = {
  title: 'Video Timestamps',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;
const STATUSES: (VideoAnnotationReviewStatus | 'all')[] = ['pending', 'reviewed', 'rejected', 'all'];
const ANNOTATION_TYPES: (VideoAnnotationType | 'all')[] = [
  'all',
  'visible_gear',
  'vfx_before_after',
  'lighting_setup_visible',
  'monitor_lut_visible',
  'rigging_stunt_visible',
  'virtual_production_visible',
  'interview_quote',
  'general_evidence',
];

type Props = {
  searchParams: Promise<{
    status?: string;
    annotationType?: string;
    productionSlug?: string;
    page?: string;
  }>;
};

function parseStatus(value: string | undefined): VideoAnnotationReviewStatus | 'all' {
  if (value && (STATUSES as string[]).includes(value)) return value as VideoAnnotationReviewStatus | 'all';
  return 'pending';
}

function parseAnnotationType(value: string | undefined): VideoAnnotationType | 'all' {
  if (value && (ANNOTATION_TYPES as string[]).includes(value)) return value as VideoAnnotationType | 'all';
  return 'all';
}

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

function buildHref(base: URLSearchParams, next: Record<string, string | number | null>): string {
  const merged = new URLSearchParams(base);
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === '' || value === 'all') merged.delete(key);
    else merged.set(key, String(value));
  }
  const qs = merged.toString();
  return qs ? `/admin/video-timestamps?${qs}` : '/admin/video-timestamps';
}

export default async function AdminVideoTimestampsPage(props: Props) {
  const searchParams = await props.searchParams;
  const status = parseStatus(searchParams.status);
  const annotationType = parseAnnotationType(searchParams.annotationType);
  const productionSlug = searchParams.productionSlug || null;
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const filters = {
    status,
    annotationType,
    productionSlug: productionSlug ?? undefined,
  };

  const [annotations, total, productions] = await Promise.all([
    listVideoTimestampAnnotationsForReview(db, {
      ...filters,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countVideoTimestampAnnotationsForReview(db, filters),
    listProductionsWithVideos(db),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseParams = new URLSearchParams();
  if (status !== 'pending') baseParams.set('status', status);
  if (annotationType !== 'all') baseParams.set('annotationType', annotationType);
  if (productionSlug) baseParams.set('productionSlug', productionSlug);

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Video Timestamps</h1>
        <div className="text-sm text-zinc-500">
          {total.toLocaleString()} {label(status)} annotation{total === 1 ? '' : 's'}
        </div>
      </header>

      <nav
        aria-label="Filter timestamp annotations by status"
        className="mb-3 flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref(baseParams, { status: s, page: null })}
            className={`rounded px-2 py-1 ${
              status === s ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {label(s)}
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Filter timestamp annotations by type"
        className="mb-3 flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {ANNOTATION_TYPES.map((type) => (
          <Link
            key={type}
            href={buildHref(baseParams, { annotationType: type, page: null })}
            className={`rounded px-2 py-1 ${
              annotationType === type ? 'bg-zinc-200 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {label(type)}
          </Link>
        ))}
      </nav>

      <form className="mb-6 flex max-w-xl gap-2 text-sm" action="/admin/video-timestamps">
        {status !== 'pending' && <input type="hidden" name="status" value={status} />}
        {annotationType !== 'all' && <input type="hidden" name="annotationType" value={annotationType} />}
        <select
          name="productionSlug"
          defaultValue={productionSlug ?? ''}
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200"
        >
          <option value="">All productions</option>
          {productions.map((production) => (
            <option key={production.slug} value={production.slug}>
              {production.title}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded border border-zinc-700 px-3 py-2 text-zinc-300 hover:bg-zinc-800">
          Filter
        </button>
      </form>

      {annotations.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No timestamp annotations match these filters.
        </div>
      ) : (
        <ul className="space-y-3">
          {annotations.map((annotation) => (
            <VideoTimestampAnnotationRow key={annotation.id} annotation={annotation} />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Video timestamps pagination"
        buildHref={(p) => buildHref(baseParams, { page: p })}
      />
    </div>
  );
}
