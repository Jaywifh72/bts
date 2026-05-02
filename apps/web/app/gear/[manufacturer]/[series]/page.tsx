import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listManufacturers, listSeriesByManufacturer, getSeriesBySlug, getCrewForSeries } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { CrewWhoUsedTable } from '@/components/equipment/CrewWhoUsedTable';

interface Props { params: { manufacturer: string; series: string } }

export async function generateStaticParams() {
  const manufacturers = await listManufacturers(db);
  const params = await Promise.all(
    manufacturers.map(async (m) => {
      const series = await listSeriesByManufacturer(db, m.slug);
      return series.map((s) => ({ manufacturer: m.slug, series: s.slug }));
    })
  );
  return params.flat();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getSeriesBySlug(db, params.series);
  return data ? { title: data.series.name } : {};
}

export default async function SeriesPage({ params }: Props) {
  const [data, crew] = await Promise.all([
    getSeriesBySlug(db, params.series),
    getCrewForSeries(db, params.series),
  ]);
  if (!data) notFound();
  const { series, items, usedOn } = data;

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
          <Link href={`/gear/${params.manufacturer}`} className="hover:text-amber-400">
            {series.manufacturer_name}
          </Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{series.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge label={series.category} variant="category" />
          {series.year_introduced && (
            <span className="text-xs text-zinc-500">Introduced {series.year_introduced}</span>
          )}
          {series.year_discontinued && (
            <span className="text-xs text-zinc-500">Discontinued {series.year_discontinued}</span>
          )}
        </div>
        {series.description && (
          <p className="mt-3 max-w-2xl text-zinc-400">{series.description}</p>
        )}
      </header>

      <div className="mb-8">
        <SectionHeader label="Products" heading="Items" />
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/gear/${params.manufacturer}/${params.series}/${item.slug}`}
              className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors"
            >
              <span className="text-zinc-100">{item.name}</span>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Badge label={item.status} variant="status" />
                {item.year_introduced && <span>Introduced {item.year_introduced}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {usedOn.length > 0 && (
        <div className="mb-8">
          <SectionHeader label="Credits" heading="Used on" />
          <ul className="space-y-1">
            {usedOn.map((p) => (
              <li key={p.production_slug} className="flex items-center gap-3 text-sm">
                <Link href={`/films/${p.production_slug}`} className="text-zinc-200 hover:text-amber-400">
                  {p.production_title}
                </Link>
                {p.release_year && <span className="text-zinc-500">{p.release_year}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {crew.length > 0 && (
        <div id="cinematographers" className="scroll-mt-6">
          <SectionHeader label="Crew" heading="Cinematographers" />
          <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
            Camera-department crew on productions where this series was used.
            Same person may appear once per role they held.
          </p>
          <CrewWhoUsedTable rows={crew} />
        </div>
      )}
    </article>
  );
}
