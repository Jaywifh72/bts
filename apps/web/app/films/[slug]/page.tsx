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
  getProductionKeyFrames,
  getProductionCitations,
  getProductionAwards,
  getProductionConfidence,
  getSemanticallySimilar,
  getProductionLocations,
  getProductionLightingSetups,
  getProductionColorPipelines,
  listStuntSequencesForProduction,
  getDoublingCreditsForProduction,
  getStuntCompaniesForProduction,
  getStuntCrewForProduction,
  getClaimsForProduction,
  getSourcesForClaims,
  getEvidenceForClaims,
  listVideoTimestampAnnotationsForProduction,
  getSimilarKeyFramesForProduction,
} from '@bts/db';
import { ProductionDetail } from '@/components/productions/ProductionDetail';
import { JsonLd, buildMovieJsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd';
import { posterUrl } from '@/lib/tmdb-image';

interface Props {
  params: Promise<{ slug: string }>;
}

// QA — film details change slowly (re-curate every few days at most);
// daily revalidation is plenty. Non-curated slugs render dynamically
// on first miss, then cache for 24h.
export const revalidate = 86400;

export async function generateStaticParams() {
  // Pre-render EVERY production at build. Cold-page-on-first-visit was the
  // measurable spike-day failure mode: each cold film page fires ~19 parallel
  // queries + TMDb image fetch. Pre-rendering at build time pushes that cost
  // off the request path. With `revalidate = 86400` the build artifact only
  // stays stale for a day before ISR re-renders it.
  //
  // If the catalog grows beyond ~5,000 productions and build time becomes
  // an issue, revert to curated-only + warm imported on first visit.
  const rows = await listProductions(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) return {};
  const { production } = data;
  // E-39 — oEmbed autodiscovery. Notion / Slack / Discord / Linear scan
  // for `<link rel="alternate" type="application/json+oembed">` and
  // hit /oembed?url=<page> to fetch the card payload.
  const pageUrl = `/films/${production.slug}`;
  return {
    title: production.title,
    description: production.synopsis ?? undefined,
    openGraph: {
      title: production.title,
      description: production.synopsis ?? undefined,
      type: 'video.movie',
      ...(production.release_year ? { releaseDate: String(production.release_year) } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: production.title,
      description: production.synopsis ?? undefined,
    },
    alternates: {
      canonical: pageUrl,
      types: {
        'application/json+oembed': `/oembed?url=${encodeURIComponent(pageUrl)}`,
      },
    },
  };
}

export default async function FilmDetailPage(props: Props) {
  const params = await props.params;
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) notFound();

  const collectionId = data.production.tmdb_collection_id;
  const [vfx, videos, collectionMembersRaw, similar, postHouses, keyFrames, citations, awards, confidence, semanticSimilar, locations, lightingSetups, colorPipelines, claims, videoTimestamps, stuntSequences, stuntDoubling, stuntCompanies, stuntCrew] = await Promise.all([
    getProductionVfxData(db, data.production.id),
    getProductionVideos(db, data.production.id),
    collectionId
      ? getCollectionMembers(db, collectionId, data.production.id)
      : Promise.resolve(null),
    getSimilarProductions(db, data.production.id, 6),
    getProductionPostHouses(db, data.production.id),
    getProductionKeyFrames(db, data.production.id),
    getProductionCitations(db, data.production.id),
    getProductionAwards(db, data.production.id),
    getProductionConfidence(db, data.production.id),
    getSemanticallySimilar(db, data.production.id, 6),
    getProductionLocations(db, data.production.id),
    getProductionLightingSetups(db, data.production.id),
    getProductionColorPipelines(db, data.production.id),
    getClaimsForProduction(db, data.production.id),
    listVideoTimestampAnnotationsForProduction(db, data.production.id),
    listStuntSequencesForProduction(db, data.production.id),
    getDoublingCreditsForProduction(db, data.production.id),
    getStuntCompaniesForProduction(db, data.production.id),
    getStuntCrewForProduction(db, data.production.id),
  ]);
  // UX-audit second pass — visually-similar shots from other films,
  // pivoting off this production's representative keyframe. Returns
  // empty when no embeddings are populated; the rail self-hides.
  const similarShots = await getSimilarKeyFramesForProduction(db, data.production.slug, 8);
  const collectionMembers = collectionMembersRaw ?? [];
  const visibleClaimIds = claims.slice(0, 12).map((claim) => claim.id);
  const [sourcesByClaimId, evidenceByClaimId] = await Promise.all([
    getSourcesForClaims(db, visibleClaimIds),
    getEvidenceForClaims(db, visibleClaimIds),
  ]);

  // Pull directors out of crew for the JSON-LD director list
  const directors = data.crew
    .filter((c) => c.role_slug === 'director')
    .map((c) => ({ name: c.credit_name_override ?? c.display_name, slug: c.person_slug }));

  // E-41 — surface camera-dept crew as Movie.contributor. Limit to
  // category=camera so the JSON-LD doesn't drown in 50+ names per film.
  const contributors = data.crew
    .filter((c) => c.role_category === 'camera')
    .slice(0, 25)
    .map((c) => ({
      name: c.credit_name_override ?? c.display_name,
      slug: c.person_slug,
      role: c.role_name,
    }));

  const productionCompanies = data.studios
    .filter((s) => s.role === 'production_company')
    .map((s) => ({ name: s.name }));
  const distributors = data.studios
    .filter((s) => s.role === 'distributor')
    .map((s) => ({ name: s.name }));

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
    productionCompanies,
    distributors,
    contributors,
    citations: citations.sources.slice(0, 30)
      .filter((c): c is typeof c & { url: string } => c.url !== null)
      .map((c) => ({
        title: c.title,
        url: c.url,
        publisher: c.publication,
      })),
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'CineCanon', path: '/' },
    { name: 'Films', path: '/films' },
    { name: data.production.title, path: `/films/${data.production.slug}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProductionDetail data={data} vfx={vfx} videos={videos} videoTimestamps={videoTimestamps} collectionMembers={collectionMembers} similar={similar} postHouses={postHouses} keyFrames={keyFrames} citations={citations} awards={awards} confidence={confidence} semanticSimilar={semanticSimilar} locations={locations} lightingSetups={lightingSetups} colorPipelines={colorPipelines} claims={claims} sourcesByClaimId={sourcesByClaimId} evidenceByClaimId={evidenceByClaimId} stuntSequences={stuntSequences} stuntDoubling={stuntDoubling} stuntCompanies={stuntCompanies} stuntCrew={stuntCrew} similarShots={similarShots} />
    </>
  );
}
