import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Music Supervisors',
  description:
    'Reference for music supervisors — credited filmographies, licensed-cue lineage, and the Guild of Music Supervisors award record. The cited counterpart to the composer side of the music department.',
  alternates: { canonical: `${siteUrl()}/for-music-supervisors` },
};

export const revalidate = 86400;

const SUPERVISOR_ROLES = ['music-supervisor'];

export default async function ForMusicSupervisorsPage() {
  const [topSupervisors, curated] = await Promise.all([
    listPeople(db, { roleSlugs: SUPERVISOR_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Music Supervisors"
      description="Music supervisors. The licensed-song side of the music department — needle drops, clearance, festival soundtracks, source music. The cited counterpart to the composer-driven score."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/music/supervisors" title="Supervisor index" desc="Every credited music supervisor in the archive, ranked by curated-film credit count." />
            <ToolTile href="/awards/craft/music-supervision" title="Music supervision awards" desc="Guild of Music Supervisors Awards — categorized cross-cut of who got recognized for what." />
            <ToolTile href="/ask" title="Ask anything" desc="Supervisor questions: 'A24 supervisors recurring credits', 'needle-drop heavy 2024 features', 'supervisors → music-side credit pairs'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=music+supervisor+A24+credits" title="Music supervisors on A24 features" />
            <CrossCutLink href="/ask?q=Randall+Poster+filmography" title="Randall Poster — Scorsese / Anderson supervisor filmography" />
            <CrossCutLink href="/ask?q=music+supervisor+nominated+GMS+awards" title="GMS-nominated music supervisors, last five cycles" />
            <CrossCutLink href="/ask?q=needle+drop+heavy+feature+2023-2024" title="Needle-drop heavy features, 2023–2024" />
          </ul>
        </section>
      }
      peopleBlock={
        topSupervisors.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited music supervisors</h2>
              <Link href="/music/supervisors" className="text-xs text-zinc-400 hover:text-amber-400">All supervisors →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topSupervisors.map((p) => (
                <li key={p.slug}>
                  <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
      dossierBlock={
        curated.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Recently curated dossiers</h2>
              <Link href="/films?tier=curated" className="text-xs text-zinc-400 hover:text-amber-400">All curated →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {curated.map((f) => (
                <li key={f.slug}>
                  <Link href={`/films/${f.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{f.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{f.release_year}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
