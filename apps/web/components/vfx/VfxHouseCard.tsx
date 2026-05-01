import Link from 'next/link';

interface VfxHouseCardProps {
  slug: string;
  name: string;
  country: string | null;
  productionCount: number;
}

export function VfxHouseCard({ slug, name, country, productionCount }: VfxHouseCardProps) {
  return (
    <Link
      href={`/vfx/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-lg text-zinc-50">{name}</h2>
        <span className="text-xs text-zinc-500">{productionCount} films</span>
      </div>
      {country && (
        <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">{country}</p>
      )}
    </Link>
  );
}
