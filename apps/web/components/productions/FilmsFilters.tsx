'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, type FormEvent } from 'react';

const SELECT_CLASS =
  'rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none';

type Props = {
  decades: { decade: number; count: number }[];
  genres: { genre: string; count: number }[];
  current: {
    decades?: number[];
    genre?: string;
    tier?: 'curated' | 'imported' | 'all';
    sort?: 'recent' | 'oldest' | 'title' | 'popularity' | 'rating';
  };
};

export function FilmsFilters({ decades, genres, current }: Props) {
  // UX-audit PO-5: the form was a Server Component with a native GET
  // submit. Next.js 15+ does treat that as a client navigation, but
  // the brief Suspense flicker on a fast DB isn't long enough for a
  // user to register that something happened. Hijacking submit here
  // gives us an explicit isPending we can surface on the button so
  // the user sees their action was received.
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams();
    // Multi-decade — collect all checked boxes into a single comma-joined param.
    const checkedDecades = data.getAll('decade').map((v) => String(v)).filter(Boolean);
    if (checkedDecades.length > 0) {
      params.set('decade', checkedDecades.join(','));
    }
    // Single-valued fields. Strip empty / default values so the URL stays clean.
    for (const key of ['genre', 'tier', 'sort'] as const) {
      const v = String(data.get(key) ?? '');
      if (!v) continue;
      if (key === 'tier' && v === 'all') continue;
      if (key === 'sort' && v === 'recent') continue;
      params.set(key, v);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/films?${qs}` : '/films');
    });
  }

  const checkedSet = new Set(current.decades ?? []);

  return (
    <form
      method="get"
      role="search"
      aria-label="Filter films"
      onSubmit={onSubmit}
      className="mb-6 flex flex-wrap items-end gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-3"
      aria-busy={isPending || undefined}
    >
      <fieldset className="flex flex-wrap gap-x-3 gap-y-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5">
        <legend className="px-1 text-xs text-zinc-300">Decade</legend>
        {decades.map((d) => (
          <label key={d.decade} className="flex items-center gap-1 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="decade"
              value={d.decade}
              defaultChecked={checkedSet.has(d.decade)}
              className="accent-amber-600"
            />
            {d.decade}s
            <span className="text-[10px] text-zinc-400">({d.count})</span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1 text-xs text-zinc-300">
        Genre
        <select name="genre" defaultValue={current.genre ?? ''} className={SELECT_CLASS}>
          <option value="">all</option>
          {genres.map((g) => (
            <option key={g.genre} value={g.genre}>
              {g.genre} ({g.count})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-300">
        Data
        <select name="tier" defaultValue={current.tier ?? 'all'} className={SELECT_CLASS}>
          <option value="all">all</option>
          <option value="curated">curated only</option>
          <option value="imported">metadata only</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-300">
        Sort
        <select name="sort" defaultValue={current.sort ?? 'recent'} className={SELECT_CLASS}>
          <option value="recent">most recent</option>
          <option value="oldest">oldest first</option>
          <option value="title">title A–Z</option>
          <option value="popularity">most popular</option>
          <option value="rating">highest rated</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={isPending}
        aria-disabled={isPending || undefined}
        className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:cursor-wait disabled:bg-amber-700/60"
      >
        {isPending ? 'Loading…' : 'Apply'}
      </button>
      <Link href="/films" className="text-sm text-zinc-400 hover:text-zinc-200">
        Reset
      </Link>
      {/* Polite SR announcement when a filter change is in flight. */}
      <span className="sr-only" role="status" aria-live="polite">
        {isPending ? 'Loading filtered films' : ''}
      </span>
    </form>
  );
}
