import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listManufacturers, getGearArchiveStats } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';

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
      <PageHero
        eyebrow="Archive"
        title="Gear"
        accent="amber"
        description="Manufacturers, rental houses, and distributors with editorial notes on signature looks and curated per-item specs."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <PageHeroStat label="Manufacturers" value={stats.manufacturers.toLocaleString()} />
            <PageHeroStat label="Rental houses" value={stats.rental_houses.toLocaleString()} />
            <PageHeroStat label="Series" value={stats.series.toLocaleString()} />
            <PageHeroStat label="Items" value={stats.items.toLocaleString()} />
            <PageHeroStat label="Cameras" value={stats.cameras.toLocaleString()} />
            <PageHeroStat label="Lenses" value={stats.lenses.toLocaleString()} />
            <PageHeroStat label="Lights" value={stats.lighting.toLocaleString()} />
          </div>
        }
      />

      {/* Drill-into strip — surfaces the spec browser + compare tool. */}
      <nav aria-label="Gear sub-tools" className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-[10px] uppercase tracking-widest text-zinc-500">Drill into</span>
        <Link href="/equipment/specs" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Spec browser</Link>
        <Link href="/equipment/specs?category=camera_body" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Cameras</Link>
        <Link href="/equipment/specs?category=lens_set" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Lenses</Link>
        <Link href="/equipment/specs?category=lighting_fixture" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Lighting</Link>
        <Link href="/gear/rentals" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Rental houses</Link>
        <Link href="/gear/compare" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Compare 2-4 items</Link>
      </nav>

      {KIND_ORDER.flatMap((kind) => {
        const group = byKind.get(kind);
        if (!group || group.length === 0) return [];
        return [(
          <section key={kind} className="mb-10">
            <div className="mb-4">
              <h2 className="font-serif text-xl text-zinc-100">{KIND_LABELS[kind] ?? kind}</h2>
              <p className="mt-0.5 text-xs text-zinc-400">{KIND_TAGLINE[kind]}</p>
            </div>
            <div
              tabIndex={0}
              role="region"
              aria-label={KIND_LABELS[kind] ?? kind}
              className="scroll-hint-right overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <table className="stack-on-mobile w-full text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-normal">Manufacturer</th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">Country</th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">Tagline</th>
                    <th scope="col" className="px-3 py-2 text-right font-normal">Series</th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">Website</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((row) => (
                    <tr key={row.slug} className="border-b border-zinc-900 align-top hover:bg-zinc-900/40">
                      <td data-label="Manufacturer" className="px-3 py-2">
                        <Link href={`/gear/${row.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                          {row.name}
                        </Link>
                      </td>
                      <td data-label="Country" className="px-3 py-2 text-zinc-400">
                        {row.country ?? <span className="text-zinc-500">—</span>}
                      </td>
                      <td data-label="Tagline" className="px-3 py-2 max-w-md text-xs text-zinc-300">
                        {row.tagline ?? row.description ?? <span className="text-zinc-500">—</span>}
                      </td>
                      <td data-label="Series" className="px-3 py-2 text-right font-mono tabular-nums text-amber-300">
                        {row.series_count > 0 ? row.series_count : <span className="text-zinc-500">—</span>}
                      </td>
                      <td data-label="Website" className="px-3 py-2 text-xs">
                        {row.website ? (
                          <a
                            href={row.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline"
                          >
                            site <span aria-hidden="true">↗</span>
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )];
      })}
    </>
  );
}
