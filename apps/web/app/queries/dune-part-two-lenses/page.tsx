import type { Metadata } from 'next';
import Link from 'next/link';
import { db, findLensesByDpOnProduction } from '@bts/db';
import { KillerQueryTable } from '@/components/queries/KillerQueryTable';
import { JsonLd } from '@/lib/jsonLd';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Greig Fraser lenses on Dune: Part Two',
  description: 'Every lens series and item used by cinematographer Greig Fraser on Dune: Part Two (2024) — cited, with confidence grades.',
  alternates: { canonical: '/queries/dune-part-two-lenses' },
};

export default async function DunePartTwoLensesPage() {
  const rows = await findLensesByDpOnProduction(db, 'greig-fraser', 'dune-part-two-2024');

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        '@id': absoluteUrl('/queries/dune-part-two-lenses'),
        url: absoluteUrl('/queries/dune-part-two-lenses'),
        headline: 'Greig Fraser lenses on Dune: Part Two',
        about: { '@type': 'Movie', name: 'Dune: Part Two', url: absoluteUrl('/films/dune-part-two-2024') },
        author: { '@type': 'Organization', name: 'CineCanon', url: absoluteUrl('/') },
        publisher: { '@type': 'Organization', name: 'CineCanon', url: absoluteUrl('/') },
      }} />
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Killer Query</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">
          Greig Fraser — Lenses on <em>Dune: Part Two</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every lens series and item used by{' '}
          <Link href="/crew/greig-fraser" className="text-amber-400 hover:underline">Greig Fraser</Link>
          {' '}on{' '}
          <Link href="/films/dune-part-two-2024" className="text-amber-400 hover:underline">Dune: Part Two</Link>
          {' '}(2024).
        </p>
      </div>
      <KillerQueryTable
        rows={rows}
        columns={[
          {
            key: 'series_name',
            header: 'Lens Series',
            render: (row) => (
              <Link
                href={`/gear/${row.manufacturer_slug}/${row.series_slug}`}
                className="text-zinc-200 hover:text-amber-400"
              >
                {row.series_name}
              </Link>
            ),
          },
          {
            key: 'item_name',
            header: 'Item',
            render: (row) =>
              row.item_slug
                ? (
                  <Link
                    href={`/gear/${row.manufacturer_slug}/${row.series_slug}/${row.item_slug}`}
                    className="text-zinc-400 hover:text-amber-400"
                  >
                    {row.item_name}
                  </Link>
                )
                : <span className="text-zinc-600">—</span>,
          },
        ]}
      />
    </>
  );
}
