import type { Metadata } from 'next';
import { db, listWalkthroughs } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { WalkthroughList } from '@/components/walkthrough/WalkthroughList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cue listening guides',
  description: 'Timestamped listening guides to canon score cues: entrance maps, orchestration tells, harmonic moves.',
  alternates: { canonical: `${siteUrl()}/music/cue-guides` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listWalkthroughs>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listWalkthroughs(db, { kind: 'music-cue' }))]; } catch (e) { console.warn('[cue-guides]', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/music/cue-guides'), name: 'Cue listening guides — CineCanon' }} />
      <PageHero
        eyebrow="Music"
        title="Cue listening guides"
        accent="amber"
        description="Listen with the score. Each guide breaks a single cue down by timestamp — entrance map, orchestration, harmonic moves, where the picture turns."
      />
      <WalkthroughList rows={rows} />
    </>
  );
}
