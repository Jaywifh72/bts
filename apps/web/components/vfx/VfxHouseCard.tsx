import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface VfxHouseCardProps {
  slug: string;
  name: string;
  country: string | null;
  website: string | null;
  productionCount: number;
}

export function VfxHouseCard({ slug, name, country, website, productionCount }: VfxHouseCardProps) {
  return (
    <Link
      href={`/vfx/${slug}`}
      className="group flex gap-4 rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <BrandLogo slug={slug} website={website} name={name} size="md" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif text-lg text-zinc-50">{name}</h2>
          <span className="shrink-0 text-xs text-zinc-500">{productionCount} films</span>
        </div>
        {country && (
          <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">{country}</p>
        )}
      </div>
    </Link>
  );
}
