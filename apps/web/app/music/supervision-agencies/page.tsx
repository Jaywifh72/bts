import type { Metadata } from 'next';
import { db, listMusicSupervisionAgencies } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { FacilityList } from '@/components/facility/FacilityList';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Music supervision agencies',
  description: 'Format Entertainment, Bonfire, Loudhouse, Manners McDade — the agencies who choose the needle drops and clear the rights.',
  alternates: { canonical: `${siteUrl()}/music/supervision-agencies` },
};

export default async function Page() {
  type Row = Awaited<ReturnType<typeof listMusicSupervisionAgencies>>[number];
  let rows: Row[] = [];
  try { rows = [...(await listMusicSupervisionAgencies(db))]; } catch (e) { console.warn('[music-sup] missing', e); }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/music/supervision-agencies'), name: 'Music supervision agencies — CineCanon' }} />
      <PageHero
        eyebrow="Music / supervision"
        title="Music supervision agencies"
        accent="amber"
        description="Source music supervisors find, clear, and place every needle drop. The agencies behind the trailers that broke a song, the montages that made a film, and the closing credits that haunt you on the drive home."
      />
      <FacilityList basePath="/music/supervision-agencies" rows={rows} />
    </>
  );
}
