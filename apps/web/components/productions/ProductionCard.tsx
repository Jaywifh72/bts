import Link from 'next/link';
import { FormatBadge } from './FormatBadge';

interface ProductionCardProps {
  slug: string;
  title: string;
  type: string;
  releaseYear: number | null;
  synopsis: string | null;
  primaryAspectRatio: string | null;
  primaryAcquisitionFormat: string | null;
}

export function ProductionCard({
  slug, title, type, releaseYear, synopsis,
  primaryAspectRatio, primaryAcquisitionFormat,
}: ProductionCardProps) {
  return (
    <Link
      href={`/films/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-lg leading-tight text-zinc-50">{title}</h2>
        {releaseYear && (
          <span className="shrink-0 text-sm tabular-nums text-zinc-400">{releaseYear}</span>
        )}
      </div>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">{type}</p>
      {synopsis && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{synopsis}</p>
      )}
      {primaryAspectRatio && primaryAcquisitionFormat && (
        <div className="mt-3">
          <FormatBadge format={{
            aspect_ratio: primaryAspectRatio,
            acquisition_format: primaryAcquisitionFormat,
          }} />
        </div>
      )}
    </Link>
  );
}
