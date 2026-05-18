import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listRecordingOrchestras } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Recording orchestras',
  description:
    'The orchestras that play modern film scores — London Symphony Orchestra, Vienna Synchron Stage Orchestra, Hollywood Studio Symphony, Boston Symphony, Skywalker. Cross-cut by scoring stage and credit count.',
  alternates: { canonical: `${siteUrl()}/music/orchestras` },
};

export const dynamic = 'force-dynamic';

export default async function OrchestrasPage() {
  type Row = Awaited<ReturnType<typeof listRecordingOrchestras>>[number];
  let orchestras: Row[] = [];
  try {
    const rows = await listRecordingOrchestras(db, { limit: 200 });
    orchestras = [...rows];
  } catch (err) {
    console.warn('[recording_orchestras] table missing or query failed', err);
  }
  const totalScores = orchestras.reduce((s, o) => s + o.score_count, 0);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/music/orchestras'), name: 'Recording orchestras — CineCanon' }} />
      <PageHero
        eyebrow="Music · ensembles"
        title="Recording orchestras"
        accent="amber"
        description="The orchestras that play modern film scores. LSO at Abbey Road. Vienna Synchron Stage Orchestra at Synchron Vienna. Hollywood Studio Symphony at Sony / Eastwood. Each entry links to its primary scoring stage + cited credits."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Orchestras catalogued" value={orchestras.length} />
            <PageHeroStat label="Score credits" value={totalScores} />
            <PageHeroStat label="Countries" value={new Set(orchestras.map((o) => o.country).filter(Boolean)).size} />
          </div>
        }
      />

      <nav aria-label="Music sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/music" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← Music hub</Link>
        <Link href="/music/orchestras" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Orchestras</Link>
        <Link href="/music/scoring-stages" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Scoring stages</Link>
        <Link href="/music/composers" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Composers</Link>
      </nav>

      {orchestras.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          Orchestra catalog seeds with migration 0083 + dispatch.
        </div>
      ) : (
        <div tabIndex={0} role="region" aria-label="Recording orchestras by score-credit count"
             className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">Orchestra</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Music director</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Location</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Primary stage</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Ensemble size</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Score credits</th>
              </tr>
            </thead>
            <tbody>
              {orchestras.map((o) => (
                <tr key={o.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2">
                    <Link href={`/music/orchestras/${o.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                      {o.name}
                    </Link>
                    {o.short_name && <span className="ml-2 font-mono text-[10px] text-zinc-500">{o.short_name}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-300">{o.music_director ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-400">{[o.city, o.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-xs text-zinc-300">
                    {o.primary_stage_slug ? (
                      <Link href={`/music/scoring-stages/${o.primary_stage_slug}`} className="text-amber-400 hover:text-amber-300">
                        {o.primary_stage_name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">{o.ensemble_size ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">{o.score_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
