import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Production Designers',
  description:
    'Reference for production designers, art directors, set decorators, and prop masters — credited filmographies and the ADG award lineage.',
  alternates: { canonical: `${siteUrl()}/for-production-designers` },
};

export const revalidate = 86400;

const PD_ROLES = ['production-designer', 'art-director', 'set-decorator', 'prop-master'];

export default async function ForProductionDesignersPage() {
  const [topPDs, curated] = await Promise.all([
    listPeople(db, { roleSlugs: PD_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Production Designers"
      description="Production designers, art directors, set decorators, and prop masters. The world-building craft — credited filmographies + the Art Directors Guild recognition record."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/production-design/designers" title="Designer index" desc="Every production designer + art director in the archive, ranked by credit count." />
            <ToolTile href="/awards/craft/production-design" title="PD awards" desc="Cross-cut AMPAS Best Production Design + ADG awards + BAFTA — every cited recognition." />
            <ToolTile href="/awards/craft/art-direction" title="Art Direction (legacy)" desc="Pre-2013 Oscar lineage of Production Design — useful for canonical comparisons." />
            <ToolTile href="/ask" title="Ask anything" desc="PD questions: 'Mark Bridges × PTA filmography', 'practical-set features 2024', 'PD × DP recurring pairs'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=Adam+Stockhausen+Wes+Anderson" title="Adam Stockhausen × Wes Anderson filmography" />
            <CrossCutLink href="/ask?q=production+designer+sci-fi+world+building" title="PDs who specialize in sci-fi world-building" />
            <CrossCutLink href="/ask?q=ADG+winner+2020-2024" title="ADG Awards winners, 2020–2024" />
            <CrossCutLink href="/ask?q=set+decorator+Oscar+nominated" title="Set decorators nominated at AMPAS" />
          </ul>
        </section>
      }
      peopleBlock={
        topPDs.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited production designers</h2>
              <Link href="/production-design/designers" className="text-xs text-zinc-400 hover:text-amber-400">All →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topPDs.map((p) => (
                <li key={p.slug}>
                  <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Production design'}</p>
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
