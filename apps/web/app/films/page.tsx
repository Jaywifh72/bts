import type { Metadata } from 'next';
import { db, listProductions } from '@bts/db';
import { ProductionCard } from '@/components/productions/ProductionCard';

export const metadata: Metadata = { title: 'Films' };

export default async function FilmsPage() {
  const rows = await listProductions(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Films</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} productions</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <ProductionCard
            key={row.slug}
            slug={row.slug}
            title={row.title}
            type={row.type}
            releaseYear={row.release_year}
            synopsis={row.synopsis}
            primaryAspectRatio={row.primary_aspect_ratio}
            primaryAcquisitionFormat={row.primary_acquisition_format}
          />
        ))}
      </div>
    </>
  );
}
