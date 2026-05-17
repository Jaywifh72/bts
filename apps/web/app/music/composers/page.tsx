import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Composers',
  description:
    'Every credited film composer in the archive, ranked by curated-film credit count. Composers, co-composers, orchestrators, and music editors — the score side of the music department.',
  alternates: { canonical: `${siteUrl()}/music/composers` },
};

export const revalidate = 86400;

const SCORE_ROLES = ['composer', 'co-composer', 'orchestrator', 'music-editor'];

export default async function ComposersPage() {
  const [composers, total] = await Promise.all([
    listPeople(db, { roleSlugs: SCORE_ROLES, sort: 'credits', withCreditsOnly: true, limit: 200 }),
    countPeople(db, { roleSlugs: SCORE_ROLES, withCreditsOnly: true }),
  ]);
  const topCount = composers[0]?.credit_count ?? 0;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/music/composers'),
          name: 'Composers — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Music · people"
        title="Composers"
        accent="amber"
        description="Composers, co-composers, orchestrators, and music editors with at least one cited credit. The score side of the music department; music supervisors live on a separate index."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="In archive" value={total} />
            <PageHeroStat label="Top credit count" value={topCount} />
            <PageHeroStat label="Roles indexed" value={SCORE_ROLES.length} />
          </div>
        }
      />

      <nav aria-label="Music sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/music/composers" aria-current="page"
              className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">
          Composers
        </Link>
        <Link href="/music/supervisors"
              className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Music supervisors
        </Link>
        <Link href="/music/scoring-stages"
              className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Scoring stages
        </Link>
        <Link href="/awards/craft/score"
              className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Score awards
        </Link>
      </nav>

      {composers.length === 0 ? (
        <p className="text-sm text-zinc-500">No composers with cited credits yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {composers.map((p, i) => (
            <li key={p.slug}>
              <Link
                href={`/crew/${p.slug}`}
                className="flex items-baseline gap-x-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
              >
                <span className="w-6 text-right font-mono text-[10px] text-zinc-500">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{p.primary_role ?? 'Composer'}</p>
                </div>
                <span className="font-mono text-xs text-amber-400">{p.credit_count ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
