import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db, listProductions, getProductionWithFullDetail, getProductionVfxData, getProductionVideos } from '@bts/db';
import { ProductionDetail } from '@/components/productions/ProductionDetail';
import { fetchTmdbMedia } from '@/lib/tmdb';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const rows = await listProductions(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) return {};
  return { title: data.production.title };
}

export default async function FilmDetailPage({ params }: Props) {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) notFound();

  const [media, vfx, videos] = await Promise.all([
    fetchTmdbMedia(data.production.tmdb_id),
    getProductionVfxData(db, data.production.id),
    getProductionVideos(db, data.production.id),
  ]);

  return <ProductionDetail data={data} media={media} vfx={vfx} videos={videos} />;
}
