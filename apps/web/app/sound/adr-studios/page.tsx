import type { Metadata } from 'next';
import { db, listAdrStudios } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { FacilityList } from '@/components/facility/FacilityList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ADR studios',
  description: 'Margarita Mix, Larson Studios, the ADR-specialist rooms behind every dialogue rerecord and loop-group session.',
  alternates: { canonical: `${siteUrl()}/sound/adr-studios` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listAdrStudios>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listAdrStudios(db))]; } catch (e) { console.warn('[adr] missing', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/sound/adr-studios'), name: 'ADR studios — CineCanon' }} />
      <PageHero
        eyebrow="Sound / ADR"
        title="ADR studios"
        accent="blue"
        description="ADR-specialist facilities. Distinct from full post houses — these are the rooms with dedicated cue light, mic chains tuned for dialogue rerecord, and loop-group rosters on speed-dial."
      />
      <FacilityList basePath="/sound/adr-studios" rows={rows} />
    </>
  );
}
