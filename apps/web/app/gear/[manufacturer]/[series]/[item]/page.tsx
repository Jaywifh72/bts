import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db, listAllGearPaths, getItemBySlug, getCrewForItem } from '@bts/db';
import { SpecsTable } from '@/components/equipment/SpecsTable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { CrewWhoUsedTable } from '@/components/equipment/CrewWhoUsedTable';
import { SensorCoverageList } from '@/components/equipment/SensorCoverageList';
import { JsonLd, buildProductJsonLd } from '@/lib/jsonLd';

interface Props { params: { manufacturer: string; series: string; item: string } }

export async function generateStaticParams() {
  // Single-query enumeration of every (manufacturer, series, item)
  // triple. Replaces the build-time N+M+K fan-out.
  const rows = await listAllGearPaths(db);
  return rows.map((r) => ({
    manufacturer: r.manufacturer_slug,
    series: r.series_slug,
    item: r.item_slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getItemBySlug(db, params.item);
  if (!data) return {};
  return {
    title: data.item.name,
    description: data.item.value_proposition ?? data.item.description ?? data.item.notable_uses ?? data.item.series_summary?.split('\n')[0]?.slice(0, 160) ?? undefined,
  };
}

const FORMAT_LABELS: Record<string, string> = {
  s16: 'Super 16', s35: 'Super 35', full_frame: 'Full Frame',
  full_frame_plus: 'FF+', large_format: 'Large Format', imax: 'IMAX',
  vista_vision: 'VistaVision',
};

function heroSpecs(category: string, specs: Record<string, unknown>): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (category === 'lens_set') {
    if (specs.focal_length_mm != null) out.push({ label: 'Focal length', value: `${specs.focal_length_mm} mm` });
    if (specs.max_aperture_t != null) out.push({ label: 'Max aperture', value: `T${specs.max_aperture_t}` });
    if (specs.image_circle_mm != null) out.push({ label: 'Image circle', value: `${specs.image_circle_mm} mm` });
    if (specs.lens_format != null) out.push({ label: 'Format', value: FORMAT_LABELS[String(specs.lens_format)] ?? String(specs.lens_format) });
    if (specs.mount != null) out.push({ label: 'Mount', value: String(specs.mount) });
    if (specs.weight_kg != null) out.push({ label: 'Weight', value: `${specs.weight_kg} kg` });
    if (specs.is_anamorphic === true) {
      const sq = specs.anamorphic_squeeze;
      out.push({ label: 'Squeeze', value: sq != null ? `${sq}×` : '2×' });
    }
  } else if (category === 'camera_body') {
    if (specs.sensor_size != null) out.push({ label: 'Sensor', value: String(specs.sensor_size).replace(/_/g, ' ') });
    if (specs.sensor_resolution_max != null) out.push({ label: 'Max resolution', value: String(specs.sensor_resolution_max) });
    if (specs.max_frame_rate_fps != null) out.push({ label: 'Max FPS', value: `${specs.max_frame_rate_fps}` });
    if (specs.dynamic_range_stops != null) out.push({ label: 'Dynamic range', value: `${specs.dynamic_range_stops} stops` });
    if (specs.mount != null) out.push({ label: 'Mount', value: String(specs.mount) });
    if (specs.weight_kg != null) out.push({ label: 'Weight', value: `${specs.weight_kg} kg` });
  } else if (category === 'lighting_fixture') {
    if (specs.fixture_kind != null) out.push({ label: 'Type', value: String(specs.fixture_kind).replace(/_/g, ' ') });
    if (specs.color_temperature_range_k != null) out.push({ label: 'CCT', value: `${specs.color_temperature_range_k} K` });
    if (specs.rgb_color_mixing === true) out.push({ label: 'RGB', value: 'Yes' });
    if (specs.weight_kg != null) out.push({ label: 'Weight', value: `${specs.weight_kg} kg` });
  } else if (category === 'filter') {
    if (specs.filter_kind != null) out.push({ label: 'Type', value: String(specs.filter_kind).replace(/_/g, ' ') });
    if (specs.subkind != null) out.push({ label: 'Subkind', value: String(specs.subkind) });
    if (Array.isArray(specs.strengths_available)) out.push({ label: 'Strength', value: specs.strengths_available.join(', ') });
  }
  return out;
}

export default async function ItemPage({ params }: Props) {
  const [data, crew] = await Promise.all([
    getItemBySlug(db, params.item),
    getCrewForItem(db, params.item),
  ]);
  if (!data) notFound();
  const { item, usedOn } = data;

  const jsonLd = buildProductJsonLd({
    manufacturerSlug: params.manufacturer,
    seriesSlug: params.series,
    itemSlug: params.item,
    name: item.name,
    manufacturerName: item.manufacturer_name,
    category: item.series_category,
    description: item.value_proposition ?? item.description ?? undefined,
  });

  const hero = heroSpecs(item.series_category, item.specs);
  const images = item.images ?? [];
  const compat = item.compatibility ?? {};
  const hasCompat =
    compat.mount ||
    (compat.compatible_cameras?.length ?? 0) > 0 ||
    (compat.compatible_lens_mounts?.length ?? 0) > 0 ||
    compat.adapter_notes;

  // Auto-derive sensor coverage when this is a lens item with a curated image circle.
  const imageCircleMm = item.series_category === 'lens_set' && typeof item.specs?.image_circle_mm === 'number'
    ? item.specs.image_circle_mm
    : null;

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        <header className="mb-8 border-b border-zinc-800 pb-8">
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
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="font-serif text-4xl text-zinc-50">{item.name}</h1>
            <BookmarkButton
              kind="gear-item"
              slug={item.slug}
              title={item.name}
              subtitle={`${item.manufacturer_name} ${item.series_name}`}
              href={`/gear/${params.manufacturer}/${params.series}/${item.slug}`}
            />
          </div>
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

          {item.value_proposition && (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-200">
              {item.value_proposition}
            </p>
          )}

          {hero.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {hero.map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-xl text-zinc-50">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Image gallery — Wikimedia Commons / manufacturer-public images */}
        {images.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="Gallery" heading={`${images.length} ${images.length === 1 ? 'photo' : 'photos'}`} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img, i) => (
                <figure key={i} className="overflow-hidden rounded border border-zinc-800 bg-zinc-900">
                  <a href={img.url} target="_blank" rel="noopener noreferrer">
                    <div className="relative aspect-[4/3] w-full bg-zinc-950">
                      <Image
                        src={img.url}
                        alt={img.caption ?? item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        referrerPolicy="no-referrer"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </a>
                  {(img.caption || img.credit) && (
                    <figcaption className="border-t border-zinc-800 px-3 py-2 text-xs">
                      {img.caption && <span className="text-zinc-300">{img.caption}</span>}
                      {img.credit && (
                        <span className="ml-2 text-zinc-600">
                          — {img.credit}
                        </span>
                      )}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* About — full editorial blurb */}
        {item.description && (
          <section className="mb-10">
            <SectionHeader label="About" heading={item.name} />
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
              {item.description}
            </p>
          </section>
        )}

        {/* When it's used */}
        {item.notable_uses && (
          <section className="mb-10">
            <SectionHeader label="Use" heading="When it's pulled" />
            <div className="mt-3 max-w-3xl rounded border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-relaxed text-amber-100/90">
              {item.notable_uses}
            </div>
          </section>
        )}

        {/* Compatibility — mounts + camera bodies + adapter notes */}
        {hasCompat && (
          <section className="mb-10">
            <SectionHeader label="Fit" heading="Compatibility" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {compat.mount && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Native mount</div>
                  <div className="mt-1 font-mono text-base text-zinc-100">{compat.mount}</div>
                </div>
              )}
              {compat.compatible_cameras && compat.compatible_cameras.length > 0 && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Common camera bodies</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {compat.compatible_cameras.map((c) => (
                      <span key={c} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {compat.compatible_lens_mounts && compat.compatible_lens_mounts.length > 0 && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Accepts lens mounts</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {compat.compatible_lens_mounts.map((m) => (
                      <span key={m} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {compat.adapter_notes && (
                <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 sm:col-span-2">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Adapter / mount notes</div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">{compat.adapter_notes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Sensor coverage — auto-derived for lenses with a curated image circle */}
        {imageCircleMm != null && (
          <section className="mb-10">
            <SectionHeader label="Coverage" heading="Sensor coverage" />
            <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
              Auto-derived from this lens&apos;s {imageCircleMm} mm image circle against
              manufacturer-published sensor active areas.
              <Link href="/tools/coverage" className="ml-1 text-amber-400 hover:underline">
                Run a per-aspect calculation →
              </Link>
            </p>
            <SensorCoverageList imageCircleMm={imageCircleMm} />
          </section>
        )}

        {/* Full specs table */}
        <section className="mb-10">
          <SectionHeader label="Technical" heading="Specifications" />
          <div className="mt-3">
            <SpecsTable category={item.series_category} specs={item.specs} />
          </div>
        </section>

        {/* Used on */}
        {usedOn.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              label="Credits"
              heading={`Used on ${usedOn.length} ${usedOn.length === 1 ? 'production' : 'productions'}`}
            />
            <div className="mt-3 overflow-x-auto rounded border border-zinc-800">
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
          </section>
        )}

        {/* Crew */}
        {crew.length > 0 && (
          <section id="cinematographers" className="mb-10 scroll-mt-6">
            <SectionHeader label="Crew" heading="Cinematographers" />
            <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
              Camera-department crew on productions where this specific item
              was used. Same person may appear once per role they held.
            </p>
            <CrewWhoUsedTable rows={crew} />
          </section>
        )}

        {/* Resources */}
        <footer className="border-t border-zinc-800 pt-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Resources</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href={`/gear/${params.manufacturer}/${params.series}`} className="text-zinc-300 hover:text-amber-400">
              ← All {item.series_name}
            </Link>
            <Link href={`/gear/${params.manufacturer}`} className="text-zinc-300 hover:text-amber-400">
              {item.manufacturer_name} catalog
            </Link>
            {item.manufacturer_website && (
              <a href={item.manufacturer_website} target="_blank" rel="noopener noreferrer"
                 className="text-zinc-300 hover:text-amber-400">
                Manufacturer site ↗
              </a>
            )}
          </div>
        </footer>
      </article>
    </>
  );
}
