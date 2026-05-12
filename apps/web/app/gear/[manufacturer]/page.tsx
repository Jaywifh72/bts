import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listManufacturers, getManufacturerBySlug } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface Props { params: Promise<{ manufacturer: string }> }

export async function generateStaticParams() {
  const rows = await listManufacturers(db);
  return rows.map((r) => ({ manufacturer: r.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getManufacturerBySlug(db, params.manufacturer);
  if (!data) return {};
  const m = data.manufacturer;
  return {
    title: m.name,
    description: m.tagline ?? m.description ?? m.summary?.split('\n')[0]?.slice(0, 160) ?? undefined,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  camera_body: 'Cameras',
  lens_set: 'Lenses',
  lighting_fixture: 'Lighting',
  filter: 'Filters',
  recorder: 'Recorders',
  mount: 'Mounts',
  accessory: 'Accessories',
};

const CATEGORY_ORDER = ['camera_body', 'lens_set', 'filter', 'lighting_fixture', 'recorder', 'mount', 'accessory'];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value}</div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

export default async function ManufacturerPage(props: Props) {
  const params = await props.params;
  const data = await getManufacturerBySlug(db, params.manufacturer);
  if (!data) notFound();
  const { manufacturer, series } = data;

  const paragraphs = (manufacturer.summary ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  type Series = (typeof series)[number];
  const seriesByCategory = new Map<string, Series[]>();
  for (const s of series) {
    const list = seriesByCategory.get(s.category) ?? [];
    list.push(s);
    seriesByCategory.set(s.category, list);
  }

  return (
    <article>
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
        </p>
        <div className="mt-3 flex items-start gap-5">
          <BrandLogo
            slug={manufacturer.slug}
            website={manufacturer.website}
            name={manufacturer.name}
            size="lg"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-4xl text-zinc-50">{manufacturer.name}</h1>
            {manufacturer.tagline && (
              <p className="mt-1 text-sm text-zinc-400">{manufacturer.tagline}</p>
            )}
            <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
              {manufacturer.kind.replace(/_/g, ' ')}
              {(manufacturer.headquarters ?? manufacturer.country) ? ` · ${manufacturer.headquarters ?? manufacturer.country}` : ''}
              {manufacturer.founded_year ? ` · Est. ${manufacturer.founded_year}` : ''}
              {manufacturer.parent_company ? ` · ${manufacturer.parent_company}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          <Stat label="Series" value={series.length} />
          <Stat label="Items" value={manufacturer.total_items} />
          {manufacturer.total_productions > 0 && (
            <Stat label="Used on" value={manufacturer.total_productions} />
          )}
          {manufacturer.employee_count != null && (
            <Stat label="Headcount" value={`~${manufacturer.employee_count.toLocaleString()}`} />
          )}
          {manufacturer.founded_year && (
            <Stat label="Founded" value={manufacturer.founded_year} />
          )}
        </div>
      </header>
      {paragraphs.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="About" heading={manufacturer.name} />
          <div className="mt-3 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-300">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}
      {paragraphs.length === 0 && manufacturer.description && (
        <section className="mb-10">
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">{manufacturer.description}</p>
        </section>
      )}
      <section className="mb-10">
        <SectionHeader
          label="Catalog"
          heading={`${series.length} series · ${manufacturer.total_items} item${manufacturer.total_items === 1 ? '' : 's'}`}
        />
        <div className="mt-3 space-y-6">
          {CATEGORY_ORDER.flatMap((cat) => {
            const list = seriesByCategory.get(cat);
            if (!list || list.length === 0) return [];
            return [(
              <div key={cat}>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h3>
                <div className="space-y-2">
                  {list.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/gear/${params.manufacturer}/${s.slug}`}
                      className="group flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-zinc-100 group-hover:text-amber-400">{s.name}</span>
                          {(s.year_introduced || s.year_discontinued) && (
                            <span className="text-xs text-zinc-500">
                              {s.year_introduced ?? '?'}–{s.year_discontinued ?? 'present'}
                            </span>
                          )}
                        </div>
                        {(s.summary || s.description) && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                            {s.summary ?? s.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                        <span>{s.item_count} items</span>
                        {s.production_count > 0 && (
                          <span className="text-amber-500/70">{s.production_count} films</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )];
          })}
        </div>
      </section>
      {manufacturer.references && manufacturer.references.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="References" heading="Further reading" />
          <ul className="mt-3 space-y-2 text-sm">
            {manufacturer.references.map((ref, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <a href={ref.url} target="_blank" rel="noopener noreferrer"
                   className="text-zinc-100 hover:text-amber-400">
                  {ref.title}
                </a>
                {ref.publication && (
                  <span className="text-xs text-zinc-500">{ref.publication}</span>
                )}
                {ref.kind && (
                  <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                    {ref.kind.replace(/_/g, ' ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer className="border-t border-zinc-800 pt-6">
        <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Resources</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {manufacturer.website && (
            <a href={manufacturer.website} target="_blank" rel="noopener noreferrer"
               className="text-zinc-300 hover:text-amber-400">
              Official website ↗
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}
