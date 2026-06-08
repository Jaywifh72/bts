import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { getProductionWithFullDetail, getProductionVfxData } from '@bts/db';
import type { ClaimRow, ClaimSourceRow, EvidenceItem, VideoTimestampAnnotation, getProductionVideos } from '@bts/db';

// SEO QC 2026-06-08 — VideoGallery is the only sizable client component
// on /films/[slug] (284 lines + useState + memo). Defer its hydration so
// it doesn't compete with the LCP element for main-thread time during
// page load. The server still renders the section markup; just the JS
// payload arrives after the page is interactive.
const VideoGallery = dynamic(() => import('./VideoGallery').then((m) => ({ default: m.VideoGallery })), {
  loading: () => <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500 italic">Loading videos…</div>,
});
import { FormatBadge } from './FormatBadge';
// MediaGallery is intentionally not imported here — the call site below was
// passing backdropPaths={[]} which always rendered null. Wiring the real
// production.backdrop_paths in is a future task. The component itself is kept
// at ./MediaGallery for that future wiring.
import { SceneList } from './SceneList';
import { VfxSection } from './VfxSection';
import { TechPanel } from './TechPanel';
import { ReleaseDates } from './ReleaseDates';
import { KeyFramesGallery } from './KeyFramesGallery';
import { AwardsList } from './AwardsList';
import { EntityProvenanceFooter } from '@/components/ui/EntityProvenanceFooter';
import { ProductionLocations } from './ProductionLocations';
import type { KeyFrame, ProductionAward, ProductionLocation, LightingSetup, ColorPipelineRow, StuntSequenceRow, ProductionDoublingRow, ProductionStuntCompanyRow, ProductionStuntCrewRow } from '@bts/db';
import { LightingSetupsList } from './LightingSetupsList';
import { ColorPipelineList } from './ColorPipelineList';
import { StuntSequencesList } from './StuntSequencesList';
import { ProductionClaims } from './ProductionClaims';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { craftFromAward, getCraft, type CraftSlug } from '@/lib/awards/crafts';
import { SourcesList } from '@/components/ui/SourcesList';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { posterUrl, backdropUrl } from '@/lib/tmdb-image';
import { departmentLabel } from '@/lib/department-labels';
import { PageTOC } from '@/components/ui/PageTOC';

type DetailData = NonNullable<Awaited<ReturnType<typeof getProductionWithFullDetail>>>;
type VfxData = Awaited<ReturnType<typeof getProductionVfxData>>;
type VideosData = Awaited<ReturnType<typeof getProductionVideos>>;
// Plain row array type — drops the postgres-js RowList ResultQueryMeta wrapper
// so callers can pass a literal [] without a type acrobatics.
type CollectionMember = {
  slug: string;
  title: string;
  release_year: number | null;
  poster_path: string | null;
};

type SimilarProduction = CollectionMember & {
  score: number;
  reason: string;
};

type SemanticSimilar = CollectionMember & {
  similarity: number;
};

type PostHouse = {
  slug: string;
  name: string;
  kind: string;
  role: string;
  notes: string | null;
};

type Confidence = {
  score: number;
  total: number;
  primary_count: number;
  secondary_count: number;
  manufacturer_count: number;
  speculative_count: number;
} | null;

/**
 * E-44 — IMSDb URL pattern. Their search index uses Title-Cased path
 * segments with spaces. We don't ship the script ourselves; this is
 * a deep-link to the screenplay reader for the curious user.
 */
function imsdbUrl(title: string): string | null {
  if (!title) return null;
  // IMSDb's URLs strip leading "The " and use Title Case with spaces
  // preserved as-is in the path. Many work without the strip but the
  // search at /Movie%20Scripts/<title>.html is the most permissive.
  const cleaned = title.replace(/[:?]/g, '').trim();
  return `https://imsdb.com/Movie%20Scripts/${encodeURIComponent(cleaned)}%20Script.html`;
}

type Citations = {
  sources: Array<{
    number: number;
    id: number;
    title: string;
    publication: string | null;
    author: string | null;
    published_at: string | null;
    url: string | null;
    archive_url: string | null;
    confidence: string;
    last_status: number | null;
  }>;
  byEquipmentUsage: Record<number, number[]>;
};

export function ProductionDetail({
  data,
  vfx,
  videos,
  videoTimestamps,
  collectionMembers,
  similar,
  postHouses,
  scoringStages,
  scoreWorks,
  keyFrames,
  citations,
  awards,
  confidence,
  semanticSimilar,
  locations,
  lightingSetups,
  colorPipelines,
  claims,
  sourcesByClaimId,
  evidenceByClaimId,
  stuntSequences,
  stuntDoubling,
  stuntCompanies,
  stuntCrew,
  similarShots,
}: {
  data: DetailData;
  vfx: VfxData;
  videos: VideosData;
  videoTimestamps: readonly VideoTimestampAnnotation[];
  collectionMembers: readonly CollectionMember[];
  similar: readonly SimilarProduction[];
  postHouses: readonly PostHouse[];
  scoringStages: readonly {
    slug: string;
    name: string;
    facility_name: string | null;
    city: string | null;
    country: string | null;
    notes: string | null;
  }[];
  scoreWorks: readonly {
    id: number;
    composer_slug: string;
    composer_name: string;
    scoring_stage_slug: string | null;
    scoring_stage_name: string | null;
    recording_orchestra: string | null;
    recording_location: string | null;
    cue_count_estimate: number | null;
    summary: string | null;
  }[];
  keyFrames: readonly KeyFrame[];
  citations: Citations;
  awards: readonly ProductionAward[];
  confidence: Confidence;
  semanticSimilar: readonly SemanticSimilar[];
  locations: readonly ProductionLocation[];
  lightingSetups: readonly LightingSetup[];
  colorPipelines: readonly ColorPipelineRow[];
  claims: readonly ClaimRow[];
  sourcesByClaimId: Record<number, ClaimSourceRow[]>;
  evidenceByClaimId: Record<number, EvidenceItem[]>;
  stuntSequences: readonly StuntSequenceRow[];
  stuntDoubling: readonly ProductionDoublingRow[];
  stuntCompanies: readonly ProductionStuntCompanyRow[];
  stuntCrew: readonly ProductionStuntCrewRow[];
  similarShots?: ReadonlyArray<{
    id: number;
    image_url: string;
    caption: string | null;
    production_slug: string;
    production_title: string;
    scene_slug: string | null;
    scene_title: string | null;
    similarity: number;
  }>;
}) {
  const { production, formats, studios, crew, scenes } = data;

  type CrewMember = (typeof crew)[number];
  const crewByCategory = crew.reduce<Record<string, CrewMember[]>>((acc, c) => {
    (acc[c.role_category] ??= []).push(c);
    return acc;
  }, {});

  // Use cached TMDb image paths from the productions row (populated by enrich/import).
  // Backdrop uses a wider variant for the hero; poster uses w342 next to the title.
  const heroSrc = backdropUrl(production.backdrop_path, 'w1280');
  const posterSrc = posterUrl(production.poster_path, 'w342');

  const runtime = production.runtime_minutes;
  const runtimeFmt = runtime
    ? `${Math.floor(runtime / 60)}h ${runtime % 60}m`
    : null;

  const isMetadataOnly =
    production.data_tier === 'imported' && crew.length === 0 && scenes.length === 0;

  // ── UX-audit P0: in-page TOC for the long detail page (30+ sections). ──
  // Predicates mirror each section's self-hide condition so the TOC list
  // never points at a hidden / absent block. Each section is wrapped in
  // <section id="…" className="scroll-mt-24"> below so the chip-strip
  // anchors land below the sticky TOC + global nav.
  const hasStudios = studios.length > 0;
  const hasCrew = Object.keys(crewByCategory).length > 0;
  const hasVfx = vfx.credits.length > 0 || vfx.techniques.length > 0;
  const hasClaims = claims.length > 0;
  const hasAwards = awards.length > 0;
  const hasReleaseDates = !!production.release_dates && production.release_dates.length > 0;
  const hasLocations = locations.length > 0;
  const hasKeyFrames = keyFrames.length > 0;
  const hasLighting = lightingSetups.length > 0;
  const hasColorPipeline = colorPipelines.length > 0;
  const hasStuntSequences = stuntSequences.length > 0;
  const hasStuntDept = stuntCrew.length > 0 || stuntDoubling.length > 0 || stuntCompanies.length > 0;
  const hasPostHouses = postHouses.length > 0;
  const hasScoringStages = scoringStages.length > 0;
  const hasScoreWorks = scoreWorks.length > 0;
  const hasVideos = videos.length > 0;
  const hasScenes = scenes.length > 0;

  const tocEntries: Array<{ id: string; label: string }> = [
    { id: 'tech-panel', label: 'At a glance' },
    hasStudios && { id: 'studios', label: 'Studios' },
    hasCrew && { id: 'crew', label: 'Crew' },
    hasVfx && { id: 'vfx', label: 'VFX' },
    hasClaims && { id: 'claims', label: 'Claims' },
    hasAwards && { id: 'awards', label: 'Awards' },
    hasLocations && { id: 'locations', label: 'Locations' },
    hasKeyFrames && { id: 'keyframes', label: 'Key frames' },
    hasLighting && { id: 'lighting', label: 'Lighting' },
    hasColorPipeline && { id: 'color-pipeline', label: 'Color' },
    hasStuntSequences && { id: 'stunt-sequences', label: 'Stunt sequences' },
    hasStuntDept && { id: 'stunts', label: 'Stunts' },
    hasPostHouses && { id: 'post-houses', label: 'Post' },
    hasScoringStages && { id: 'scoring-stages', label: 'Scoring' },
    hasScoreWorks && { id: 'score', label: 'Score' },
    hasVideos && { id: 'videos', label: 'Videos' },
    hasScenes && { id: 'scenes', label: 'Scenes' },
    hasReleaseDates && { id: 'release-dates', label: 'Releases' },
  ].filter((e): e is { id: string; label: string } => Boolean(e));

  return (
    <article>
      {heroSrc && (
        <div className="relative -mx-4 mb-8 aspect-[21/9] overflow-hidden bg-zinc-900 sm:-mx-6 lg:-mx-8">
          <Image
            src={heroSrc}
            unoptimized
            alt={`${production.title} backdrop`}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
        </div>
      )}

      <header className="mb-8 flex gap-5">
        {posterSrc ? (
          <div
            className="relative hidden w-28 shrink-0 self-start overflow-hidden rounded border border-zinc-800 sm:block"
            style={{ aspectRatio: '2/3' }}
          >
            <Image src={posterSrc} unoptimized alt={`${production.title} poster`} fill sizes="112px" className="object-cover" />
          </div>
        ) : null}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            {production.type} · {production.release_year ?? 'TBD'}
            {runtimeFmt && <span className="ml-2 normal-case tracking-normal text-zinc-600">{runtimeFmt}</span>}
            {production.production_country && (
              <span className="ml-2 normal-case tracking-normal text-zinc-600">{production.production_country}</span>
            )}
            {production.original_language && production.original_language !== 'en' && (
              <span className="ml-2 normal-case tracking-normal text-zinc-600">
                {production.original_language.toUpperCase()}
              </span>
            )}
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="font-serif text-4xl text-zinc-50">{production.title}</h1>
            <BookmarkButton
              kind="film"
              slug={production.slug}
              title={production.title}
              subtitle={production.release_year ? String(production.release_year) : undefined}
              href={`/films/${production.slug}`}
            />
          </div>
          {production.original_title && (
            <p className="mt-1 text-sm text-zinc-500">{production.original_title}</p>
          )}
          {production.synopsis && (
            <p className="mt-3 max-w-2xl text-zinc-400">{production.synopsis}</p>
          )}

          {/* Genres + rating chips */}
          {(production.genres?.length || production.vote_average) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {production.genres?.map((g) => (
                <span key={g} className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                  {g}
                </span>
              ))}
              {production.vote_average && Number(production.vote_average) > 0 && (
                <span className="rounded bg-amber-900/40 px-2 py-0.5 text-amber-200">
                  ★ {Number(production.vote_average).toFixed(1)}
                  {production.vote_count ? <span className="ml-1 text-amber-300/70">({production.vote_count.toLocaleString()})</span> : null}
                </span>
              )}
            </div>
          )}

          {formats.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {formats.map((f, i) => <FormatBadge key={i} format={f} linkify />)}
            </div>
          )}

          <EntityProvenanceFooter
            entitySlug={production.slug}
            pageUrl={`/films/${production.slug}`}
            confidence={confidence}
            sourcesCount={citations.sources.length}
            sourcesAnchorId="sources"
            lastVerifiedAt={production.last_verified_at}
            dataTier={production.data_tier}
            curatedBy={production.curated_by}
            curatedByUrl={production.curated_by_url}
            lastCuratedReview={production.last_curated_review}
            extraLinks={
              <>
                {production.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${production.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400"
                  >
                    IMDb ↗
                  </a>
                )}
                {production.tmdb_id && (
                  <a
                    href={`https://www.themoviedb.org/movie/${production.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400"
                  >
                    TMDb ↗
                  </a>
                )}
                {imsdbUrl(production.title) && (
                  <a
                    href={imsdbUrl(production.title)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400"
                    title="Search IMSDb for the screenplay"
                  >
                    Script (IMSDb) ↗
                  </a>
                )}
                {scenes.length > 0 && (
                  <Link
                    href={`/films/${production.slug}/loadout`}
                    className="rounded border border-amber-700 px-2 py-0.5 text-amber-400 hover:bg-amber-900/30"
                  >
                    Loadout sheet (PDF)
                  </Link>
                )}
              </>
            }
          />
        </div>
      </header>

      {/* Data-tier disclosure for imported-only productions */}
      {isMetadataOnly && (
        <div className="mb-8 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
          <span className="mr-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
            metadata only
          </span>
          This page shows TMDb-sourced metadata. Crew, scene-level equipment,
          and BTS sources for this production haven&apos;t been hand-curated yet.
        </div>
      )}

      {/* UX-audit P0: in-page table of contents. Self-hides under 3 entries. */}
      <PageTOC entries={tocEntries} />

      {/* T2-1: At-a-glance tech panel above the long department list */}
      <section id="tech-panel" className="scroll-mt-24">
        <TechPanel
          crew={crew}
          formats={formats}
          scenes={scenes}
          shootingWindow={{
            start: production.principal_photography_start,
            end: production.principal_photography_end,
          }}
          locations={Array.from(
            new Set(
              scenes
                .map((s) => s.location)
                .filter((l): l is string => Boolean(l)),
            ),
          )}
        />
      </section>

      {hasStudios && (
        <section id="studios" className="scroll-mt-24 mb-6">
          <SectionHeader label="Production" heading="Studios" anchorId="studios" />
          <ul className="space-y-1">
            {studios.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-xs text-zinc-400">{s.role.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasCrew && (
        <section id="crew" className="scroll-mt-24">
          {Object.entries(crewByCategory).map(([category, members]) => (
            <div key={category} className="mb-6">
              <SectionHeader label="Department" heading={departmentLabel(category)} />
              <ul className="space-y-1">
                {members.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {/* Migration 0059 — is_primary surfaces the canonical
                        lead per role with a typography-weight + chip;
                        secondary credits render zinc-300. */}
                    <Link
                      href={`/crew/${m.person_slug}`}
                      className={`hover:text-amber-400 ${m.is_primary ? 'font-semibold text-zinc-50' : 'text-zinc-300'}`}
                    >
                      {m.credit_name_override ?? m.display_name}
                    </Link>
                    <span className="text-zinc-400">{m.role_name}</span>
                    {m.is_primary && (
                      <span
                        className="rounded border border-amber-700/60 bg-amber-950/30 px-1 py-px text-[9px] uppercase tracking-wide text-amber-300"
                        title="Primary lead in this role"
                      >
                        primary
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {hasVfx && (
        <section id="vfx" className="scroll-mt-24">
          <VfxSection credits={vfx.credits} techniques={vfx.techniques} />
        </section>
      )}

      {hasClaims && (
        <section id="claims" className="scroll-mt-24">
          <ProductionClaims
            claims={claims}
            sourcesByClaimId={sourcesByClaimId}
            evidenceByClaimId={evidenceByClaimId}
          />
        </section>
      )}

      {/* T2-6 — awards (winners + nominees). */}
      {hasAwards && (
        <section id="awards" className="scroll-mt-24">
          {/* Per-craft summary band — groups awards by craft via the
              craftFromAward classifier so visitors can see at-a-glance
              which departments earned recognition without scanning the
              full list below. Each chip links to /awards/craft/<slug>. */}
          {(() => {
            const byCraft = new Map<CraftSlug, { wins: number; noms: number }>();
            let uncategorized = 0;
            for (const a of awards) {
              const craft = craftFromAward(a.award_org, a.category);
              if (!craft) { uncategorized++; continue; }
              const e = byCraft.get(craft) ?? { wins: 0, noms: 0 };
              if (a.is_winner) e.wins += 1; else e.noms += 1;
              byCraft.set(craft, e);
            }
            const chips = Array.from(byCraft.entries())
              .map(([slug, c]) => ({ slug, def: getCraft(slug), ...c }))
              .filter((x) => x.def !== null)
              .sort((a, b) => (b.wins - a.wins) || (b.noms - a.noms));
            if (chips.length === 0) return null;
            return (
              <div className="mb-4">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Recognition by craft</p>
                <ul className="flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/awards/craft/${c.slug}`}
                        className="flex items-baseline gap-1.5 rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-200 hover:border-amber-700 hover:text-amber-400"
                      >
                        <span className="font-medium">{c.def!.name}</span>
                        {c.wins > 0 && (
                          <span className="font-mono text-[10px] text-amber-400">
                            {c.wins}<span className="text-zinc-500">w</span>
                          </span>
                        )}
                        {c.noms > 0 && (
                          <span className="font-mono text-[10px] text-zinc-400">
                            {c.noms}<span className="text-zinc-500">n</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                  {uncategorized > 0 && (
                    <li>
                      <span
                        className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] uppercase tracking-wide text-zinc-500"
                        title="Non-craft categories (Best Picture, Best Director, acting, etc.)"
                      >
                        +{uncategorized} non-craft
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            );
          })()}
          <AwardsList awards={awards} />
        </section>
      )}

      {/* T2-4 — regional release dates from TMDb. */}
      {hasReleaseDates && (
        <section id="release-dates" className="scroll-mt-24">
          <ReleaseDates rows={production.release_dates!} />
        </section>
      )}

      {/* E-23 + E-32 — geocoded shooting locations + per-location sun planner. */}
      {hasLocations && (
        <section id="locations" className="scroll-mt-24">
          <ProductionLocations locations={locations} />
        </section>
      )}

      {/* T2-7 — hand-curated key frames. */}
      {hasKeyFrames && (
        <section id="keyframes" className="scroll-mt-24">
          <KeyFramesGallery frames={keyFrames} slug={production.slug} />
        </section>
      )}

      {/* E-22 — per-scene lighting plot. */}
      {hasLighting && (
        <section id="lighting" className="scroll-mt-24">
          <LightingSetupsList setups={lightingSetups} />
        </section>
      )}

      {/* E-24 — camera color science → IDT → working space → ODT → deliverable. */}
      {hasColorPipeline && (
        <section id="color-pipeline" className="scroll-mt-24">
          <ColorPipelineList pipelines={colorPipelines} />
        </section>
      )}

      {/* Phase-3 stunt sequences — sequence-level rigging detail. */}
      {hasStuntSequences && (
        <section id="stunt-sequences" className="scroll-mt-24">
          <StuntSequencesList sequences={stuntSequences} />
        </section>
      )}

      {/* Phase-9/10 stunt-department surface: department crew +
          doubling credits + contributing stunt companies. Self-hides
          when none of the four data sources have rows for this
          production. Same red-coded editorial neighbourhood as the
          sequences list above. */}
      {hasStuntDept && (
        <section id="stunts" className="scroll-mt-24 mt-10">
          <SectionHeader
            label="Stunts"
            heading={(() => {
              const parts: string[] = [];
              if (stuntCrew.length > 0)
                parts.push(`${stuntCrew.length} crew`);
              if (stuntDoubling.length > 0)
                parts.push(`${stuntDoubling.length} doubling`);
              if (stuntCompanies.length > 0)
                parts.push(`${stuntCompanies.length} ${stuntCompanies.length === 1 ? 'company' : 'companies'}`);
              return parts.join(' · ');
            })()}
          />
          <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
            The stunt department on this production: credited crew,
            actor-double pairings, and the companies whose members
            brought them onto the show. Click any name to jump to
            their full filmography + doubling history.
          </p>

          {/* Stunt-department crew — every credit_assignment with
              role.category='stunts'. Coordinators surface first per
              the query's CASE-based ordering. */}
          {stuntCrew.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Department
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {stuntCrew.map((c) => (
                  <li key={`${c.person_slug}-${c.role_slug}`}>
                    <Link
                      href={`/crew/${c.person_slug}`}
                      className="group flex items-baseline justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-zinc-100 group-hover:text-amber-400">
                          {c.credit_name_override ?? c.display_name}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                          {c.role_name}
                          {c.primary_company_name && (
                            <>
                              {' · '}
                              <span className="text-zinc-400">{c.primary_company_name}</span>
                            </>
                          )}
                        </span>
                        {c.notes && (
                          <span className="mt-0.5 block text-[10px] text-zinc-500 italic">
                            {c.notes}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stuntDoubling.length > 0 && (
            <ul className="mb-6 space-y-2">
              {stuntDoubling.map((d) => (
                <li
                  key={d.id}
                  className="rounded border border-red-900/40 bg-red-950/10 p-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="rounded border border-red-900/40 bg-red-950/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-red-200/90">
                      {d.kind.replace(/_/g, ' ')}
                    </span>
                    <Link
                      href={`/crew/${d.doubler_slug}`}
                      className="font-serif text-sm text-zinc-100 hover:text-amber-400"
                    >
                      {d.doubler_name}
                    </Link>
                    <span className="text-xs text-zinc-500">doubled</span>
                    <Link
                      href={`/crew/${d.doubled_slug}`}
                      className="font-serif text-sm text-zinc-100 hover:text-amber-400"
                    >
                      {d.doubled_name}
                    </Link>
                    {d.character_name && (
                      <span className="text-xs text-zinc-500">as {d.character_name}</span>
                    )}
                  </div>
                  {d.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{d.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {stuntCompanies.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Contributing stunt companies
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {stuntCompanies.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/stunts/companies/${c.slug}`}
                      className="group flex items-baseline justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-sm text-zinc-100 group-hover:text-amber-400">
                          {c.name}
                        </span>
                        <span className="block text-[10px] text-zinc-500">
                          {c.member_count} member{c.member_count === 1 ? '' : 's'}:{' '}
                          <span className="text-zinc-400">
                            {c.member_names.slice(0, 3).join(', ')}
                            {c.member_names.length > 3 && ` +${c.member_names.length - 3}`}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-400">
                        Roster →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* T2-3 — post-production houses (DI / color / sound mix). */}
      {hasPostHouses && (
        <section id="post-houses" className="scroll-mt-24 mt-6">
          <SectionHeader label="Post-production" heading="Lab & finishing" anchorId="post-houses" />
          {/* UX-audit second pass — sound/post role chips link to the
              relevant department dossier so the asymmetry with the
              VFX section (which links every house to its detail page)
              is reduced. The post-house slug isn't a routable detail
              page yet — when it is, replace the role-chip link with
              one wrapping the house name. */}
          <ul className="space-y-1 text-sm">
            {postHouses.map((p) => {
              const roleHref =
                p.role === 'sound_mix' || p.role === 'sound_design' ? '/sound'
                : p.role === 'color_grading' || p.role === 'di' || p.role === 'finishing' || p.role === 'imax_remaster' || p.role === 'mastering' ? '/for-colorists'
                : null;
              // Sound-flavored post-houses now have routable detail pages
              // at /sound/houses/[slug]. Picture-side ones (DI/color/finishing)
              // don't yet — render name as plain text in that case.
              const isSound = p.role === 'sound_mix' || p.role === 'sound_design';
              return (
                <li key={`${p.slug}:${p.role}`} className="flex items-center gap-3">
                  {isSound ? (
                    <Link
                      href={`/sound/houses/${p.slug}`}
                      className="font-medium text-zinc-100 hover:text-amber-400"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-100">{p.name}</span>
                  )}
                  {roleHref ? (
                    <Link
                      href={roleHref}
                      className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300 hover:border-amber-700/60 hover:text-amber-400"
                      title={`Browse ${p.role.replace(/_/g, ' ')} dossier`}
                    >
                      {p.role.replace(/_/g, ' ')} <span aria-hidden="true">↗</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-400">{p.role.replace(/_/g, ' ')}</span>
                  )}
                  {p.notes && <span className="text-xs text-zinc-400">— {p.notes}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Score deep-dive — composer + orchestra + cue catalog when populated. */}
      {hasScoreWorks && (
        <section id="score" className="scroll-mt-24 mt-6">
          <SectionHeader label="Score" heading="Composer & cues" anchorId="score" />
          <ul className="space-y-2 text-sm">
            {scoreWorks.map((sw) => (
              <li key={sw.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/crew/${sw.composer_slug}`}
                        className="font-medium text-zinc-100 hover:text-amber-400">
                    {sw.composer_name}
                  </Link>
                  {sw.recording_orchestra && (
                    <span className="text-xs text-zinc-400">
                      · {sw.recording_orchestra}
                    </span>
                  )}
                  {sw.scoring_stage_slug ? (
                    <Link href={`/music/scoring-stages/${sw.scoring_stage_slug}`}
                          className="text-xs text-amber-400 hover:text-amber-300">
                      at {sw.scoring_stage_name} ↗
                    </Link>
                  ) : sw.recording_location ? (
                    <span className="text-xs text-zinc-400">at {sw.recording_location}</span>
                  ) : null}
                </div>
                {sw.summary && (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{sw.summary}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            <Link href={`/music/scores/${data.production.slug}`}
                  className="text-amber-400 hover:text-amber-300">
              Open the full score deep-dive →
            </Link>
          </p>
        </section>
      )}

      {/* Scoring stages — where the score was recorded. Mirrors the
          post-houses pattern: name links to /music/scoring-stages/[slug],
          location + notes shown inline. */}
      {hasScoringStages && (
        <section id="scoring-stages" className="scroll-mt-24 mt-6">
          <SectionHeader label="Score" heading="Scoring stage" anchorId="scoring-stages" />
          <ul className="space-y-1 text-sm">
            {scoringStages.map((s) => (
              <li key={s.slug} className="flex flex-wrap items-baseline gap-x-2">
                <Link
                  href={`/music/scoring-stages/${s.slug}`}
                  className="font-medium text-zinc-100 hover:text-amber-400"
                >
                  {s.name}
                </Link>
                {s.facility_name && (
                  <span className="text-xs text-zinc-400">{s.facility_name}</span>
                )}
                {(s.city || s.country) && (
                  <span className="text-xs text-zinc-500">
                    · {[s.city, s.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {s.notes && <span className="text-xs text-zinc-400">— {s.notes}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasVideos && (
        <section id="videos" className="scroll-mt-24">
          <VideoGallery videos={videos} timestamps={videoTimestamps} />
        </section>
      )}

      {hasScenes && (
        <section id="scenes" className="scroll-mt-24">
          <SceneList
            rows={scenes}
            productionSlug={production.slug}
            citationsByUsage={citations.byEquipmentUsage}
          />
        </section>
      )}

      {/* Other films in the same TMDb collection (e.g. Dune 1, Dune 2) */}
      {collectionMembers.length > 0 && production.tmdb_collection_name && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <SectionHeader label="Franchise" heading={production.tmdb_collection_name} />
          <div className="mt-2 flex flex-wrap gap-3">
            {collectionMembers.map((m) => (
              <Link
                key={m.slug}
                href={`/films/${m.slug}`}
                className="group flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-2 hover:border-zinc-600 transition-colors"
              >
                {m.poster_path && (
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded">
                    <Image
                      src={posterUrl(m.poster_path, 'w154') ?? ''}
                      unoptimized
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
                    {m.title}
                  </div>
                  {m.release_year && (
                    <div className="text-xs text-zinc-500">{m.release_year}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* T2-8: similar films */}
      {similar.length > 0 && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <SectionHeader label="Related" heading="Similar productions" />
          <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
            Ranked by overlap of director, cinematographer, genre, and decade.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <Link
                key={s.slug}
                href={`/films/${s.slug}`}
                className="group flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
              >
                <div
                  className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-950"
                  style={{ aspectRatio: '2/3' }}
                >
                  {s.poster_path && (
                    <Image
                      src={posterUrl(s.poster_path, 'w154') ?? ''}
                      unoptimized
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
                    {s.title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {s.release_year ?? '—'} · <span className="text-zinc-600">{s.reason}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* E-27 — thematically similar productions via embedding cosine
          similarity over title + synopsis + DP/director. Distinct from
          T2-8's metadata-based "Similar productions" — this catches
          films that *feel* alike where credits don't overlap.
          Self-hides when this row hasn't been embedded yet. */}
      {semanticSimilar.length > 0 && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <SectionHeader label="Related" heading="Thematically similar" />
          <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
            By embedding cosine-similarity — surfaces films with comparable subject
            matter and tone, regardless of whether crew credits overlap.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {semanticSimilar.map((s) => (
              <Link
                key={s.slug}
                href={`/films/${s.slug}`}
                className="group flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
              >
                <div
                  className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-950"
                  style={{ aspectRatio: '2/3' }}
                >
                  {s.poster_path && (
                    <Image
                      src={posterUrl(s.poster_path, 'w154') ?? ''}
                      unoptimized
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
                    {s.title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {s.release_year ?? '—'} ·{' '}
                    <span className="font-mono text-zinc-600">
                      {(s.similarity * 100).toFixed(0)}% match
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* UX-audit second pass — visually-similar shots rail. Pulls
          via cosine on production_keyframes.embedding from a different
          production. Self-hides when no embeddings are populated for
          this production. */}
      {similarShots && similarShots.length > 0 && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <SectionHeader label="Related" heading="Visually similar shots" anchorId="similar-shots" />
          <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-400">
            By SigLIP embedding cosine-similarity against this production's representative keyframe.
            Click through to the matched film for the scene context.
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {similarShots.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/films/${s.production_slug}#keyframes`}
                  className="group block overflow-hidden rounded border border-zinc-800 bg-zinc-950 hover:border-amber-700/60"
                  title={`${s.production_title}${s.caption ? ' — ' + s.caption : ''}`}
                >
                  <div className="relative aspect-[16/9]">
                    {s.image_url && (
                      <Image
                        src={s.image_url}
                        unoptimized
                        alt={`Keyframe from ${s.production_title}${s.caption ? ': ' + s.caption : ''}`}
                        fill
                        sizes="(min-width: 640px) 22vw, 50vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="border-t border-zinc-800 px-2 py-1.5">
                    <p className="line-clamp-1 text-xs font-medium text-zinc-100 group-hover:text-amber-400">
                      {s.production_title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      <span className="font-mono text-amber-300">{(s.similarity * 100).toFixed(0)}%</span>
                      {s.scene_title && <span className="ml-1 text-zinc-500">· {s.scene_title}</span>}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* T6-1 — numbered bibliography. Inline `[N]` markers in SceneList
          link here. Self-hides when nothing is cited. */}
      <SourcesList sources={citations.sources} />
    </article>
  );
}
