import Link from 'next/link';
import type { SearchResult, SearchCategory } from '@bts/db';

const CATEGORY_META: Record<
  SearchCategory,
  { label: string; indexHref: string | null }
> = {
  production: { label: 'Films', indexHref: '/films' },
  person: { label: 'Crew', indexHref: '/crew' },
  vfx_house: { label: 'VFX Houses', indexHref: '/vfx' },
  manufacturer: { label: 'Manufacturers', indexHref: '/gear' },
  series: { label: 'Series', indexHref: '/gear' },
  item: { label: 'Items', indexHref: '/gear' },
};

// Display order — Films first because it's the primary entry point per the
// web app design doc (D1: production-first).
const ORDER: SearchCategory[] = [
  'production',
  'person',
  'vfx_house',
  'manufacturer',
  'series',
  'item',
];

export function ResultsByCategory({ results }: { results: SearchResult[] }) {
  if (results.length === 0) return null;

  // Bucket into a map keyed by category, preserving the per-category score order
  // we already get from the query.
  const buckets = new Map<SearchCategory, SearchResult[]>();
  for (const r of results) {
    const list = buckets.get(r.category) ?? [];
    list.push(r);
    buckets.set(r.category, list);
  }

  return (
    <div className="space-y-10">
      {ORDER.filter((c) => buckets.has(c)).map((category) => {
        const rows = buckets.get(category)!;
        const meta = CATEGORY_META[category];
        return (
          <section key={category}>
            <header className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">{meta.label}</h2>
              {meta.indexHref && (
                <Link
                  href={meta.indexHref}
                  className="text-xs text-zinc-500 hover:text-amber-400"
                >
                  View all →
                </Link>
              )}
            </header>
            <ul className="divide-y divide-zinc-900 rounded border border-zinc-800 bg-zinc-900/40">
              {rows.map((r) => (
                <li key={`${r.category}:${r.slug}`}>
                  <Link
                    href={r.href}
                    className="flex items-baseline justify-between gap-4 px-4 py-2.5 hover:bg-zinc-900"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="text-zinc-100">{r.display}</span>
                      {r.subtitle && (
                        <span className="ml-2 text-xs text-zinc-500">{r.subtitle}</span>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-600 tabular-nums">
                      {r.score.toFixed(2)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
