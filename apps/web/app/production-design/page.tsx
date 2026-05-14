import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { CrossCutLink } from '@/components/role/RolePage';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Production design',
  description:
    'Production designers, art directors, set decorators, and property masters — credited and cross-referenced.',
  alternates: { canonical: `${siteUrl()}/production-design` },
};

export const revalidate = 86400;

const ROLE_SLUGS = ['production-designer', 'art-director', 'set-decorator', 'prop-master'];

export default async function ProductionDesignPage() {
  const [people, curated] = await Promise.all([
    listPeople(db, { roleSlugs: ROLE_SLUGS, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/production-design'), name: 'Production design — CineCanon' }} />
      <PageHero
        eyebrow="Department"
        title="Production design"
        accent="emerald"
        description="The world-building department. Designers, art directors, set decorators, property masters — credited and cross-referenced to the productions they built."
      />
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <CrossCutLink href="/ask?q=Dennis+Gassner+production+designer" title="Dennis Gassner filmography" />
          <CrossCutLink href="/ask?q=period+production+design+1970s+aesthetic" title="1970s-period designs" />
          <CrossCutLink href="/ask?q=practical+set+build+features+versus+LED+wall" title="Practical builds vs LED-wall productions" />
          <CrossCutLink href="/ask?q=Jack+Fisk+Malick" title="Jack Fisk × Malick collaboration" />
        </ul>
      </section>
      {people.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-cited designers</h2>
            <Link href="/crew?category=art" className="text-xs text-zinc-500 hover:text-amber-400">All art →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-emerald-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Production design'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {curated.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Curated dossiers</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {curated.map((f) => (
              <li key={f.slug}>
                <Link href={`/films/${f.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-emerald-700/60">
                  <p className="font-serif text-base text-zinc-100">{f.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{f.release_year}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
