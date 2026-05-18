import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listPostHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sound Effects & Design',
  description:
    'Sound designers, SFX editors, and the libraries they pull from. The non-dialog, non-music sonic content — creatures, weapons, vehicles, ambience, signature moments.',
  alternates: { canonical: `${siteUrl()}/sound/effects` },
};

export const revalidate = 86400;

const EFFECTS_ROLES = ['sound-designer', 'supervising-sound-editor'];

export default async function SoundEffectsPage() {
  const [topDesigners, total, designHouses] = await Promise.all([
    listPeople(db, { roleSlugs: EFFECTS_ROLES, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    countPeople(db, { roleSlugs: EFFECTS_ROLES, withCreditsOnly: true }),
    listPostHouses(db, { kinds: ['sound_design'], withCreditsOnly: true, limit: 12 }),
  ]);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound/effects'),
          name: 'Sound Effects & Design — CineCanon',
        }}
      />

      <PageHero
        eyebrow="Sound · discipline"
        title="Effects & Design"
        accent="blue"
        description="The non-dialog, non-music sonic content. Creature design, weapons, vehicles, ambience, drones, beds, signature moments — built from a mix of recording, library, and synthesis. The MPSE Golden Reel sound-effects lineage."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Designers + editors" value={total} />
            <PageHeroStat label="Design houses" value={designHouses.length} />
            <PageHeroStat label="Award craft" value="sound-design" />
          </div>
        }
      />

      <nav aria-label="Sound sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/sound" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Sound hub</Link>
        <Link href="/sound/post" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Post sound</Link>
        <Link href="/sound/effects" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Effects & design</Link>
        <Link href="/sound/foley" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Foley</Link>
        <Link href="/awards/craft/sound-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Awards</Link>
      </nav>

      <section className="mb-12">
        <h2 className="mb-3 font-serif text-xl text-zinc-100">What sound design covers</h2>
        <div className="prose prose-invert prose-sm max-w-3xl text-zinc-300">
          <p>
            Sound designers and supervising sound editors are usually adjacent — the supervisor sets the
            sonic identity of the film and assigns design work to a team; designers build the material.
            Modern features pull from a mix of (a) production-recorded effects, (b) library SFX, and (c)
            synthesized or sample-modeled elements. The MPSE Golden Reel awards distinguish design and
            editing categories; AMPAS rolls them into Best Sound.
          </p>
          <p>
            Sound libraries — Boom, Pro Sound Effects, A Sound Effect, Soundly's catalog — are a
            non-trivial part of the production sound budget. CineCanon will catalog them once the
            <code className="mx-1 rounded bg-zinc-800 px-1 py-0.5 text-[11px]">sound_libraries</code> table
            promotes from the proposed migration set (0075).
          </p>
        </div>
      </section>

      {topDesigners.length > 0 && (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-credited sound designers</h2>
            <Link href="/for-sound-designers" className="text-xs text-zinc-400 hover:text-amber-400">Designer landing →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topDesigners.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Sound design'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {designHouses.length > 0 && (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Sound design houses</h2>
            <Link href="/sound/houses?kind=sound_design" className="text-xs text-zinc-400 hover:text-amber-400">All design houses →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {designHouses.map((h) => (
              <li key={h.slug}>
                <Link href={`/sound/houses/${h.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{h.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {[h.city, h.country].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-amber-400">{h.production_count} productions</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
