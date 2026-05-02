import Link from 'next/link';
import type { VideoCategory, VideoStatus } from '@bts/db';

const STATUSES: (VideoStatus | 'all')[] = ['pending', 'published', 'rejected', 'all'];

const CATEGORIES: (VideoCategory | 'all')[] = [
  'all',
  'vfx_breakdown',
  'compositing',
  'making_of',
  'behind_the_scenes',
  'director_interview',
  'dp_interview',
  'production_design',
  'stunts',
  'sound',
  'music',
  'other',
];

type Props = {
  status: VideoStatus | 'all';
  productionSlug: string | null;
  category: VideoCategory | 'all';
  productions: { slug: string; title: string }[];
};

const SELECT_CLASS =
  'rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none';

export function VideoReviewFilters({ status, productionSlug, category, productions }: Props) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-wrap items-end gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Status
        <select name="status" defaultValue={status} className={SELECT_CLASS}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Production
        <select
          name="productionSlug"
          defaultValue={productionSlug ?? ''}
          className={SELECT_CLASS}
        >
          <option value="">all</option>
          {productions.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Category
        <select name="category" defaultValue={category} className={SELECT_CLASS}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-zinc-950 hover:bg-amber-500"
      >
        Apply
      </button>
      <Link
        href="/admin/videos"
        className="text-sm text-zinc-400 hover:text-zinc-200"
      >
        Reset
      </Link>
    </form>
  );
}
