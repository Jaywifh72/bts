import type { Metadata } from 'next';
import Link from 'next/link';
import { db, findLensesByDpOnProduction } from '@bts/db';
import { KillerQueryTable } from '@/components/queries/KillerQueryTable';

export const metadata: Metadata = { title: 'Greig Fraser lenses on Dune: Part Two' };

export default async function DunePartTwoLensesPage() {
  const rows = await findLensesByDpOnProduction(db, 'greig-fraser', 'dune-part-two-2024');

  return (
    <>
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
