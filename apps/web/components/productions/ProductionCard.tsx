import Link from 'next/link';
import Image from 'next/image';
import { FormatBadge } from './FormatBadge';
import { posterUrl } from '@/lib/tmdb-image';

interface ProductionCardProps {
  slug: string;
  title: string;
  type: string;
  releaseYear: number | null;
  synopsis: string | null;
  primaryAspectRatio: string | null;
  primaryAcquisitionFormat: string | null;
  posterPath?: string | null;
  dataTier?: 'curated' | 'imported';
  /** When true, render the small thumbnail layout used in the films index. */
  variant?: 'default' | 'compact';
}

export function ProductionCard({
  slug, title, type, releaseYear, synopsis,
  primaryAspectRatio, primaryAcquisitionFormat,
  posterPath, dataTier, variant = 'default',
}: ProductionCardProps) {
  const poster = posterUrl(posterPath, 'w185');

  return (
    <Link
      href={`/films/${slug}`}
      className="group flex gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
    >
      {/* Poster — 2:3 aspect, fixed width. Falls back to a placeholder block. */}
      <div
        className="relative shrink-0 overflow-hidden rounded bg-zinc-950"
        style={{ width: variant === 'compact' ? 56 : 72, aspectRatio: '2/3' }}
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes={variant === 'compact' ? '56px' : '72px'}
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-700">
            no poster
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-base leading-tight text-zinc-50 line-clamp-2">{title}</h2>
          {releaseYear && (
            <span className="shrink-0 text-sm tabular-nums text-zinc-400">{releaseYear}</span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
          {type}
          {dataTier === 'curated' && (
            <span
              title="Hand-curated with crew, scenes, and equipment data"
              className="ml-2 rounded bg-amber-900/50 px-1 py-px text-[9px] text-amber-300"
            >
              CURATED
            </span>
          )}
        </p>
        {synopsis && (
          <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{synopsis}</p>
        )}
        {primaryAspectRatio && primaryAcquisitionFormat && (
          <div className="mt-2">
            <FormatBadge format={{
              aspect_ratio: primaryAspectRatio,
              acquisition_format: primaryAcquisitionFormat,
            }} />
          </div>
        )}
      </div>
    </Link>
  );
}
