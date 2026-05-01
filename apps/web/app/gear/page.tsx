import type { Metadata } from 'next';
import { db, listManufacturers } from '@bts/db';
import { ManufacturerCard } from '@/components/equipment/ManufacturerCard';

export const metadata: Metadata = { title: 'Gear' };

export default async function GearPage() {
  const rows = await listManufacturers(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Gear</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} manufacturers</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <ManufacturerCard
            key={row.slug}
            slug={row.slug}
            name={row.name}
            kind={row.kind}
            country={row.country}
            description={row.description}
            seriesCount={row.series_count}
          />
        ))}
      </div>
    </>
  );
}
