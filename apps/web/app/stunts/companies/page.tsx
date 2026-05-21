import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listStuntCompanies } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Stunt Companies',
  description:
    'The working roster of modern action coordination — stunt companies catalogued with primary affiliations, doubling history, and cited credits.',
  alternates: { canonical: `${siteUrl()}/stunts/companies` },
};

export const revalidate = 86400;

export default async function StuntCompaniesIndexPage() {
  const companies = await listStuntCompanies(db);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/stunts/companies'),
          name: 'Stunt Companies — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Stunts · companies"
        title="Stunt Companies"
        accent="red"
        description="Stunt-coordination companies catalogued with primary affiliations, doubling history, and cited credits — the working roster of modern action coordination."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Companies" value={companies.length} />
          </div>
        }
      />

      <nav aria-label="Stunts sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/stunts" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Stunts hub</Link>
        <Link href="/stunts/companies" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Companies</Link>
        <Link href="/stunts/people" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Performers</Link>
        <Link href="/stunts/sequences" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Sequences</Link>
        <Link href="/stunts/rigging" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Rigging</Link>
      </nav>

      {companies.length === 0 ? (
        <p className="text-sm text-zinc-400">No stunt companies indexed yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c: any) => (
            <li key={c.slug}>
              <Link
                href={`/stunts/companies/${c.slug}`}
                className="group block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
              >
                <p className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
                  {c.name}
                </p>
                {c.country && (
                  <p className="mt-1 text-xs text-zinc-400">{c.country}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
