import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listSoundLibraries } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sound Libraries',
  description:
    'The third-party sound effects libraries credited on curated films — Boom, Pro Sound Effects, A Sound Effect, Soundly, Sound Ideas. The catalog nobody else indexes.',
  alternates: { canonical: `${siteUrl()}/sound/effects/libraries` },
};

export const revalidate = 86400;

export default async function SoundLibrariesPage() {
  const libraries = await listSoundLibraries(db, { withCreditsOnly: false, limit: 200 });
  const totalCredits = libraries.reduce((s, l) => s + l.production_count, 0);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound/effects/libraries'),
          name: 'Sound Libraries — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Sound · effects"
        title="Sound Libraries"
        accent="blue"
        description="The third-party SFX libraries credited on curated films. Boom, Pro Sound Effects, A Sound Effect, Soundly, Sound Ideas — a non-trivial part of any modern feature's sonic content."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Libraries" value={libraries.length} />
            <PageHeroStat label="Production credits" value={totalCredits} />
            <PageHeroStat label="Sub-discipline" value="Sound design" />
          </div>
        }
      />

      <nav aria-label="Sound sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/sound/effects" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← Effects & design</Link>
        <Link href="/sound/effects/libraries" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Libraries</Link>
        <Link href="/sound/houses" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Sound houses</Link>
      </nav>

      {libraries.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          The sound library catalog hasn't been seeded yet. When library credits land via editorial
          deep-dives or end-credit scraping, they'll appear here ranked by film-credit count.
          Browse <Link href="/sound/effects" className="text-amber-400 hover:text-amber-300">/sound/effects</Link>
          {' '}for the designer-side roster in the meantime.
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Sound libraries ranked by credit count"
          className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">Library</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Publisher</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Specialties</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Productions</th>
              </tr>
            </thead>
            <tbody>
              {libraries.map((l) => (
                <tr key={l.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2">
                    <Link href={`/sound/effects/libraries/${l.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{l.publisher ?? <span className="text-zinc-500">—</span>}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {l.specialties && l.specialties.length > 0
                      ? l.specialties.slice(0, 3).join(' · ')
                      : <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">{l.production_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
