import type { Metadata } from 'next';
import Link from 'next/link';
import { db, findMagicHourExteriorLightingByYear } from '@bts/db';
import { KillerQueryTable } from '@/components/queries/KillerQueryTable';

export const metadata: Metadata = { title: 'Magic-Hour Exterior Lighting 2023' };

export default async function MagicHour2023Page() {
  const rows = await findMagicHourExteriorLightingByYear(db, 2023);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Killer Query</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">
          Magic-Hour Exterior Lighting — 2023 Features
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every magic-hour exterior scene in 2023 theatrical features, with the
          lighting fixtures used on each scene.
        </p>
      </div>
      <KillerQueryTable
        rows={rows as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: 'title',
            header: 'Production',
            render: (row) => (
              <Link href={`/films/${row['slug'] as string}`} className="text-zinc-200 hover:text-amber-400">
                {row['title'] as string}
              </Link>
            ),
          },
          {
            key: 'scene_title',
            header: 'Scene',
            render: (row) => <span className="text-zinc-400">{row['scene_title'] as string}</span>,
          },
          {
            key: 'lighting_series',
            header: 'Lighting Series',
            render: (row) => <span className="text-zinc-200">{row['lighting_series'] as string}</span>,
          },
          {
            key: 'lighting_item',
            header: 'Item',
            render: (row) =>
              row['lighting_item']
                ? <span className="text-zinc-400">{row['lighting_item'] as string}</span>
                : <span className="text-zinc-600">—</span>,
          },
        ]}
      />
    </>
  );
}
