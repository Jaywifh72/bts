import type { Metadata } from 'next';
import { db, listCostumeConstructionHouses } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { FacilityList } from '@/components/facility/FacilityList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Costume construction houses',
  description: 'Western Costume, Cosprop, Tirelli, Angels Costumes — the fabricators who build what designers design.',
  alternates: { canonical: `${siteUrl()}/costume-hair-makeup/construction-houses` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listCostumeConstructionHouses>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listCostumeConstructionHouses(db))]; } catch (e) { console.warn('[ch-construction] missing', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/costume-hair-makeup/construction-houses'), name: 'Costume construction houses — CineCanon' }} />
      <PageHero
        eyebrow="Costume / fabrication"
        title="Costume construction houses"
        accent="red"
        description="The workrooms behind every period drama and superhero suit. Distinct from the costume designer credit — these are the fabricators with the cutters, drapers, breakdown artists, and dye rooms."
      />
      <FacilityList basePath="/costume-hair-makeup/construction-houses" rows={rows} />
    </>
  );
}
