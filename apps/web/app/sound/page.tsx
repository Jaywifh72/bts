import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listProductions, listPostHouses } from '@bts/db';
import { DepartmentIndex } from '@/components/role/DepartmentIndex';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Sound',
  description:
    'Production sound mixers, sound designers, foley artists, dialog editors, re-recording mixers, and supervising sound editors — cited credits and confidence-graded sources.',
  alternates: { canonical: `${siteUrl()}/sound` },
};

export const revalidate = 86400;

const SOUND_ROLE_SLUGS = [
  'production-sound-mixer',
  'sound-designer',
  're-recording-mixer',
  'foley-artist',
  'boom-operator',
  'supervising-sound-editor',
  'dialog-editor',
];

export default async function SoundPage() {
  const [people, totalPeople, curated, soundHouses] = await Promise.all([
    listPeople(db, { roleSlugs: SOUND_ROLE_SLUGS, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    countPeople(db, { roleSlugs: SOUND_ROLE_SLUGS, withCreditsOnly: true }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
    // Theme F follow-up: post-houses tagged sound_mix / sound_design
    // power the /sound vendor panel. No migration needed — table existed.
    listPostHouses(db, { kinds: ['sound_mix', 'sound_design'], withCreditsOnly: true, limit: 12 }),
  ]);

  const topCredits = people[0]?.credit_count ?? 0;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound'),
          name: 'Sound — CineCanon',
          description:
            'Sound department: mixers, designers, foley artists, dialog editors, re-recording mixers, supervising sound editors.',
        }}
      />

      {/* Sub-discipline strip — surfaces the editorial / index sub-routes
          so visitors can drill into a specific craft slice rather than
          scanning the full people list. */}
      <nav aria-label="Sound sub-disciplines" className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-[10px] uppercase tracking-widest text-zinc-500">Drill into</span>
        <Link href="/sound/post" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Post sound</Link>
        <Link href="/sound/effects" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Effects & design</Link>
        <Link href="/sound/foley" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Foley</Link>
        <Link href="/sound/houses" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Houses</Link>
        <Link href="/for-sound-mixers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For mixers</Link>
        <Link href="/for-sound-designers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For designers</Link>
        <Link href="/awards/craft/sound-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Awards</Link>
      </nav>

      <DepartmentIndex
        title="Sound"
        accent="blue"
        description="Production sound mixers, sound designers, foley artists, dialog editors, re-recording mixers, and supervising sound editors. Every credit cited and confidence-rated."
        stats={[
          { label: 'People in archive', value: totalPeople.toLocaleString() },
          { label: 'Top-credited count', value: topCredits.toLocaleString() },
          { label: 'Roles indexed', value: SOUND_ROLE_SLUGS.length },
          { label: 'Curated dossiers', value: curated.length },
        ]}
        glossary={[
          { term: 'Production Sound Mixer', def: 'On-set recordist. Captures dialog and ambience to multitrack — usually a 32-bit float location bag (Sound Devices 833 / 888) with boom, lavalier, and plant mics.' },
          { term: 'Re-recording Mixer', def: 'Post mixer who balances dialog, music, and effects stems to deliverable: 5.1, 7.1, Atmos. The credit you want for "the mix sounds great."' },
          { term: 'Sound Designer', def: 'Creates the non-dialog, non-music sonic content — Foley supervised, ambience built, weapons / vehicles / creatures designed. Often blurs into supervising sound editor.' },
          { term: 'Foley Artist', def: 'Performs synchronous everyday sounds (footsteps, cloth, props) to picture, on a Foley stage. Credit pairs with Foley Mixer and Foley Editor.' },
          { term: 'Atmos / 5.1 / 7.1', def: 'Final mix delivery formats. Atmos adds height channels and object-based panning over a 7.1.2 / 9.1.4 bed.' },
          { term: 'ADR', def: 'Automated Dialog Replacement — re-recording dialog in a booth to picture when production sound is unusable. Credit appears separately from production mixer.' },
        ]}
        crossCuts={[
          { href: '/ask?q=foley+artist+film+citation+ASC', title: 'Foley artists with attributable credits' },
          { href: '/ask?q=Skywalker+Sound+credits+2020-2024', title: 'Skywalker Sound credits, 2020–2024' },
          { href: '/ask?q=Dolby+Atmos+mix+post-house+credit', title: 'Dolby Atmos mix credits by post-house' },
          { href: '/ask?q=Al+Nelson+supervising+sound+editor', title: 'Al Nelson supervising sound editor credits' },
        ]}
        people={people}
        films={curated}
        allCrewHref="/crew?category=sound"
        vendors={
          soundHouses.length > 0 ? (
            <section className="mb-12">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-zinc-100">
                  Post-houses
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    sound mix + sound design
                  </span>
                </h2>
                <Link href="/films?postHouseKind=sound_mix" className="text-xs text-zinc-400 hover:text-amber-400">
                  All <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div
                tabIndex={0}
                role="region"
                aria-label="Sound post-houses by credit count"
                className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
              >
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-normal">Post-house</th>
                      <th scope="col" className="px-3 py-2 text-left font-normal">Discipline</th>
                      <th scope="col" className="px-3 py-2 text-left font-normal">Location</th>
                      <th scope="col" className="px-3 py-2 text-right font-normal">Productions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soundHouses.map((h) => (
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
            </section>
          ) : null
        }
      />
    </>
  );
}
