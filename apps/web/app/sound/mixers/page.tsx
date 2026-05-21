import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sound Mixers',
  description:
    'Production sound mixers, re-recording mixers, and boom operators — the mix discipline, with cited credits.',
  alternates: { canonical: `${siteUrl()}/sound/mixers` },
};

export const revalidate = 86400;

const MIXER_ROLES = [
  'production-sound-mixer',
  're-recording-mixer',
  'boom-operator',
];

export default async function SoundMixersPage() {
  const [topPros, total] = await Promise.all([
    listPeople(db, {
      roleSlugs: MIXER_ROLES,
      sort: 'credits',
      withCreditsOnly: true,
      limit: 30,
    }),
    countPeople(db, { roleSlugs: MIXER_ROLES, withCreditsOnly: true }),
  ]);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound/mixers'),
          name: 'Sound Mixers — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Sound · discipline"
        title="Sound Mixers"
        accent="blue"
        description="The mix discipline — production sound mixers on set, re-recording mixers on the dub stage, and the boom operators capturing dialogue. Cited credits, with re-recording overlap into the post pipeline."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Mixers indexed" value={total} />
            <PageHeroStat label="Top credit count" value={topPros[0]?.credit_count ?? 0} />
            <PageHeroStat label="Roles indexed" value={MIXER_ROLES.length} />
          </div>
        }
      />

      <nav aria-label="Sound sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/sound" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Sound hub</Link>
        <Link href="/sound/mixers" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Mixers</Link>
        <Link href="/sound/designers" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Designers</Link>
        <Link href="/sound/post" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Post sound</Link>
        <Link href="/sound/foley" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Foley</Link>
        <Link href="/sound/houses" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Houses</Link>
      </nav>

      {topPros.length > 0 ? (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-credited mixers</h2>
            <Link href="/crew?category=sound" className="text-xs text-zinc-400 hover:text-amber-400">All sound crew →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topPros.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Mixer'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-zinc-400">No mixer credits indexed yet.</p>
      )}
    </>
  );
}
