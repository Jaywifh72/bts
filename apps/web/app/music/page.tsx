import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listProductions, listScoringStages } from '@bts/db';
import { DepartmentIndex } from '@/components/role/DepartmentIndex';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Music',
  description: 'Composers, music supervisors, and orchestrators — credited and cross-referenced.',
  alternates: { canonical: `${siteUrl()}/music` },
};

export const revalidate = 86400;

export default async function MusicPage() {
  const [composers, totalPeople, curated, stages] = await Promise.all([
    listPeople(db, { category: 'music', sort: 'credits', withCreditsOnly: true, limit: 15 }),
    countPeople(db, { category: 'music', withCreditsOnly: true }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
    // F3a — scoring stages from migration 0062. Renders empty until
    // curators seed the table.
    listScoringStages(db, { withCreditsOnly: true, limit: 12 }),
  ]);

  const topCredits = composers[0]?.credit_count ?? 0;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/music'), name: 'Music — CineCanon' }} />

      {/* Sub-discipline strip — exposes the dedicated composer /
          supervisor / scoring-stage indexes and the for-* role pages. */}
      <nav aria-label="Music sub-disciplines" className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-[10px] uppercase tracking-widest text-zinc-500">Drill into</span>
        <Link href="/music/composers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Composers</Link>
        <Link href="/music/supervisors" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Music supervisors</Link>
        <Link href="/music/scoring-stages" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Scoring stages</Link>
        <Link href="/music/orchestras" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Orchestras</Link>
        <Link href="/for-composers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For composers</Link>
        <Link href="/for-music-supervisors" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For supervisors</Link>
        <Link href="/awards/craft/score" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Score awards</Link>
        <Link href="/awards/craft/music-supervision" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Supervision awards</Link>
      </nav>

      <DepartmentIndex
        title="Music"
        accent="amber"
        description="Composers and music supervisors. The score, the licensed cue, and the diegetic source — credited and cross-referenced."
        stats={[
          { label: 'People in archive', value: totalPeople.toLocaleString() },
          { label: 'Top-credited count', value: topCredits.toLocaleString() },
          { label: 'Curated dossiers', value: curated.length },
          { label: 'Discipline', value: 'Music' },
        ]}
        glossary={[
          { term: 'Composer', def: 'Writes original music for the picture. Score credit. May or may not orchestrate or conduct.' },
          { term: 'Music Supervisor', def: 'Sources and clears licensed songs (needle drops). The credit you want for "the soundtrack is great."' },
          { term: 'Orchestrator', def: 'Translates the composer\'s sketches into full orchestral parts. Often does not write themes; the craft is voicing and ensemble balance.' },
          { term: 'Score vs Soundtrack', def: 'Score = the original-music cue list (Composer credit). Soundtrack = the full audio program including licensed songs and source music (Music Supervisor credit).' },
          { term: 'Scoring stage', def: 'Recording venue used for the score sessions — e.g. Newman Stage (Fox), Eastwood Stage (Warner), Abbey Road, AIR Lyndhurst. Often documented per credit.' },
          { term: 'Diegetic / Non-diegetic', def: 'Diegetic = sound originating in the story world (a character\'s radio). Non-diegetic = score the audience hears but characters don\'t.' },
        ]}
        crossCuts={[
          { href: '/ask?q=Hans+Zimmer+films+citations', title: 'Hans Zimmer filmography' },
          { href: '/ask?q=Mica+Levi+composer+features', title: 'Mica Levi feature scores' },
          { href: '/ask?q=Daniel+Blumberg+The+Brutalist+score', title: 'Daniel Blumberg, The Brutalist' },
          { href: '/ask?q=Carter+Burwell+Coen+collaborator', title: 'Carter Burwell × Coen filmography' },
        ]}
        people={composers}
        films={curated}
        allCrewHref="/crew?category=music"
        vendors={
          stages.length > 0 ? (
            <section className="mb-12">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-zinc-100">
                  Scoring stages
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    by film-score credit count
                  </span>
                </h2>
                <Link href="/ask?q=scoring+stage+credits" className="text-xs text-zinc-400 hover:text-amber-400">
                  Cross-cut <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div
                tabIndex={0}
                role="region"
                aria-label="Scoring stages by credit count"
                className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-normal">Stage</th>
                      <th scope="col" className="px-3 py-2 text-left font-normal">Facility</th>
                      <th scope="col" className="px-3 py-2 text-left font-normal">Location</th>
                      <th scope="col" className="px-3 py-2 text-right font-normal">Orchestra</th>
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
            </section>
          ) : null
        }
      />
    </>
  );
}
