import Link from 'next/link';

export type FacilityListRow = {
  slug: string;
  name: string;
  country: string | null;
  city: string | null;
  summary: string | null;
  tagline: string | null;
  data_tier: string;
};

export function FacilityList({ basePath, rows }: { basePath: string; rows: FacilityListRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No entries yet — table not migrated on this environment.</p>;
  }
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <li key={r.slug} className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link href={`${basePath}/${r.slug}`} className="font-serif text-zinc-100 hover:text-amber-400">{r.name}</Link>
            {(r.city || r.country) && (
              <span className="text-xs text-zinc-500">— {[r.city, r.country].filter(Boolean).join(', ')}</span>
            )}
            {r.data_tier === 'curated' && (
              <span className="ml-auto rounded border border-amber-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-amber-400">curated</span>
            )}
          </div>
          {(r.tagline || r.summary) && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              {r.tagline ?? r.summary?.slice(0, 200)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
