import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPostHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sound houses',
  description:
    'Every post-production house credited on a curated film for sound mix or sound design — Skywalker, Formosa, E²Sound, Goldcrest, and the rest. Ranked by credit count, with city and country.',
  alternates: { canonical: `${siteUrl()}/sound/houses` },
};

export const revalidate = 86400;

type SearchParams = { kind?: string };

const KIND_LABELS: Record<string, string> = {
  all: 'All sound',
  sound_mix: 'Sound mix',
  sound_design: 'Sound design',
};

export default async function SoundHousesPage(
  { searchParams }: { searchParams: Promise<SearchParams> },
) {
  const sp = await searchParams;
  const kind = sp.kind && sp.kind in KIND_LABELS ? sp.kind : 'all';
  const kindsFilter = kind === 'all' ? ['sound_mix', 'sound_design'] : [kind];

  const houses = await listPostHouses(db, {
    kinds: kindsFilter,
    withCreditsOnly: true,
    limit: 200,
  });

  const totalCredits = houses.reduce((sum, h) => sum + h.production_count, 0);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound/houses'),
          name: 'Sound houses — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Sound · houses"
        title="Sound houses"
        accent="blue"
        description="Post-production facilities credited for sound mix or sound design. Every credit is cited; counts reflect curated + imported tiers."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Houses listed" value={houses.length} />
            <PageHeroStat label="Production credits" value={totalCredits} />
            <PageHeroStat label="Discipline filter" value={KIND_LABELS[kind]} />
          </div>
        }
      />

      <nav aria-label="Filter by discipline" className="mb-6 flex flex-wrap gap-2">
        {(['all', 'sound_mix', 'sound_design'] as const).map((k) => {
          const active = kind === k;
          return (
            <Link
              key={k}
              href={k === 'all' ? '/sound/houses' : `/sound/houses?kind=${k}`}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-sm text-amber-300'
                  : 'rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-sm text-zinc-300 hover:border-amber-700 hover:text-amber-400'
              }
            >
              {KIND_LABELS[k]}
            </Link>
          );
        })}
      </nav>

      {houses.length === 0 ? (
        <p className="text-sm text-zinc-500">No sound houses in this filter. Try a different discipline.</p>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Sound houses ranked by credit count"
          className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">House</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Discipline</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Location</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Productions</th>
              </tr>
            </thead>
            <tbody>
              {houses.map((h) => (
                <tr key={h.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2 font-medium text-zinc-100">{h.name}</td>
                  <td className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-300">
                    {h.kind.replace('_', ' ')}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {[h.city, h.country].filter(Boolean).join(' · ') || <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">
                    {h.production_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        For the production roster of a house, open the film via the production page until per-house detail
        routes land. Sound discipline awards live on{' '}
        <Link href="/awards/craft/sound-design" className="text-amber-400 hover:text-amber-300">/awards/craft/sound-design</Link>
        {' '}and{' '}
        <Link href="/awards/craft/dialogue-adr" className="text-amber-400 hover:text-amber-300">/awards/craft/dialogue-adr</Link>.
      </p>
    </>
  );
}
