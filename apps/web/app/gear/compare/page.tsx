import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  db,
  getItemsForComparison,
  getProductionsUsingAnyItem,
} from '@bts/db';
import { posterUrl } from '@/lib/tmdb-image';

export const metadata: Metadata = {
  title: 'Compare gear',
  description: 'Side-by-side spec comparison for cameras, lenses, and other equipment.',
};

type Props = {
  searchParams: Promise<{ items?: string }>;
};

type ItemRow = Awaited<ReturnType<typeof getItemsForComparison>>[number];

/**
 * T4-3 — side-by-side comparison. Pass `?items=slug1,slug2,slug3`. Up to
 * 4 items at a time (table starts to shrink below readable on mobile
 * beyond that).
 */
export default async function CompareGearPage(props: Props) {
  const searchParams = await props.searchParams;
  const slugs = (searchParams.items ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (slugs.length === 0) {
    return (
      <article className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-100">Compare gear</h1>
        <p className="mt-4 text-zinc-400">
          Pass two or more equipment items in the URL to see them side by side.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          Example:{' '}
          <Link
            href="/gear/compare?items=arri-alexa-65,arri-alexa-mini-lf"
            className="text-amber-400 hover:underline"
          >
            ARRI ALEXA 65 vs ALEXA Mini LF
          </Link>
        </p>
      </article>
    );
  }

  const [items, sharedProductions] = await Promise.all([
    getItemsForComparison(db, slugs),
    getProductionsUsingAnyItem(db, slugs),
  ]);

  if (items.length === 0) {
    return (
      <article className="max-w-2xl">
        <h1 className="font-serif text-3xl text-zinc-100">No items found</h1>
        <p className="mt-4 text-zinc-400">
          None of the slugs <code className="text-zinc-300">{slugs.join(', ')}</code> matched. Check the URLs.
        </p>
      </article>
    );
  }

  // Union of all spec keys across the items so missing values appear as "—".
  const allSpecKeys = new Set<string>();
  for (const it of items) {
    if (it.specs && typeof it.specs === 'object') {
      for (const k of Object.keys(it.specs as Record<string, unknown>)) {
        allSpecKeys.add(k);
      }
    }
  }
  // Stable order, with the most-cited specs first.
  const SPEC_ORDER = [
    'sensor_size',
    'sensor_resolution_max',
    'max_frame_rate_fps',
    'mount',
    'color_science',
    'focal_length_mm',
    'max_aperture_t',
    'is_anamorphic',
    'anamorphic_squeeze',
    'lens_format',
  ];
  const orderedSpecs = [
    ...SPEC_ORDER.filter((k) => allSpecKeys.has(k)),
    ...[...allSpecKeys].filter((k) => !SPEC_ORDER.includes(k)).sort(),
  ];

  function renderSpec(it: ItemRow, key: string) {
    const specs = (it.specs ?? {}) as Record<string, unknown>;
    const v = specs[key];
    if (v === undefined || v === null) return <span className="text-zinc-700">—</span>;
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    return String(v);
  }

  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Tools</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-100">Comparison</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
      </header>
      {/* Spec table */}
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="w-48 px-3 py-2 text-left font-medium text-zinc-500">Spec</th>
              {items.map((it) => (
                <th key={it.slug} className="px-3 py-2 text-left">
                  <Link
                    href={`/gear/${it.manufacturer_slug}/${it.series_slug}/${it.slug}`}
                    className="block font-medium text-zinc-100 hover:text-amber-400"
                  >
                    {it.name}
                  </Link>
                  <div className="text-xs font-normal text-zinc-500">
                    {it.manufacturer_name} · {it.series_category.replace(/_/g, ' ')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-zinc-950">
              <td className="px-3 py-2 text-zinc-500">Status</td>
              {items.map((it) => (
                <td key={it.slug} className="px-3 py-2 text-zinc-300">
                  {it.status}
                </td>
              ))}
            </tr>
            <tr className="bg-zinc-900">
              <td className="px-3 py-2 text-zinc-500">Introduced</td>
              {items.map((it) => (
                <td key={it.slug} className="px-3 py-2 text-zinc-300">
                  {it.year_introduced ?? <span className="text-zinc-700">—</span>}
                </td>
              ))}
            </tr>
            <tr className="bg-zinc-950">
              <td className="px-3 py-2 text-zinc-500">Discontinued</td>
              {items.map((it) => (
                <td key={it.slug} className="px-3 py-2 text-zinc-300">
                  {it.year_discontinued ?? <span className="text-zinc-700">—</span>}
                </td>
              ))}
            </tr>
            {orderedSpecs.map((key, i) => (
              <tr key={key} className={i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}>
                <td className="px-3 py-2 text-zinc-500">{key.replace(/_/g, ' ')}</td>
                {items.map((it) => (
                  <td key={it.slug} className="px-3 py-2 text-zinc-300">{renderSpec(it, key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sharedProductions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 font-serif text-lg text-zinc-200">
            Productions that used {items.length === 1 ? 'this' : 'one or more of these'}
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Sorted by how many of the compared items appear on the production.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sharedProductions.map((p) => (
              <Link
                key={p.production_slug}
                href={`/films/${p.production_slug}`}
                className="group flex gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
              >
                <div
                  className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-950"
                  style={{ aspectRatio: '2/3' }}
                >
                  {p.poster_path && (
                    <Image
                      src={posterUrl(p.poster_path, 'w154') ?? ''}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
                    {p.production_title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {p.release_year ?? '—'}
                    {p.matched_item_slugs.length > 1 && (
                      <span className="ml-2 rounded bg-amber-900/40 px-1.5 py-px text-[10px] text-amber-300">
                        {p.matched_item_slugs.length} of {items.length}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
