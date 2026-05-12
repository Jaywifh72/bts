import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface ManufacturerCardProps {
  slug: string;
  name: string;
  kind: string;
  country: string | null;
  description: string | null;
  website: string | null;
  seriesCount: number;
}

export function ManufacturerCard({
  slug,
  name,
  kind,
  country,
  description,
  website,
  seriesCount,
}: ManufacturerCardProps) {
  return (
    <Link
      href={`/gear/${slug}`}
      className="group flex gap-4 rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      {/* Brand logo — hot-linked through Google's favicon service so
          we don't redistribute brand assets. Falls back to the
          typographic <BrandMark> when the website is missing or the
          favicon request fails. */}
      <BrandLogo slug={slug} website={website} name={name} size="md" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif text-base text-zinc-50">{name}</h2>
          <span className="shrink-0 text-xs text-zinc-500">{seriesCount} series</span>
        </div>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
          {kind.replace('_', ' ')}{country ? ` · ${country}` : ''}
        </p>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{description}</p>
        )}
      </div>
    </Link>
  );
}
