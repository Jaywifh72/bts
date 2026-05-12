import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db, listAllSeriesPaths, getSeriesBySlug, getCrewForSeries } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { CrewWhoUsedTable } from '@/components/equipment/CrewWhoUsedTable';
import { posterUrl } from '@/lib/tmdb-image';

interface Props { params: { manufacturer: string; series: string } }

export async function generateStaticParams() {
  // Single-query enumeration of every (manufacturer, series) pair.
  // Replaces the build-time N+1 that fanned out one
  // listSeriesByManufacturer call per manufacturer.
  const rows = await listAllSeriesPaths(db);
  return rows.map((r) => ({ manufacturer: r.manufacturer_slug, series: r.series_slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getSeriesBySlug(db, params.series);
  if (!data) return {};
  return {
    title: data.series.name,
    description: data.series.summary?.split('\n')[0]?.slice(0, 160) ?? data.series.description ?? undefined,
  };
}

const FORMAT_LABELS: Record<string, string> = {
  s16: 'Super 16', s35: 'Super 35', full_frame: 'Full Frame',
  full_frame_plus: 'FF+', large_format: 'Large Format', imax: 'IMAX',
  vista_vision: 'VistaVision',
};

/**
 * Compute spec range stats for a lens series — focal min/max, T-stop
 * extremes, image-circle range. Returns null when not enough items
 * have specs to be meaningful.
 */
function lensRange(items: Array<{ specs: Record<string, unknown> }>) {
  const focals = items.map(i => Number(i.specs?.focal_length_mm)).filter(n => Number.isFinite(n));
  const tstops = items.map(i => Number(i.specs?.max_aperture_t)).filter(n => Number.isFinite(n));
  const circles = items.map(i => Number(i.specs?.image_circle_mm)).filter(n => Number.isFinite(n));
  const formats = new Set(items.map(i => String(i.specs?.lens_format ?? '')).filter(Boolean));
  const mounts = new Set(items.map(i => String(i.specs?.mount ?? '')).filter(Boolean));
  const anam = items.some(i => i.specs?.is_anamorphic === true);
  return {
    focalMin: focals.length ? Math.min(...focals) : null,
    focalMax: focals.length ? Math.max(...focals) : null,
    tstopMin: tstops.length ? Math.min(...tstops) : null,
    circleMin: circles.length ? Math.min(...circles) : null,
    circleMax: circles.length ? Math.max(...circles) : null,
    formats: [...formats],
    mounts: [...mounts],
    anam,
  };
}

function formatRange(min: number | null, max: number | null, suffix: string): string | null {
  if (min == null || max == null) return null;
  if (min === max) return `${min}${suffix}`;
  return `${min}–${max}${suffix}`;
}

export default async function SeriesPage({ params }: Props) {
  const [data, crew] = await Promise.all([
    getSeriesBySlug(db, params.series),
    getCrewForSeries(db, params.series),
  ]);
  if (!data) notFound();
  const { series, items, usedOn } = data;

  const paragraphs = (series.summary ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const isLensSet = series.category === 'lens_set';
  const lensStats = isLensSet ? lensRange(items as Array<{ specs: Record<string, unknown> }>) : null;
  const focalRange = lensStats && formatRange(lensStats.focalMin, lensStats.focalMax, 'mm');
  const circleRange = lensStats && formatRange(lensStats.circleMin, lensStats.circleMax, 'mm');

  return (
    <article>
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
          <Link href={`/gear/${params.manufacturer}`} className="hover:text-amber-400">
            {series.manufacturer_name}
          </Link>
          {' › '}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="font-serif text-4xl text-zinc-50">{series.name}</h1>
          <BookmarkButton
            kind="gear-series"
            slug={series.slug}
            title={series.name}
            subtitle={series.manufacturer_name}
            href={`/gear/${params.manufacturer}/${series.slug}`}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge label={series.category} variant="category" />
          {series.year_introduced && (
            <span className="text-xs text-zinc-500">Introduced {series.year_introduced}</span>
          )}
          {series.year_discontinued && (
            <span className="text-xs text-zinc-500">· Discontinued {series.year_discontinued}</span>
          )}
        </div>

        {/* Lens spec-range bar */}
        {lensStats && items.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {focalRange && (
              <div>
                <div className="font-mono text-2xl text-zinc-50">{focalRange}</div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Focal range</div>
              </div>
            )}
            {lensStats.tstopMin != null && (
              <div>
                <div className="font-mono text-2xl text-zinc-50">T{lensStats.tstopMin}</div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Fastest stop</div>
              </div>
            )}
            {circleRange && (
              <div>
                <div className="font-mono text-2xl text-zinc-50">Ø{circleRange}</div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Image circle</div>
              </div>
            )}
            {lensStats.formats.length > 0 && (
              <div>
                <div className="text-sm text-zinc-50">
                  {lensStats.formats.map(f => FORMAT_LABELS[f] ?? f).join(', ')}
                </div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Format</div>
              </div>
            )}
            {lensStats.mounts.length > 0 && (
              <div>
                <div className="text-sm text-zinc-50">{lensStats.mounts.join(', ')}</div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Mount</div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Editorial summary */}
      {paragraphs.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="About" heading={series.name} />
          <div className="mt-3 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-300">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {paragraphs.length === 0 && series.description && (
        <section className="mb-10">
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">{series.description}</p>
        </section>
      )}

      {/* Signature look callout */}
      {series.signature_look && (
        <section className="mb-10">
          <div className="max-w-3xl rounded border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-relaxed text-amber-100/90">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-amber-500/80">Signature look</div>
            {series.signature_look}
          </div>
        </section>
      )}

      {/* Items — with key specs visible per row */}
      <section className="mb-10">
        <SectionHeader
          label="Catalog"
          heading={`${items.length} ${items.length === 1 ? 'item' : 'items'} in this series`}
        />
        <div className="mt-3 overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-3 py-2 text-left font-medium text-zinc-400">Item</th>
                {isLensSet && (
                  <>
                    <th className="px-3 py-2 text-right font-medium text-zinc-400">Focal</th>
                    <th className="px-3 py-2 text-right font-medium text-zinc-400">T-stop</th>
                    <th className="px-3 py-2 text-right font-medium text-zinc-400">Image Ø</th>
                    <th className="px-3 py-2 text-right font-medium text-zinc-400">Weight</th>
                  </>
                )}
                {!isLensSet && (
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Notes</th>
                )}
                <th className="px-3 py-2 text-left font-medium text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.slug} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                  <td className="px-3 py-2">
                    <Link
                      href={`/gear/${params.manufacturer}/${params.series}/${item.slug}`}
                      className="text-zinc-100 hover:text-amber-400"
                    >
                      {item.name}
                    </Link>
                  </td>
                  {isLensSet && (
                    <>
                      <td className="px-3 py-2 text-right font-mono text-zinc-300">
                        {item.specs?.focal_length_mm != null ? `${item.specs.focal_length_mm}mm` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-300">
                        {item.specs?.max_aperture_t != null ? `T${item.specs.max_aperture_t}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-300">
                        {item.specs?.image_circle_mm != null ? `${item.specs.image_circle_mm}mm` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-300">
                        {item.specs?.weight_kg != null ? `${item.specs.weight_kg}kg` : '—'}
                      </td>
                    </>
                  )}
                  {!isLensSet && (
                    <td className="px-3 py-2 text-zinc-400">
                      {item.description ?? item.notable_uses ?? ''}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <Badge label={item.status} variant="status" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Used on — with poster thumbnails */}
      {usedOn.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            label="Credits"
            heading={`Used on ${usedOn.length} ${usedOn.length === 1 ? 'production' : 'productions'}`}
          />
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {usedOn.map((p) => {
              const poster = posterUrl(p.poster_path, 'w185');
              return (
                <li key={p.production_slug}>
                  <Link
                    href={`/films/${p.production_slug}`}
                    className="group flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-2 hover:border-zinc-600 transition-colors"
                  >
                    <div
                      className="relative shrink-0 overflow-hidden rounded bg-zinc-950"
                      style={{ width: 36, aspectRatio: '2/3' }}
                    >
                      {poster && (
                        <Image src={poster} alt="" fill sizes="36px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm text-zinc-100 group-hover:text-amber-400">
                        {p.production_title}
                      </div>
                      {p.release_year && (
                        <div className="text-xs text-zinc-500">{p.release_year}</div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Crew */}
      {crew.length > 0 && (
        <section id="cinematographers" className="mb-10 scroll-mt-6">
          <SectionHeader label="Crew" heading="Cinematographers who used this" />
          <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
            Camera-department crew on productions where this series was used.
            Same person may appear once per role they held.
          </p>
          <CrewWhoUsedTable rows={crew} />
        </section>
      )}

      {/* Further reading */}
      {series.references && series.references.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="References" heading="Further reading" />
          <ul className="mt-3 space-y-2 text-sm">
            {series.references.map((ref, i) => (
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
    </article>
  );
}
