import type { Metadata } from 'next';
import { db, listCraftDossiers } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { DossierList } from '@/components/dossier/DossierList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Makeup & hair dossiers',
  description: 'Per-production makeup-and-hair deep-dives: prosthetic builds, beauty looks, wig design, aging.',
  alternates: { canonical: `${siteUrl()}/costume-hair-makeup/makeup-works` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listCraftDossiers>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listCraftDossiers(db, { craft: 'makeup-hair' }))]; } catch (e) { console.warn('[makeup-works]', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/costume-hair-makeup/makeup-works'), name: 'Makeup & hair dossiers — CineCanon' }} />
      <PageHero
        eyebrow="Makeup & hair"
        title="Makeup & hair dossiers"
        accent="red"
        description="Per-production deep-dives: prosthetic builds, beauty looks, wig design, aging — and the prosthetic shops that delivered them."
      />
      <DossierList basePath="/dossiers" rows={rows} />
    </>
  );
}
