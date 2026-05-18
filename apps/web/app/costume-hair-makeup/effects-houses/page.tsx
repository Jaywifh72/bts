import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listMakeupEffectsHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Makeup effects houses',
  description:
    'Practical makeup-effects fabrication shops — KNB EFX (Greg Nicotero), Spectral Motion (Mike Elizalde), Legacy Effects (Shane Mahan / Lindsay MacGowan / Lon Lucini), Tom Savini Studios. Where prosthetic builds, creature design, and animatronic puppets get made.',
  alternates: { canonical: `${siteUrl()}/costume-hair-makeup/effects-houses` },
};

export const dynamic = 'force-dynamic';

export default async function MakeupEffectsHousesPage() {
  type Row = Awaited<ReturnType<typeof listMakeupEffectsHouses>>[number];
  let houses: Row[] = [];
  try {
    const rows = await listMakeupEffectsHouses(db, { limit: 200 });
    houses = [...rows];
  } catch (err) {
    console.warn('[makeup_effects_houses] table missing', err);
  }
  const totalCredits = houses.reduce((s, h) => s + h.production_count, 0);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/costume-hair-makeup/effects-houses'), name: 'Makeup effects houses — CineCanon' }} />
      <PageHero
        eyebrow="Makeup · effects houses"
        title="Practical effects + creature shops"
        accent="amber"
        description="The fabrication shops where prosthetic builds, creature design, animatronic puppets, and SFX makeup live. KNB EFX (Greg Nicotero, Howard Berger), Legacy Effects, Spectral Motion, Tom Savini Studios — the houses behind every iconic practical creature of the past 40 years."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Houses catalogued" value={houses.length} />
            <PageHeroStat label="Production credits" value={totalCredits} />
            <PageHeroStat label="Countries" value={new Set(houses.map((h) => h.country).filter(Boolean)).size} />
          </div>
        }
      />

      <nav aria-label="CHM sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/costume-hair-makeup" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← CHM hub</Link>
        <Link href="/costume-hair-makeup/designers" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Designers + dept heads</Link>
        <Link href="/costume-hair-makeup/effects-houses" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Effects houses</Link>
        <Link href="/awards/craft/makeup-hairstyling" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">MU & H awards</Link>
      </nav>

      {houses.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          Catalog seeds with migration 0084 + dispatch.
        </div>
      ) : (
        <div tabIndex={0} role="region" aria-label="Makeup effects houses by credit count"
             className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">House</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Founders</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Location</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Specialties</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Founded</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Productions</th>
              </tr>
            </thead>
            <tbody>
              {houses.map((h) => (
                <tr key={h.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2">
                    <Link href={`/costume-hair-makeup/effects-houses/${h.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                      {h.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {h.founders && h.founders.length > 0 ? h.founders.slice(0, 3).join(', ') : '—'}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{[h.city, h.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {h.specialties && h.specialties.length > 0 ? h.specialties.slice(0, 3).join(' · ') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-xs text-zinc-500">{h.founded_year ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">{h.production_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
