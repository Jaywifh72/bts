import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { CrossCutLink } from '@/components/role/RolePage';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Costume, hair, makeup',
  description: 'Costume designers, hair department heads, makeup department heads — credited and cross-referenced.',
  alternates: { canonical: `${siteUrl()}/costume-hair-makeup` },
};

export const revalidate = 86400;

const ROLE_SLUGS = ['costume-designer', 'hair-dept-head', 'makeup-dept-head', 'makeup-effects-supervisor'];

export default async function CostumeHairMakeupPage() {
  const people = await listPeople(db, { roleSlugs: ROLE_SLUGS, sort: 'credits', withCreditsOnly: true, limit: 15 });

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/costume-hair-makeup'), name: 'Costume, hair, makeup — Studio Pro' }} />
      <PageHero
        eyebrow="Department"
        title="Costume, hair, makeup"
        accent="red"
        description="The departments that turn an actor into a character. Costume designers, hair-department heads, makeup-department heads, prosthetic supervisors — credited."
      />
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <CrossCutLink href="/ask?q=Sandy+Powell+costume+designer" title="Sandy Powell filmography" />
          <CrossCutLink href="/ask?q=Ruth+Carter+costume+work" title="Ruth Carter costume work" />
          <CrossCutLink href="/ask?q=prosthetic+effects+supervisor+actor+transformation" title="Prosthetic transformations" />
          <CrossCutLink href="/ask?q=period+costume+design+18th+century" title="18th-century period costume" />
        </ul>
      </section>
      {people.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-cited costume / hair / makeup</h2>
            <Link href="/crew" className="text-xs text-zinc-500 hover:text-amber-400">All crew →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Costume'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
