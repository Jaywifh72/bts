import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listTitleSequenceHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Title sequence houses',
  description:
    'The design shops behind film + episodic title sequences — Imaginary Forces (Karin Fong), Prologue Films (Kyle Cooper), Mill+, Picturemill. Where main-on-end credits, opening sequences, and in-show graphics are made.',
  alternates: { canonical: `${siteUrl()}/vfx/title-houses` },
};

export const dynamic = 'force-dynamic';

export default async function TitleSequenceHousesPage() {
  type Row = Awaited<ReturnType<typeof listTitleSequenceHouses>>[number];
  let houses: Row[] = [];
  try {
    const rows = await listTitleSequenceHouses(db, { limit: 200 });
    houses = [...rows];
  } catch (err) {
    console.warn('[title_sequence_houses] table missing', err);
  }
  const totalCredits = houses.reduce((s, h) => s + h.production_count, 0);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/vfx/title-houses'), name: 'Title sequence houses — CineCanon' }} />
      <PageHero
        eyebrow="VFX · title sequences"
        title="Title sequence houses"
        accent="purple"
        description="The design shops behind film + episodic title sequences. Imaginary Forces, Prologue Films, Mill+, Picturemill — where main-on-end credits, opening sequences, and in-show graphics are designed and animated."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Houses catalogued" value={houses.length} />
            <PageHeroStat label="Production credits" value={totalCredits} />
            <PageHeroStat label="Countries" value={new Set(houses.map((h) => h.country).filter(Boolean)).size} />
          </div>
        }
      />

      <nav aria-label="VFX sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/vfx" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← VFX hub</Link>
        <Link href="/vfx/volumes" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">LED volumes</Link>
        <Link href="/vfx/title-houses" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Title houses</Link>
        <Link href="/awards/craft/visual-effects" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">VFX awards</Link>
      </nav>

      {houses.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          Catalog seeds with migration 0084 + dispatch.
        </div>
      ) : (
        <div tabIndex={0} role="region" aria-label="Title sequence houses"
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
                    <Link href={`/vfx/title-houses/${h.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
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
