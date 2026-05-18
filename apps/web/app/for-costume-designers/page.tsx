import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Costume Designers',
  description:
    'Reference for costume designers — credited filmographies and the Costume Designers Guild + AMPAS Best Costume Design recognition record.',
  alternates: { canonical: `${siteUrl()}/for-costume-designers` },
};

export const revalidate = 86400;

const COSTUME_ROLES = ['costume-designer'];

export default async function ForCostumeDesignersPage() {
  const [topCDs, curated] = await Promise.all([
    listPeople(db, { roleSlugs: COSTUME_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Costume Designers"
      description="Costume designers. Credited filmographies + the Costume Designers Guild and AMPAS Best Costume Design recognition record."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/costume-hair-makeup/designers" title="Designer index" desc="Every credited costume designer in the archive, ranked by curated-film credit count." />
            <ToolTile href="/awards/craft/costume-design" title="Costume awards" desc="Cross-cut AMPAS + BAFTA + CDG Award recognition." />
            <ToolTile href="/ask" title="Ask anything" desc="CD questions: 'Sandy Powell filmography', 'period CDs 2020-2024', 'CD × director recurring pairs'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=Sandy+Powell+filmography" title="Sandy Powell filmography" />
            <CrossCutLink href="/ask?q=costume+designer+period+drama+2020-2024" title="Period-drama costume designers, 2020–2024" />
            <CrossCutLink href="/ask?q=CDG+award+winner" title="Costume Designers Guild winners" />
            <CrossCutLink href="/ask?q=Ruth+Carter+Black+Panther" title="Ruth Carter — Black Panther costume design" />
          </ul>
        </section>
      }
      peopleBlock={
        topCDs.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited costume designers</h2>
              <Link href="/costume-hair-makeup/designers" className="text-xs text-zinc-400 hover:text-amber-400">All →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topCDs.map((p) => (
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
