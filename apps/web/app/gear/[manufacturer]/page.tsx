import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listManufacturers, getManufacturerBySlug } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface Props { params: { manufacturer: string } }

export async function generateStaticParams() {
  const rows = await listManufacturers(db);
  return rows.map((r) => ({ manufacturer: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getManufacturerBySlug(db, params.manufacturer);
  return data ? { title: data.manufacturer.name } : {};
}

export default async function ManufacturerPage({ params }: Props) {
  const data = await getManufacturerBySlug(db, params.manufacturer);
  if (!data) notFound();
  const { manufacturer, series } = data;

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{manufacturer.name}</h1>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
          {manufacturer.kind.replace('_', ' ')}{manufacturer.country ? ` · ${manufacturer.country}` : ''}
          {manufacturer.founded_year ? ` · Est. ${manufacturer.founded_year}` : ''}
        </p>
        {manufacturer.description && (
          <p className="mt-3 max-w-2xl text-zinc-400">{manufacturer.description}</p>
        )}
        {manufacturer.website && (
          <a
            href={manufacturer.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-amber-400 hover:underline"
          >
            Website ↗
          </a>
        )}
      </header>

      <SectionHeader label="Products" heading="Series" />
      <div className="space-y-2">
        {series.map((s) => (
          <Link
            key={s.slug}
            href={`/gear/${params.manufacturer}/${s.slug}`}
            className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors"
          >
            <div>
              <span className="text-zinc-100">{s.name}</span>
              {s.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{s.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge label={s.category} variant="category" />
              <span className="text-zinc-500">{s.item_count} items</span>
            </div>
          </Link>
        ))}
      </div>
    </article>
  );
}
