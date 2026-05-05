import type { Metadata } from 'next';
import { db, listManufacturers } from '@bts/db';
import { ManufacturerCard } from '@/components/equipment/ManufacturerCard';

export const metadata: Metadata = { title: 'Gear' };

const KIND_ORDER = ['manufacturer', 'rental_house', 'distributor'] as const;

const KIND_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturers',
  rental_house: 'Rental Houses',
  distributor: 'Distributors',
};

export default async function GearPage() {
  // Hide manufacturers with zero series (defaults applied in the query).
  const rows = await listManufacturers(db);

  type Row = (typeof rows)[number];
  // Group by kind so manufacturers, rental houses, and distributors are
  // visually separated.
  const byKind = new Map<string, Row[]>();
  for (const row of rows as Row[]) {
    const list = byKind.get(row.kind) ?? [];
    list.push(row);
    byKind.set(row.kind, list);
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Gear</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {rows.length} {rows.length === 1 ? 'maker' : 'makers'}
        </p>
      </div>

      {KIND_ORDER.flatMap((kind) => {
        const group = byKind.get(kind);
        if (!group || group.length === 0) return [];
        return [(
          <section key={kind} className="mb-10">
            <h2 className="mb-3 font-serif text-lg text-zinc-200">{KIND_LABELS[kind] ?? kind}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((row) => (
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
          </section>
        )];
      })}
    </>
  );
}
