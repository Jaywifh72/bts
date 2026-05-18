import type { Metadata } from 'next';
import { db, listWalkthroughs } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { WalkthroughList } from '@/components/walkthrough/WalkthroughList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VFX shot breakdowns',
  description: 'Per-shot anatomy: what was practical, what was CG, what was composited — and how the vendors layered it.',
  alternates: { canonical: `${siteUrl()}/vfx/shot-breakdowns` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listWalkthroughs>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listWalkthroughs(db, { kind: 'vfx-shot' }))]; } catch (e) { console.warn('[vfx-breakdowns]', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/vfx/shot-breakdowns'), name: 'VFX shot breakdowns — CineCanon' }} />
      <PageHero
        eyebrow="VFX"
        title="Practical / CG shot breakdowns"
        accent="amber"
        description="Per-shot anatomy of hero VFX moments: what was shot on stage, what was CG, what was matte, what was a comp — and how each layer was built."
      />
      <WalkthroughList rows={rows} />
    </>
  );
}
