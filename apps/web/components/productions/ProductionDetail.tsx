import Link from 'next/link';
import Image from 'next/image';
import { getProductionWithFullDetail, getProductionVfxData } from '@bts/db';
import type { ClaimRow, ClaimSourceRow, EvidenceItem, VideoTimestampAnnotation, getProductionVideos } from '@bts/db';
import { VideoGallery } from './VideoGallery';
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
import { CorrectionForm } from '@/components/ui/CorrectionForm';
import { CitationRigorBadge } from '@/components/ui/CitationRigorBadge';
import { ProductionLocations } from './ProductionLocations';
import type { KeyFrame, ProductionAward, ProductionLocation, LightingSetup, ColorPipelineRow, StuntSequenceRow, ProductionDoublingRow, ProductionStuntCompanyRow, ProductionStuntCrewRow } from '@bts/db';
import { LightingSetupsList } from './LightingSetupsList';
import { ColorPipelineList } from './ColorPipelineList';
import { StuntSequencesList } from './StuntSequencesList';
import { ProductionClaims } from './ProductionClaims';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SourcesList } from '@/components/ui/SourcesList';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { posterUrl, backdropUrl } from '@/lib/tmdb-image';

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
}: {
  data: DetailData;
  vfx: VfxData;
  videos: VideosData;
  videoTimestamps: readonly VideoTimestampAnnotation[];
  collectionMembers: readonly CollectionMember[];
  similar: readonly SimilarProduction[];
  postHouses: readonly PostHouse[];
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

  function formatRelativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days < 1) return 'today';
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  return (
    <article>
      {heroSrc && (
        <div className="relative -mx-4 mb-8 aspect-[21/9] overflow-hidden bg-zinc-900 sm:-mx-6 lg:-mx-8">
          <Image
            src={heroSrc}
            alt=""
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
            <Image src={posterSrc} alt="" fill sizes="112px" className="object-cover" />
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

          {(citations.sources.length > 0 || confidence) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* E-48 — citation-rigor badge. Self-hides when confidence
                  is null (no attributions). */}
              <CitationRigorBadge data={confidence} />
              {citations.sources.length > 0 && (
                <a
                  href="#sources"
                  className="text-xs text-zinc-500 hover:text-amber-400"
                >
                  {citations.sources.length} source{citations.sources.length === 1 ? '' : 's'} ↓
                </a>
              )}
            </div>
          )}

          {/* External links + tools */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
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
            {/* E-44 — IMSDb script link-out. URL pattern uses the
                title with spaces collapsed. We don't pre-validate the
                URL exists — IMSDb returns a friendly 404 if the script
                isn't there, which is no worse than IMDb's own
                "title not found" UX. */}
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
            {/* T7-4 — replaces the T1-4 mailto: link with a real form
                that drops into the corrections queue. */}
            <CorrectionForm
              productionSlug={production.slug}
              pageUrl={`/films/${production.slug}`}
            />
          </div>

          {/* T1-3: data freshness signal */}
          {production.last_verified_at && (
            <p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-600">
              Verified {formatRelativeTime(production.last_verified_at)}
            </p>
          )}

          {/* 0054 — editorial byline on curated dossiers (E-E-A-T). */}
          {production.data_tier === 'curated' && production.curated_by && (
            <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-500/70">
              <span className="text-zinc-500">Curated by</span>{' '}
              {production.curated_by_url ? (
                <a
                  href={production.curated_by_url}
                  className="text-amber-400 hover:underline"
                  rel="author"
                >
                  {production.curated_by}
                </a>
              ) : (
                <span className="text-amber-400">{production.curated_by}</span>
              )}
              {production.last_curated_review && (
                <>
                  {' · '}
                  <span className="text-zinc-500">
                    Last reviewed {formatRelativeTime(production.last_curated_review)}
                  </span>
                </>
              )}
              {' · '}
              <a
                href="/methodology"
                className="text-zinc-500 hover:text-amber-400"
              >
                Methodology
              </a>
            </p>
          )}
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

      {/* T2-1: At-a-glance tech panel above the long department list */}
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

      {studios.length > 0 && (
        <div className="mb-6">
          <SectionHeader label="Production" heading="Studios" />
          <ul className="space-y-1">
            {studios.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-xs text-zinc-500">{s.role.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.entries(crewByCategory).map(([category, members]) => (
        <div key={category} className="mb-6">
          <SectionHeader label="Department" heading={category.replace('_', ' ')} />
          <ul className="space-y-1">
            {members.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Link
                  href={`/crew/${m.person_slug}`}
                  className="text-zinc-200 hover:text-amber-400"
                >
                  {m.credit_name_override ?? m.display_name}
                </Link>
                <span className="text-zinc-500">{m.role_name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <VfxSection credits={vfx.credits} techniques={vfx.techniques} />

      <ProductionClaims
        claims={claims}
        sourcesByClaimId={sourcesByClaimId}
        evidenceByClaimId={evidenceByClaimId}
      />

      {/* T2-6 — awards (winners + nominees). Self-hides when none. */}
      <AwardsList awards={awards} />

      {/* T2-4 — regional release dates from TMDb. Most rows have an empty
          array (we ingest on demand, not on every import); component
          self-hides when nothing is set. */}
      {production.release_dates && production.release_dates.length > 0 && (
        <ReleaseDates rows={production.release_dates} />
      )}

      {/* E-23 + E-32 — geocoded shooting locations + per-location sun
          planner. Self-hides when none seeded. */}
      <ProductionLocations locations={locations} />

      {/* T2-7 — hand-curated key frames. Self-hides when none. */}
      <KeyFramesGallery frames={keyFrames} slug={production.slug} />

      {/* E-22 — per-scene lighting plot. Self-hides when no setups
          have been curated for this production. */}
      <LightingSetupsList setups={lightingSetups} />

      {/* E-24 — camera color science → IDT → working space → ODT →
          deliverable. Self-hides when no pipeline curated. */}
      <ColorPipelineList pipelines={colorPipelines} />

      {/* Phase-3 stunt sequences — sequence-level rigging detail
          surfaced as a compact list; each row links to a full
          rigging-and-credits detail page. Self-hides when no
          sequences are curated. */}
      <StuntSequencesList sequences={stuntSequences} />

      {/* Phase-9/10 stunt-department surface: department crew +
          doubling credits + contributing stunt companies. Self-hides
          when none of the four data sources have rows for this
          production. Same red-coded editorial neighbourhood as the
          sequences list above. */}
      {(stuntCrew.length > 0 || stuntDoubling.length > 0 || stuntCompanies.length > 0) && (
        <div className="mt-10">
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
        </div>
      )}

      {/* T2-3 — post-production houses (DI / color / sound mix). Empty
          for most films today; visible on curated rows where we know it. */}
      {postHouses.length > 0 && (
        <div className="mt-6">
          <SectionHeader label="Post-production" heading="Lab & finishing" />
          <ul className="space-y-1 text-sm">
            {postHouses.map((p) => (
              <li key={`${p.slug}:${p.role}`} className="flex items-center gap-3">
                <span className="text-zinc-200">{p.name}</span>
                <span className="text-xs text-zinc-500">{p.role.replace(/_/g, ' ')}</span>
                {p.notes && <span className="text-xs text-zinc-600">— {p.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <VideoGallery videos={videos} timestamps={videoTimestamps} />
      <SceneList
        rows={scenes}
        productionSlug={production.slug}
        citationsByUsage={citations.byEquipmentUsage}
      />

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

      {/* T6-1 — numbered bibliography. Inline `[N]` markers in SceneList
          link here. Self-hides when nothing is cited. */}
      <SourcesList sources={citations.sources} />
    </article>
  );
}
