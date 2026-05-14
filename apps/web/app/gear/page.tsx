import type { Metadata } from 'next';
import { db, listManufacturers, getGearArchiveStats } from '@bts/db';
import { ManufacturerCard } from '@/components/equipment/ManufacturerCard';

export const metadata: Metadata = {
  title: 'Gear',
  description: 'Cinema cameras, lenses, lighting, filters and rental houses — manufacturer profiles with editorial summaries, full filmography credits, and curated specs.',
};

// QA — manufacturer/series rosters change slowly; daily is right.
export const revalidate = 86400;

const KIND_ORDER = ['manufacturer', 'rental_house', 'distributor'] as const;

const KIND_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturers',
  rental_house: 'Rental Houses',
  distributor: 'Distributors',
};

const KIND_TAGLINE: Record<string, string> = {
  manufacturer: 'Brands that build the cameras, lenses, lights and filters used on set.',
  rental_house: 'The rental fleets cinematographers actually pull from.',
  distributor: 'Regional and specialty distributors.',
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

export default async function GearPage() {
  const [allRows, stats] = await Promise.all([
    listManufacturers(db, { withSeriesOnly: false }),
    getGearArchiveStats(db),
  ]);
  const rows = allRows.filter(
    (r) => r.kind === 'rental_house' || r.series_count > 0,
  );

  type Row = (typeof rows)[number];
  const byKind = new Map<string, Row[]>();
  for (const row of rows as Row[]) {
    const list = byKind.get(row.kind) ?? [];
    list.push(row);
    byKind.set(row.kind, list);
  }

  return (
    <>
      <div className="mb-10 border-b border-zinc-800 pb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">Gear</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          CineCanon catalogues every camera, lens set, light, and filter
          we have curated production data for — with manufacturer
          profiles, editorial notes on signature looks, and per-item
          specs sourced from manufacturer datasheets.
        </p>

        {/* Catalog stats */}
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Manufacturers" value={stats.manufacturers} />
          <Stat label="Rental houses" value={stats.rental_houses} />
          <Stat label="Series" value={stats.series} />
          <Stat label="Items" value={stats.items} />
          <Stat label="Cameras" value={stats.cameras} />
          <Stat label="Lenses" value={stats.lenses} />
          <Stat label="Lights" value={stats.lighting} />
        </div>
      </div>

      {KIND_ORDER.flatMap((kind) => {
        const group = byKind.get(kind);
        if (!group || group.length === 0) return [];
        return [(
          <section key={kind} className="mb-10">
            <div className="mb-4">
              <h2 className="font-serif text-xl text-zinc-100">{KIND_LABELS[kind] ?? kind}</h2>
              <p className="mt-0.5 text-xs text-zinc-500">{KIND_TAGLINE[kind]}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((row) => (
                <ManufacturerCard
                  key={row.slug}
                  slug={row.slug}
                  name={row.name}
                  kind={row.kind}
                  country={row.country}
                  description={row.tagline ?? row.description}
                  website={row.website}
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
