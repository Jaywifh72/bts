import type { Metadata } from 'next';
import { db, listVfxHouses } from '@bts/db';
import { VfxHouseCard } from '@/components/vfx/VfxHouseCard';

export const metadata: Metadata = { title: 'VFX Houses' };

// QA — VFX house roster is slow-moving; daily revalidate is right.
export const revalidate = 86400;

export default async function VfxPage() {
  const rows = await listVfxHouses(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">VFX Houses</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} houses</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-zinc-500">No VFX data imported yet. Run the scraper to populate.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <VfxHouseCard
              key={row.slug}
              slug={row.slug}
              name={row.name}
              country={row.country}
              website={row.website}
              productionCount={row.production_count}
            />
          ))}
        </div>
      )}
    </>
  );
}
