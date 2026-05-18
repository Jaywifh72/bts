import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listProductions } from '@bts/db';
import { DepartmentIndex } from '@/components/role/DepartmentIndex';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Production design',
  description: 'Production designers, art directors, set decorators, and property masters — credited and cross-referenced.',
  alternates: { canonical: `${siteUrl()}/production-design` },
};

export const revalidate = 86400;

const ROLE_SLUGS = ['production-designer', 'art-director', 'set-decorator', 'prop-master'];

export default async function ProductionDesignPage() {
  const [people, totalPeople, curated] = await Promise.all([
    listPeople(db, { roleSlugs: ROLE_SLUGS, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    countPeople(db, { roleSlugs: ROLE_SLUGS, withCreditsOnly: true }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  const topCredits = people[0]?.credit_count ?? 0;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/production-design'), name: 'Production design — CineCanon' }} />

      <nav aria-label="Production design sub-disciplines" className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-[10px] uppercase tracking-widest text-zinc-500">Drill into</span>
        <Link href="/production-design/designers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Designers + art dept</Link>
        <Link href="/production-design/works" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">PD dossiers</Link>
        <Link href="/for-production-designers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For designers</Link>
        <Link href="/awards/craft/production-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">PD awards</Link>
        <Link href="/awards/craft/art-direction" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Art-direction (legacy)</Link>
      </nav>

      <DepartmentIndex
        title="Production design"
        accent="emerald"
        description="The world-building department. Designers, art directors, set decorators, property masters — credited and cross-referenced to the productions they built."
        stats={[
          { label: 'People in archive', value: totalPeople.toLocaleString() },
          { label: 'Top-credited count', value: topCredits.toLocaleString() },
          { label: 'Roles indexed', value: ROLE_SLUGS.length },
          { label: 'Curated dossiers', value: curated.length },
        ]}
        glossary={[
          { term: 'Production Designer', def: 'Single credit responsible for the overall visual world: sets, locations, props, period research. Works directly with the director and DP.' },
          { term: 'Art Director', def: 'Production designer\'s number two. Runs the art department day-to-day; supervises construction, set decoration, and the standby art team.' },
          { term: 'Set Decorator', def: 'Dresses the set within the designed world — furniture, drapes, dressing props. Distinct credit; pairs with the designer\'s overall vision.' },
          { term: 'Property Master', def: 'Owns everything a character touches or carries (hero props, action props, weapons, breakaways). Separate from set dressing.' },
          { term: 'Practical build vs LED wall', def: 'Practical = physical sets on a stage. LED-wall (Volume) = real-time virtual backgrounds (The Mandalorian). Credit set still goes to the PD; volume content has its own VFX team.' },
        ]}
        crossCuts={[
          { href: '/ask?q=Dennis+Gassner+production+designer', title: 'Dennis Gassner filmography' },
          { href: '/ask?q=period+production+design+1970s+aesthetic', title: '1970s-period designs' },
          { href: '/ask?q=practical+set+build+features+versus+LED+wall', title: 'Practical builds vs LED-wall productions' },
          { href: '/ask?q=Jack+Fisk+Malick', title: 'Jack Fisk × Malick collaboration' },
        ]}
        people={people}
        films={curated}
        allCrewHref="/crew?category=art"
      />
    </>
  );
}
