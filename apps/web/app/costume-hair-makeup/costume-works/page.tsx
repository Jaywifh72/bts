import type { Metadata } from 'next';
import { db, listCraftDossiers } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { DossierList } from '@/components/dossier/DossierList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Costume dossiers',
  description: 'Per-production costume design deep-dives: silhouette decisions, fabric, breakdown, the workrooms that built it.',
  alternates: { canonical: `${siteUrl()}/costume-hair-makeup/costume-works` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listCraftDossiers>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listCraftDossiers(db, { craft: 'costume' }))]; } catch (e) { console.warn('[costume-works]', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/costume-hair-makeup/costume-works'), name: 'Costume dossiers — CineCanon' }} />
      <PageHero
        eyebrow="Costume"
        title="Costume dossiers"
        accent="red"
        description="Per-production costume design deep-dives: silhouette decisions, fabric and palette, breakdown / aging, the workrooms that built it."
      />
      <DossierList basePath="/dossiers" rows={rows} />
    </>
  );
}
