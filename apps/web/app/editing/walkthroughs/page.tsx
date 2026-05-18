import type { Metadata } from 'next';
import { db, listWalkthroughs } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { WalkthroughList } from '@/components/walkthrough/WalkthroughList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Scene-by-scene editing walkthroughs',
  description: 'Shot-by-shot editorial breakdowns of canon scenes: cut timing, beat structure, parallel action, overlap cuts.',
  alternates: { canonical: `${siteUrl()}/editing/walkthroughs` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listWalkthroughs>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listWalkthroughs(db, { kind: 'edit-scene' }))]; } catch (e) { console.warn('[edit-walkthroughs]', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/editing/walkthroughs'), name: 'Edit walkthroughs — CineCanon' }} />
      <PageHero
        eyebrow="Editing"
        title="Scene-by-scene walkthroughs"
        accent="amber"
        description="The cuts that taught a generation. Each walkthrough breaks a canon scene down beat-by-beat: in-points, out-points, parallel action, overlap edits, and what the editor was trying to do."
      />
      <WalkthroughList rows={rows} />
    </>
  );
}
