import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Music Supervisors',
  description:
    'Music supervisors with cited credits — the licensed-song side of the music department. Needle drops, clearance, festival soundtracks, source music.',
  alternates: { canonical: `${siteUrl()}/music/supervisors` },
};

export const revalidate = 86400;

const SUPERVISOR_ROLES = ['music-supervisor'];

export default async function SupervisorsPage() {
  const [supervisors, total] = await Promise.all([
    listPeople(db, { roleSlugs: SUPERVISOR_ROLES, sort: 'credits', withCreditsOnly: true, limit: 200 }),
    countPeople(db, { roleSlugs: SUPERVISOR_ROLES, withCreditsOnly: true }),
  ]);
  const topCount = supervisors[0]?.credit_count ?? 0;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/music/supervisors'),
          name: 'Music Supervisors — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Music · people"
        title="Music Supervisors"
        accent="amber"
        description="The licensed-song side of the music department. Music supervisors source and clear pre-existing music — needle drops, source music, festival soundtracks — distinct from the composer-driven score."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="In archive" value={total} />
            <PageHeroStat label="Top credit count" value={topCount} />
            <PageHeroStat label="Award craft" value="music-supervision" />
          </div>
        }
      />

      <nav aria-label="Music sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/music/composers"
              className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Composers
        </Link>
        <Link href="/music/supervisors" aria-current="page"
              className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">
          Music supervisors
        </Link>
        <Link href="/music/scoring-stages"
              className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Scoring stages
        </Link>
        <Link href="/awards/craft/music-supervision"
              className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          Supervision awards
        </Link>
      </nav>

      {supervisors.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No music supervisors with cited credits yet. As music-side ingest catches up (currently filtered out
          of TMDb crew sync), the index will populate. Browse the{' '}
          <Link href="/music" className="text-amber-400 hover:text-amber-300">music hub</Link> for what's available today.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {supervisors.map((p, i) => (
            <li key={p.slug}>
              <Link
                href={`/crew/${p.slug}`}
                className="flex items-baseline gap-x-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
              >
                <span className="w-6 text-right font-mono text-[10px] text-zinc-500">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">Music Supervisor</p>
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
