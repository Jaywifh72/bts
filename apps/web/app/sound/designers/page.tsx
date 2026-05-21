import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listPostHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sound Designers',
  description:
    'Sound designers and supervising sound editors — the people who build non-dialogue sound from scratch and run the post pipeline. Cited credits.',
  alternates: { canonical: `${siteUrl()}/sound/designers` },
};

export const revalidate = 86400;

const DESIGNER_ROLES = ['sound-designer', 'supervising-sound-editor'];

export default async function SoundDesignersPage() {
  const [topPros, total, houses] = await Promise.all([
    listPeople(db, {
      roleSlugs: DESIGNER_ROLES,
      sort: 'credits',
      withCreditsOnly: true,
      limit: 30,
    }),
    countPeople(db, { roleSlugs: DESIGNER_ROLES, withCreditsOnly: true }),
    listPostHouses(db, { kinds: ['sound_design'], withCreditsOnly: true, limit: 8 }),
  ]);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound/designers'),
          name: 'Sound Designers — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Sound · discipline"
        title="Sound Designers"
        accent="blue"
        description="Sound designers build the non-dialogue world from scratch — creatures, weapons, ambience, signature moments. Supervising sound editors run the post department. Cited credits, with the houses they work out of."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Designers indexed" value={total} />
            <PageHeroStat label="Top credit count" value={topPros[0]?.credit_count ?? 0} />
            <PageHeroStat label="Sound-design houses" value={houses.length} />
          </div>
        }
      />

      <nav aria-label="Sound sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/sound" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Sound hub</Link>
        <Link href="/sound/mixers" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Mixers</Link>
        <Link href="/sound/designers" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Designers</Link>
        <Link href="/sound/post" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Post sound</Link>
        <Link href="/sound/foley" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Foley</Link>
        <Link href="/sound/houses" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Houses</Link>
      </nav>

      {topPros.length > 0 ? (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-credited designers</h2>
            <Link href="/crew?category=sound" className="text-xs text-zinc-400 hover:text-amber-400">All sound crew →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topPros.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Designer'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-zinc-400">No designer credits indexed yet.</p>
      )}

      {houses.length > 0 && (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Sound-design houses</h2>
            <Link href="/sound/houses" className="text-xs text-zinc-400 hover:text-amber-400">All sound houses →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {houses.map((h) => (
              <li key={h.slug}>
                <Link href={`/sound/houses/${h.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{h.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">{h.kind.replace('_', ' ')}</p>
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
