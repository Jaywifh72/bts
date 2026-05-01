import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listManufacturers, listSeriesByManufacturer, listItemsBySeries, getItemBySlug } from '@bts/db';
import { SpecsTable } from '@/components/equipment/SpecsTable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface Props { params: { manufacturer: string; series: string; item: string } }

export async function generateStaticParams() {
  const manufacturers = await listManufacturers(db);
  const params = await Promise.all(
    manufacturers.map(async (m) => {
      const series = await listSeriesByManufacturer(db, m.slug);
      return Promise.all(
        series.map(async (s) => {
          const items = await listItemsBySeries(db, s.slug);
          return items.map((i) => ({
            manufacturer: m.slug,
            series: s.slug,
            item: i.slug,
          }));
        })
      );
    })
  );
  return params.flat(2);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getItemBySlug(db, params.item);
  return data ? { title: data.item.name } : {};
}

export default async function ItemPage({ params }: Props) {
  const data = await getItemBySlug(db, params.item);
  if (!data) notFound();
  const { item, usedOn } = data;

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
          <Link href={`/gear/${params.manufacturer}`} className="hover:text-amber-400">
            {item.manufacturer_name}
          </Link>
          {' › '}
          <Link href={`/gear/${params.manufacturer}/${params.series}`} className="hover:text-amber-400">
            {item.series_name}
          </Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{item.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge label={item.series_category} variant="category" />
          <Badge label={item.status} variant="status" />
          {item.model_number && (
            <span className="text-xs text-zinc-500">Model: {item.model_number}</span>
          )}
          {item.year_introduced && (
            <span className="text-xs text-zinc-500">Introduced {item.year_introduced}</span>
          )}
          {item.year_discontinued && (
            <span className="text-xs text-zinc-500">Discontinued {item.year_discontinued}</span>
          )}
        </div>
      </header>

      <div className="mb-8">
        <SectionHeader label="Technical" heading="Specifications" />
        <SpecsTable category={item.series_category} specs={item.specs} />
      </div>

      {usedOn.length > 0 && (
        <div>
          <SectionHeader label="Credits" heading="Used on" />
          <div className="overflow-x-auto rounded border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Production</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Year</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Scene</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Setup</th>
                </tr>
              </thead>
              <tbody>
                {usedOn.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                    <td className="px-3 py-2">
                      <Link href={`/films/${row.production_slug}`} className="text-zinc-200 hover:text-amber-400">
                        {row.production_title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-400">{row.release_year ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-400">{row.scene_title}</td>
                    <td className="px-3 py-2 text-zinc-500">{row.setup_label ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}
