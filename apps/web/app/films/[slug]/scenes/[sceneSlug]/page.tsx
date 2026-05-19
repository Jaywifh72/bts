import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  db,
  getClaimsForScene,
  getEvidenceForClaims,
  getSceneWithDetail,
  getSourcesForClaims,
  listSceneStaticParams,
} from '@bts/db';
import { Badge } from '@/components/ui/Badge';
import { CitationMarker } from '@/components/ui/CitationMarker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SourcesList } from '@/components/ui/SourcesList';
import { ProductionClaims } from '@/components/productions/ProductionClaims';
import { CorrectionForm } from '@/components/ui/CorrectionForm';
import {
  JsonLd,
  buildSceneJsonLd,
  buildClaimReviewJsonLd,
  shouldEmitClaimReview,
} from '@/lib/jsonLd';

type Props = {
  params: Promise<{
    slug: string;
    sceneSlug: string;
  }>;
};

function formatRuntime(seconds: number | null): string | null {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

export async function generateStaticParams() {
  return listSceneStaticParams(db);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getSceneWithDetail(db, params.slug, params.sceneSlug);
  if (!data) return {};
  return {
    title: `${data.scene.title} - ${data.production.title}`,
    description: data.scene.synopsis ?? undefined,
    robots: data.production.data_tier === 'imported' ? { index: false, follow: true } : undefined,
  };
}

export default async function SceneDetailPage(props: Props) {
  const params = await props.params;
  const data = await getSceneWithDetail(db, params.slug, params.sceneSlug);
  if (!data) notFound();

  const claims = await getClaimsForScene(db, data.scene.id);
  const visibleClaimIds = claims.slice(0, 12).map((claim) => claim.id);
  const [sourcesByClaimId, evidenceByClaimId] = await Promise.all([
    getSourcesForClaims(db, visibleClaimIds),
    getEvidenceForClaims(db, visibleClaimIds),
  ]);

  const runtime = formatRuntime(data.scene.position_in_runtime_seconds);

  // Phase 3 ClaimReview emission — per-scene. Reuses the already-loaded
  // claims and sourcesByClaimId arrays; no new queries.
  const sceneUrl = `/films/${data.production.slug}/scenes/${data.scene.slug}`;
  const claimReviewJsonLds = claims
    .slice(0, 12)
    .filter((c) => shouldEmitClaimReview(c.status, c.confidence))
    .map((c) => {
      const firstSource = sourcesByClaimId[c.id]?.[0];
      return buildClaimReviewJsonLd({
        claimId: String(c.id),
        pageUrl: sceneUrl,
        claimReviewed: c.statement,
        status: c.status,
        confidence: c.confidence,
        datePublished: (c.updated_at ?? c.created_at).slice(0, 10),
        firstAppearanceUrl: firstSource?.url ?? null,
        firstAppearanceName: firstSource?.title ?? firstSource?.publication ?? null,
      });
    });

  const sceneJsonLd = buildSceneJsonLd({
    productionSlug: data.production.slug,
    productionTitle: data.production.title,
    sceneSlug: data.scene.slug,
    sceneTitle: data.scene.title,
    synopsis: data.scene.synopsis,
    location: data.scene.location,
    timeOfDay: data.scene.time_of_day,
    interiorExterior: data.scene.interior_exterior,
  });

  return (
    <article>
      <JsonLd data={sceneJsonLd} />
      {claimReviewJsonLds.map((cr, i) => (
        <JsonLd key={`claim-review-${i}`} data={cr} />
      ))}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href={`/films/${data.production.slug}`} className="hover:text-amber-400">
          {data.production.title}
        </Link>
        <span className="mx-2">/</span>
        <span>{data.scene.title}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Scene dossier
          {data.production.release_year ? ` / ${data.production.release_year}` : ''}
          {runtime ? ` / ${runtime}` : ''}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{data.scene.title}</h1>
        {data.scene.synopsis && (
          <p className="mt-3 max-w-3xl text-zinc-400">{data.scene.synopsis}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {data.scene.scene_number && <Badge label={`Scene ${data.scene.scene_number}`} variant="category" />}
          {data.scene.interior_exterior && (
            <Badge label={data.scene.interior_exterior.toUpperCase()} variant="category" />
          )}
          {data.scene.time_of_day && (
            <Badge label={label(data.scene.time_of_day)} variant="category" />
          )}
          {data.scene.location && (
            <Badge label={data.scene.location} variant="category" />
          )}
        </div>
        <div className="mt-4">
          <CorrectionForm
            productionSlug={data.production.slug}
            pageUrl={`/films/${data.production.slug}/scenes/${data.scene.slug}`}
          />
        </div>
      </header>

      <section className="mb-8">
        <SectionHeader label="Technical" heading="Scene Equipment" />
        {data.equipment.length === 0 ? (
          <div className="border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
            No scene-specific equipment has been curated yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800 border border-zinc-800 bg-zinc-900/40">
            {data.equipment.map((gear) => (
              <div
                key={gear.equipment_usage_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <Badge label={label(gear.series_category)} variant="category" />
                {gear.setup_label && (
                  <span className="text-xs text-zinc-500">{gear.setup_label}</span>
                )}
                <Link
                  href={`/gear/${gear.manufacturer_slug}/${gear.series_slug}`}
                  className="text-zinc-200 hover:text-amber-400"
                >
                  {gear.manufacturer_name} {gear.series_name}
                </Link>
                {gear.item_slug && gear.item_name && (
                  <>
                    <span className="text-zinc-600">/</span>
                    <Link
                      href={`/gear/${gear.manufacturer_slug}/${gear.series_slug}/${gear.item_slug}`}
                      className="text-zinc-400 hover:text-amber-400"
                    >
                      {gear.item_name}
                    </Link>
                  </>
                )}
                {gear.usage_role && (
                  <span className="text-xs text-zinc-600">{gear.usage_role}</span>
                )}
                <CitationMarker numbers={data.citations.byEquipmentUsage[gear.equipment_usage_id] ?? []} />
                {gear.notes && (
                  <p className="basis-full text-xs text-zinc-500">{gear.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ProductionClaims
        claims={claims}
        sourcesByClaimId={sourcesByClaimId}
        evidenceByClaimId={evidenceByClaimId}
      />

      <SourcesList sources={data.citations.sources} />
    </article>
  );
}
