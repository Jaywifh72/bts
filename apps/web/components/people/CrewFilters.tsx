import Link from 'next/link';

const SELECT_CLASS =
  'rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none';

const CATEGORY_LABELS: Record<string, string> = {
  camera: 'Camera',
  grip: 'Grip',
  electric: 'Electric',
  sound: 'Sound',
  art: 'Art',
  wardrobe: 'Wardrobe',
  makeup_hair: 'Makeup & Hair',
  production: 'Production',
  post: 'Post',
  vfx: 'VFX',
  direction: 'Direction',
  writing: 'Writing',
  music: 'Music',
};

type Props = {
  categories: { category: string; count: number }[];
  current: {
    category?: string;
    sort?: 'name' | 'credits';
  };
};

export function CrewFilters({ categories, current }: Props) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-wrap items-end gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-3"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Department
        <select name="category" defaultValue={current.category ?? ''} className={SELECT_CLASS}>
          <option value="">all</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {CATEGORY_LABELS[c.category] ?? c.category} ({c.count})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        Sort
        <select name="sort" defaultValue={current.sort ?? 'credits'} className={SELECT_CLASS}>
          <option value="credits">most credits</option>
          <option value="name">name A–Z</option>
        </select>
      </label>

      <button
        type="submit"
        className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-zinc-950 hover:bg-amber-500"
      >
        Apply
      </button>
      <Link href="/crew" className="text-sm text-zinc-400 hover:text-zinc-200">
        Reset
      </Link>
    </form>
  );
}
