import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { CrossCutLink } from '@/components/role/RolePage';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Editing',
  description:
    'Editors and their assistants. The department that shapes the final cut — credited and cross-referenced to the productions they cut.',
  alternates: { canonical: `${siteUrl()}/editing` },
};

export const revalidate = 86400;

const EDITING_ROLE_SLUGS = ['editor', 'first-assistant-editor', 'dialog-editor', 'music-editor'];

export default async function EditingPage() {
  const [people, curated] = await Promise.all([
    listPeople(db, { roleSlugs: EDITING_ROLE_SLUGS, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/editing'),
          name: 'Editing — Studio Pro',
        }}
      />
      <PageHero
        eyebrow="Department"
        title="Editing"
        accent="purple"
        description="The cutting room. Editors and their assistants — credited and cross-referenced to every production they shaped."
      />
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <CrossCutLink href="/ask?q=Thelma+Schoonmaker+editor+credits" title="Thelma Schoonmaker filmography" />
          <CrossCutLink href="/ask?q=long+take+films+editor+credit" title="Long-take features by editor" />
          <CrossCutLink href="/ask?q=Sean+Baker+editor+film" title="Sean Baker editor-credit films" />
          <CrossCutLink href="/ask?q=Eddie+Hamilton+action+editing" title="Eddie Hamilton — action editing" />
        </ul>
      </section>
      {people.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-cited editors</h2>
            <Link href="/crew?category=post" className="text-xs text-zinc-500 hover:text-amber-400">All post →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-purple-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Editor'}</p>
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
                <Link href={`/films/${f.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-purple-700/60">
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
