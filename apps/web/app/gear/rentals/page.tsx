import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listRentalHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Camera rental houses',
  description:
    'The rental houses DPs phone during prep — Panavision, Keslow Camera, Otto Nemenz, Fletcher Camera, Stray Angel, ARRI Rental. Cited and indexed by stocked brands + branch count.',
  alternates: { canonical: `${siteUrl()}/gear/rentals` },
};

export const dynamic = 'force-dynamic';

export default async function RentalHousesPage() {
  type Row = Awaited<ReturnType<typeof listRentalHouses>>[number];
  let rentals: Row[] = [];
  try {
    const rows = await listRentalHouses(db, { limit: 200 });
    rentals = [...rows];
  } catch (err) {
    console.warn('[rental_houses] table missing or query failed', err);
  }
  const totalCredits = rentals.reduce((s, r) => s + r.production_count, 0);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/gear/rentals'), name: 'Camera rental houses — CineCanon' }} />
      <PageHero
        eyebrow="Gear · rentals"
        title="Camera rental houses"
        accent="amber"
        description="The companies DPs phone during prep — Panavision, Keslow, Otto Nemenz, Fletcher, Stray Angel, ARRI Rental. Each profile carries stocked brands, branch geography, headcount, and citations."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Rental houses" value={rentals.length} />
            <PageHeroStat label="Production credits" value={totalCredits} />
            <PageHeroStat label="Countries" value={new Set(rentals.map((r) => r.country).filter(Boolean)).size} />
          </div>
        }
      />

      <nav aria-label="Gear sub-tools" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/gear" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← Gear hub</Link>
        <Link href="/gear/rentals" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Rentals</Link>
        <Link href="/equipment/specs" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Spec browser</Link>
      </nav>

      {rentals.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          The rental house catalog hasn't seeded yet. Migration 0083 + seed
          dispatch loads it.
        </div>
      ) : (
        <div tabIndex={0} role="region" aria-label="Rental houses by credit count"
             className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">Rental house</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Location</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Stocks</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Branches</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Productions</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => (
                <tr key={r.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2">
                    <Link href={`/gear/rentals/${r.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                      {r.name}
                    </Link>
                    {r.specialties && r.specialties.length > 0 && (
                      <div className="text-[11px] text-zinc-500">{r.specialties.slice(0, 4).join(' · ')}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{[r.city, r.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {r.stocks_brands && r.stocks_brands.length > 0
                      ? r.stocks_brands.slice(0, 5).map((b) => b.toUpperCase()).join(' · ')
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">{r.branch_count ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">{r.production_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
