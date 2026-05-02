import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  db,
  listProductions,
  getProductionWithFullDetail,
  getProductionVfxData,
  getProductionVideos,
} from '@bts/db';
import { ProductionDetail } from '@/components/productions/ProductionDetail';
import { fetchTmdbMedia } from '@/lib/tmdb';
import { JsonLd, buildMovieJsonLd } from '@/lib/jsonLd';

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
  const { production } = data;
  return {
    title: production.title,
    description: production.synopsis ?? undefined,
    openGraph: {
      title: production.title,
      description: production.synopsis ?? undefined,
      type: 'video.movie',
      ...(production.release_year ? { releaseDate: String(production.release_year) } : {}),
    },
  };
}

export default async function FilmDetailPage({ params }: Props) {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) notFound();

  const [media, vfx, videos] = await Promise.all([
    fetchTmdbMedia(data.production.tmdb_id),
    getProductionVfxData(db, data.production.id),
    getProductionVideos(db, data.production.id),
  ]);

  // Pull directors out of crew for the JSON-LD director list
  const directors = data.crew
    .filter((c) => c.role_slug === 'director')
    .map((c) => ({ name: c.credit_name_override ?? c.display_name, slug: c.person_slug }));

  const jsonLd = buildMovieJsonLd({
    slug: data.production.slug,
    title: data.production.title,
    originalTitle: data.production.original_title,
    releaseYear: data.production.release_year,
    synopsis: data.production.synopsis,
    directors,
    posterUrl: media?.poster ?? null,
    tmdbId: data.production.tmdb_id,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductionDetail data={data} media={media} vfx={vfx} videos={videos} />
    </>
  );
}
