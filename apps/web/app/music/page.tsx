import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { CrossCutLink } from '@/components/role/RolePage';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Music',
  description: 'Composers, music supervisors, and orchestrators — credited and cross-referenced.',
  alternates: { canonical: `${siteUrl()}/music` },
};

export const revalidate = 86400;

export default async function MusicPage() {
  const [composers, curated] = await Promise.all([
    listPeople(db, { category: 'music', sort: 'credits', withCreditsOnly: true, limit: 15 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/music'), name: 'Music — CineCanon' }} />
      <PageHero
        eyebrow="Department"
        title="Music"
        accent="amber"
        description="Composers and music supervisors. The score, the licensed cue, and the diegetic source — credited and cross-referenced."
      />
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <CrossCutLink href="/ask?q=Hans+Zimmer+films+citations" title="Hans Zimmer filmography" />
          <CrossCutLink href="/ask?q=Mica+Levi+composer+features" title="Mica Levi feature scores" />
          <CrossCutLink href="/ask?q=Daniel+Blumberg+The+Brutalist+score" title="Daniel Blumberg, The Brutalist" />
          <CrossCutLink href="/ask?q=Carter+Burwell+Coen+collaborator" title="Carter Burwell × Coen filmography" />
        </ul>
      </section>
      {composers.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-cited composers</h2>
            <Link href="/crew?category=music" className="text-xs text-zinc-500 hover:text-amber-400">All music →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {composers.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Composer'}</p>
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
                <Link href={`/films/${f.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
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
