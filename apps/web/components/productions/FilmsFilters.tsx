import Link from 'next/link';

const SELECT_CLASS =
  'rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none';

type Props = {
  decades: { decade: number; count: number }[];
  genres: { genre: string; count: number }[];
  current: {
    decade?: number;
    genre?: string;
    tier?: 'curated' | 'imported' | 'all';
    sort?: 'recent' | 'oldest' | 'title' | 'popularity' | 'rating';
  };
};

export function FilmsFilters({ decades, genres, current }: Props) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-wrap items-end gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Decade
        <select name="decade" defaultValue={current.decade ?? ''} className={SELECT_CLASS}>
          <option value="">all</option>
          {decades.map((d) => (
            <option key={d.decade} value={d.decade}>
              {d.decade}s ({d.count})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
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

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Data
        <select name="tier" defaultValue={current.tier ?? 'all'} className={SELECT_CLASS}>
          <option value="all">all</option>
          <option value="curated">curated only</option>
          <option value="imported">metadata only</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
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
        className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-zinc-950 hover:bg-amber-500"
      >
        Apply
      </button>
      <Link href="/films" className="text-sm text-zinc-400 hover:text-zinc-200">
        Reset
      </Link>
    </form>
  );
}
