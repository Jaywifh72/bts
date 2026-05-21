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
  getProductionScoringStages,
  getScoreWorksForProduction,
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
import {
  JsonLd,
  buildMovieJsonLd,
  buildBreadcrumbJsonLd,
  buildClaimReviewJsonLd,
  shouldEmitClaimReview,
} from '@/lib/jsonLd';
import { posterUrl } from '@/lib/tmdb-image';
import { truncateForMeta } from '@/lib/truncate-meta';

interface Props {
  params: Promise<{ slug: string }>;
}

// QA — film details change slowly (re-curate every few days at most);
// daily revalidation is plenty. Non-curated slugs render dynamically
// on first miss, then cache for 24h.
export const revalidate = 86400;

export async function generateStaticParams() {
  // Deploy-budget refactor: pre-render only the curated tier (~hand-seeded
  // dossiers) at build. Imported / long-tail productions render on first
  // visit and cache via ISR (`revalidate = 86400`).
  //
  // Why: building every row fans out ~30 pages × ~19 parallel queries
  // each, which exhausts free-tier Postgres connection pools (Neon free
  // = 100, local Docker = 100). The curated subset is what readers
  // actually hit most often — the long tail gets warmed on demand.
  //
  // To revert to "pre-render every row", change to `listProductions(db)`
  // and ensure your DATABASE_URL points at a pgbouncer / pooled
  // connection that can absorb the build's concurrency.
  const rows = await listProductions(db, { dataTier: 'curated', limit: 2000 });
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
  // QA 2026-05-20: TMDb overviews routinely run 250–400 chars and Google
  // truncates around 160. Cap at 155 on a sentence/word boundary so we
  // stop shipping bloated descriptions to AI summarizers.
  const description = truncateForMeta(production.synopsis, 155);
  return {
    title: production.title,
    description,
    openGraph: {
      title: production.title,
      description,
      type: 'video.movie',
      ...(production.release_year ? { releaseDate: String(production.release_year) } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: production.title,
      description,
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
  const [vfx, videos, collectionMembersRaw, similar, postHouses, scoringStages, scoreWorks, keyFrames, citations, awards, confidence, semanticSimilar, locations, lightingSetups, colorPipelines, claims, videoTimestamps, stuntSequences, stuntDoubling, stuntCompanies, stuntCrew] = await Promise.all([
    getProductionVfxData(db, data.production.id),
    getProductionVideos(db, data.production.id),
    collectionId
      ? getCollectionMembers(db, collectionId, data.production.id)
      : Promise.resolve(null),
    getSimilarProductions(db, data.production.id, 6),
    getProductionPostHouses(db, data.production.id),
    getProductionScoringStages(db, data.production.id),
    getScoreWorksForProduction(db, data.production.id),
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

  // CineCanon-Sentinel ClaimReview emission. Uses the same 12-claim
  // window as visibleClaimIds so structured data matches the on-page
  // presentation. Filter via shouldEmitClaimReview before building so
  // we never emit low-confidence claims as Schema.org-verified.
  const claimReviewJsonLds = claims
    .slice(0, 12)
    .filter((claim) => shouldEmitClaimReview(claim.status, claim.confidence))
    .map((claim) => {
      const firstSource = sourcesByClaimId[claim.id]?.[0];
      return buildClaimReviewJsonLd({
        claimId: String(claim.id),
        pageUrl: `/films/${data.production.slug}`,
        claimReviewed: claim.statement,
        status: claim.status,
        confidence: claim.confidence,
        datePublished: (claim.updated_at ?? claim.created_at).slice(0, 10),
        firstAppearanceUrl: firstSource?.url ?? null,
        firstAppearanceName: firstSource?.title ?? firstSource?.publication ?? null,
      });
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
      {claimReviewJsonLds.map((cr, i) => (
        <JsonLd key={`claim-review-${i}`} data={cr} />
      ))}
      <ProductionDetail data={data} vfx={vfx} videos={videos} videoTimestamps={videoTimestamps} collectionMembers={collectionMembers} similar={similar} postHouses={postHouses} scoringStages={scoringStages} scoreWorks={scoreWorks} keyFrames={keyFrames} citations={citations} awards={awards} confidence={confidence} semanticSimilar={semanticSimilar} locations={locations} lightingSetups={lightingSetups} colorPipelines={colorPipelines} claims={claims} sourcesByClaimId={sourcesByClaimId} evidenceByClaimId={evidenceByClaimId} stuntSequences={stuntSequences} stuntDoubling={stuntDoubling} stuntCompanies={stuntCompanies} stuntCrew={stuntCrew} similarShots={similarShots} />
    </>
  );
}
