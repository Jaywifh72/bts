import type { Metadata } from 'next';
import Link from 'next/link';
import { db, findFeaturesShotOnAlexa65WithSphero } from '@bts/db';
import { KillerQueryTable } from '@/components/queries/KillerQueryTable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { JsonLd } from '@/lib/jsonLd';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Films shot on ARRI ALEXA 65 + Panavision Sphero lenses',
  description: 'Every feature shot on the ARRI ALEXA 65 paired with Panavision Sphero anamorphic lenses — cited gear pairings across the archive.',
  alternates: { canonical: '/queries/alexa65-sphero' },
};

export default async function Alexa65SpheroPage() {
  const rows = await findFeaturesShotOnAlexa65WithSphero(db);

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        '@id': absoluteUrl('/queries/alexa65-sphero'),
        url: absoluteUrl('/queries/alexa65-sphero'),
        headline: 'Films shot on ARRI ALEXA 65 + Panavision Sphero lenses',
        author: { '@type': 'Organization', name: 'CineCanon', url: absoluteUrl('/') },
        publisher: { '@type': 'Organization', name: 'CineCanon', url: absoluteUrl('/') },
      }} />
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Killer Query</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">
          ALEXA 65 + Panavision Sphero Anamorphic
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every theatrical feature shot on the ARRI ALEXA 65 with Panavision Sphero
          anamorphic lenses, sorted by Director of Photography.
        </p>
      </div>
      <SectionHeader label={`${rows.length} result${rows.length !== 1 ? 's' : ''}`} heading="" />
      <KillerQueryTable
        rows={rows}
        columns={[
          {
            key: 'title',
            header: 'Production',
            render: (row) => (
              <Link href={`/films/${row.slug}`} className="text-zinc-200 hover:text-amber-400">
                {row.title}
              </Link>
            ),
          },
          {
            key: 'release_year',
            header: 'Year',
            render: (row) => (
              <span className="tabular-nums text-zinc-400">{String(row.release_year ?? '—')}</span>
            ),
          },
          {
            key: 'dp_name',
            header: 'Director of Photography',
            render: (row) => (
              <Link href={`/crew/${row.dp_slug}`} className="text-zinc-200 hover:text-amber-400">
                {row.dp_name}
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
