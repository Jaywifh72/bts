import Link from 'next/link';
import Image from 'next/image';
import { getProductionWithFullDetail, getProductionVfxData } from '@bts/db';
import type { getProductionVideos } from '@bts/db';
import { VideoGallery } from './VideoGallery';
import { FormatBadge } from './FormatBadge';
import { MediaGallery } from './MediaGallery';
import { SceneList } from './SceneList';
import { VfxSection } from './VfxSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SourceCitation } from '@/components/ui/SourceCitation';
import type { TmdbMedia } from '@/lib/tmdb';

type DetailData = NonNullable<Awaited<ReturnType<typeof getProductionWithFullDetail>>>;
type VfxData = Awaited<ReturnType<typeof getProductionVfxData>>;
type VideosData = Awaited<ReturnType<typeof getProductionVideos>>;

export function ProductionDetail({ data, media, vfx, videos }: { data: DetailData; media: TmdbMedia | null; vfx: VfxData; videos: VideosData }) {
  const { production, formats, studios, crew, scenes, productionSources } = data;

  type CrewMember = (typeof crew)[number];
  const crewByCategory = crew.reduce<Record<string, CrewMember[]>>((acc, c) => {
    (acc[c.role_category] ??= []).push(c);
    return acc;
  }, {});

  const heroSrc = media?.backdrops[0] ?? null;

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
        {media?.poster && (
          <div className="relative hidden w-28 shrink-0 self-start overflow-hidden rounded border border-zinc-800 sm:block" style={{ aspectRatio: '2/3' }}>
            <Image
              src={media.poster}
              alt=""
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            {production.type} · {production.release_year ?? 'TBD'}
          </p>
          <h1 className="mt-1 font-serif text-4xl text-zinc-50">{production.title}</h1>
          {production.original_title && (
            <p className="mt-1 text-sm text-zinc-500">{production.original_title}</p>
          )}
          {production.synopsis && (
            <p className="mt-3 max-w-2xl text-zinc-400">{production.synopsis}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {formats.map((f, i) => <FormatBadge key={i} format={f} />)}
          </div>
          {productionSources.length > 0 && (
            <div className="mt-3">
              <SourceCitation sources={productionSources} />
            </div>
          )}
        </div>
      </header>

      {media && <MediaGallery media={media} />}

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
    </article>
  );
}
