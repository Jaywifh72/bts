import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  db,
  listProductions,
  getProductionWithFullDetail,
  getProductionVfxData,
  getProductionVideos,
  getCollectionMembers,
  getSimilarProductions,
  getProductionPostHouses,
} from '@bts/db';
import { ProductionDetail } from '@/components/productions/ProductionDetail';
import { JsonLd, buildMovieJsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd';
import { posterUrl } from '@/lib/tmdb-image';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  // Limit to curated tier so we don't pre-generate ~539 dynamic pages.
  const rows = await listProductions(db, { dataTier: 'curated' });
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

  const collectionId = data.production.tmdb_collection_id;
  const [vfx, videos, collectionMembersRaw, similar, postHouses] = await Promise.all([
    getProductionVfxData(db, data.production.id),
    getProductionVideos(db, data.production.id),
    collectionId
      ? getCollectionMembers(db, collectionId, data.production.id)
      : Promise.resolve(null),
    getSimilarProductions(db, data.production.id, 6),
    getProductionPostHouses(db, data.production.id),
  ]);
  const collectionMembers = collectionMembersRaw ?? [];

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
    posterUrl: posterUrl(data.production.poster_path, 'w500'),
    tmdbId: data.production.tmdb_id,
    voteAverage: data.production.vote_average ? Number(data.production.vote_average) : null,
    voteCount: data.production.vote_count,
    genres: data.production.genres ?? undefined,
    runtime: data.production.runtime_minutes,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Studio Pro', path: '/' },
    { name: 'Films', path: '/films' },
    { name: data.production.title, path: `/films/${data.production.slug}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProductionDetail data={data} vfx={vfx} videos={videos} collectionMembers={collectionMembers} similar={similar} postHouses={postHouses} />
    </>
  );
}
