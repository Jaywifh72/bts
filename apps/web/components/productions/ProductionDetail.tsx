import Link from 'next/link';
import Image from 'next/image';
import { getProductionWithFullDetail, getProductionVfxData } from '@bts/db';
import type { getProductionVideos } from '@bts/db';
import { VideoGallery } from './VideoGallery';
import { FormatBadge } from './FormatBadge';
import { MediaGallery } from './MediaGallery';
import { SceneList } from './SceneList';
import { VfxSection } from './VfxSection';
import { TechPanel } from './TechPanel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SourceCitation } from '@/components/ui/SourceCitation';
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

export function ProductionDetail({
  data,
  vfx,
  videos,
  collectionMembers,
}: {
  data: DetailData;
  vfx: VfxData;
  videos: VideosData;
  collectionMembers: readonly CollectionMember[];
}) {
  const { production, formats, studios, crew, scenes, productionSources } = data;

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
          <h1 className="mt-1 font-serif text-4xl text-zinc-50">{production.title}</h1>
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
              {formats.map((f, i) => <FormatBadge key={i} format={f} />)}
            </div>
          )}

          {productionSources.length > 0 && (
            <div className="mt-3">
              <SourceCitation sources={productionSources} />
            </div>
          )}

          {/* External links */}
          <div className="mt-3 flex gap-3 text-xs text-zinc-500">
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
          </div>
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

      <MediaGallery backdropPaths={[]} />

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
      <VideoGallery videos={videos} />
      <SceneList rows={scenes} />

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
    </article>
  );
}
