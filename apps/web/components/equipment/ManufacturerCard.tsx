import Link from 'next/link';

interface ManufacturerCardProps {
  slug: string;
  name: string;
  kind: string;
  country: string | null;
  description: string | null;
  seriesCount: number;
}

export function ManufacturerCard({ slug, name, kind, country, description, seriesCount }: ManufacturerCardProps) {
  return (
    <Link
      href={`/gear/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-lg text-zinc-50">{name}</h2>
        <span className="text-xs text-zinc-500">{seriesCount} series</span>
      </div>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
        {kind.replace('_', ' ')}{country ? ` · ${country}` : ''}
      </p>
      {description && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{description}</p>
      )}
    </Link>
  );
}
