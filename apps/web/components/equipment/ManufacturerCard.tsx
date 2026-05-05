import Link from 'next/link';
import { getBrand } from '@/lib/manufacturer-brand';

interface ManufacturerCardProps {
  slug: string;
  name: string;
  kind: string;
  country: string | null;
  description: string | null;
  seriesCount: number;
}

export function ManufacturerCard({
  slug,
  name,
  kind,
  country,
  description,
  seriesCount,
}: ManufacturerCardProps) {
  const brand = getBrand(slug);
  return (
    <Link
      href={`/gear/${slug}`}
      className="group flex gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
    >
      {/* Brand monogram tile (T4-1) */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded font-mono text-xs font-bold tracking-tight text-white shadow-inner"
        style={{ backgroundColor: brand.accent }}
        aria-hidden
      >
        {brand.monogram}
      </div>
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
