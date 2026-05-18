import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Foley',
  description:
    'Foley artists — synchronous everyday sound performed to picture on a foley stage. Footsteps, cloth, props, eats, body falls. The most physical craft in post sound.',
  alternates: { canonical: `${siteUrl()}/sound/foley` },
};

export const revalidate = 86400;

const FOLEY_ROLES = ['foley-artist'];

export default async function FoleyPage() {
  const [topArtists, total] = await Promise.all([
    listPeople(db, { roleSlugs: FOLEY_ROLES, sort: 'credits', withCreditsOnly: true, limit: 24 }),
    countPeople(db, { roleSlugs: FOLEY_ROLES, withCreditsOnly: true }),
  ]);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound/foley'),
          name: 'Foley — CineCanon',
        }}
      />

      <PageHero
        eyebrow="Sound · discipline"
        title="Foley"
        accent="blue"
        description="Synchronous everyday sound, performed to picture on a foley stage. Named for Jack Foley, who invented the craft at Universal in the 1930s. The most physical role in post sound."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Foley artists" value={total} />
            <PageHeroStat label="Top credit count" value={topArtists[0]?.credit_count ?? 0} />
            <PageHeroStat label="Award craft" value="sound-design" />
          </div>
        }
      />

      <nav aria-label="Sound sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/sound" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Sound hub</Link>
        <Link href="/sound/post" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Post sound</Link>
        <Link href="/sound/effects" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Effects & design</Link>
        <Link href="/sound/foley" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Foley</Link>
        <Link href="/awards/craft/sound-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Awards</Link>
      </nav>

      <section className="mb-12">
        <h2 className="mb-3 font-serif text-xl text-zinc-100">The craft</h2>
        <div className="prose prose-invert prose-sm max-w-3xl text-zinc-300">
          <p>
            Foley fills the gaps production audio can't carry — every footstep, sleeve rustle, glass set
            down, key in lock, body fall. The artist performs synchronously to picture in a dedicated foley
            stage (concrete, gravel, wood, water, sand pits, prop wall), recorded by a <em>foley mixer</em>
            {' '}and assembled by a <em>foley editor</em>. The end result blends invisibly with production
            dialog and the design-side sonic content.
          </p>
          <p>
            Foley credits often sit in the supervising sound editor's roster on awards; the MPSE Golden Reel
            sound-effects & foley category recognizes the work explicitly. Foley artists are listed here when
            CineCanon has a citable credit for them on a specific production.
          </p>
        </div>
      </section>

      {topArtists.length > 0 ? (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-credited foley artists</h2>
            <Link href="/crew?category=sound" className="text-xs text-zinc-400 hover:text-amber-400">All sound crew →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topArtists.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No foley artists in the archive with cited credits yet. TMDb crew sync currently skips most foley
          credits — they'll populate as the sound-side ingest job lands.
        </div>
      )}
    </>
  );
}
