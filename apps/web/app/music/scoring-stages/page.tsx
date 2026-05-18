import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listScoringStages } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Scoring stages',
  description:
    'Every scoring stage credited on a curated film — Newman, Eastwood, Abbey Road, AIR Lyndhurst, Synchron, Vienna Konzerthaus. Ranked by film-score credit count, with orchestra capacity.',
  alternates: { canonical: `${siteUrl()}/music/scoring-stages` },
};

export const dynamic = 'force-dynamic';

export default async function ScoringStagesPage() {
  type StageRow = Awaited<ReturnType<typeof listScoringStages>>[number];
  let stages: StageRow[] = [];
  try {
    stages = [...(await listScoringStages(db, { withCreditsOnly: true, limit: 200 }))];
  } catch (err) {
    console.warn('[scoring-stages] query failed', err);
  }
  const totalCredits = stages.reduce((sum, s) => sum + s.production_count, 0);
  const stagesWithCapacity = stages.filter((s) => s.capacity_orchestra !== null);
  const avgCapacity = stagesWithCapacity.length === 0
    ? null
    : Math.round(
        stagesWithCapacity.reduce((sum, s) => sum + (s.capacity_orchestra ?? 0), 0)
        / stagesWithCapacity.length,
      );

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/music/scoring-stages'),
          name: 'Scoring stages — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Music · venues"
        title="Scoring stages"
        accent="amber"
        description="The rooms where film scores get recorded. Capacities reflect typical orchestra seating; credit counts span curated + imported tier productions."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Stages catalogued" value={stages.length} />
            <PageHeroStat label="Production credits" value={totalCredits} />
            <PageHeroStat label="Avg orchestra seats" value={avgCapacity ?? '—'} />
          </div>
        }
      />

      {stages.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No scoring stages with credits yet. The catalog grows as new score deep-dives land. Browse{' '}
          <Link href="/music" className="text-amber-400 hover:text-amber-300">all music</Link> for what's
          documented today.
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Scoring stages ranked by credit count"
          className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">Stage</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Facility</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Location</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Orchestra seats</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Productions</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2 font-medium text-zinc-100">{s.name}</td>
                  <td className="px-3 py-2 text-zinc-300">
                    {s.facility_name ?? <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {[s.city, s.country].filter(Boolean).join(' · ') || <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">
                    {s.capacity_orchestra ?? <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">
                    {s.production_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        Score awards live on{' '}
        <Link href="/awards/craft/score" className="text-amber-400 hover:text-amber-300">/awards/craft/score</Link>.
        Music editing recognition on{' '}
        <Link href="/awards/craft/music-editing" className="text-amber-400 hover:text-amber-300">/awards/craft/music-editing</Link>.
      </p>
    </>
  );
}
