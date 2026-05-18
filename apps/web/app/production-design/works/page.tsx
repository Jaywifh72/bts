import type { Metadata } from 'next';
import { db, listCraftDossiers } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { DossierList } from '@/components/dossier/DossierList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Production design dossiers',
  description: 'Per-production deep-dives on the world-building decisions: sets, palette, scale, references the team consulted.',
  alternates: { canonical: `${siteUrl()}/production-design/works` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listCraftDossiers>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listCraftDossiers(db, { craft: 'pd' }))]; } catch (e) { console.warn('[pd-works]', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/production-design/works'), name: 'PD dossiers — CineCanon' }} />
      <PageHero
        eyebrow="Production design"
        title="World-building dossiers"
        accent="amber"
        description="Per-production deep-dives on the decisions that built each world: sets, palette, scale, the references the team consulted, the supporting departments."
      />
      <DossierList basePath="/dossiers" rows={rows} />
    </>
  );
}
