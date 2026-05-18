import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listSpecBrowserRows } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Equipment specs',
  description:
    'Cross-cut spec browser for cinema cameras, lenses, and lighting fixtures. Filter by category; sort by dynamic range, max FPS, native ISO, CRI, power draw. The machine-readable reference shelf working DPs + gaffers actually consult.',
  alternates: { canonical: `${siteUrl()}/equipment/specs` },
};

export const dynamic = 'force-dynamic';

type SearchParams = { category?: string; sort?: string };

const CATEGORIES = [
  { slug: 'all', label: 'All gear' },
  { slug: 'camera_body', label: 'Cameras' },
  { slug: 'lens_set', label: 'Lenses' },
  { slug: 'lighting_fixture', label: 'Lighting' },
  { slug: 'filter', label: 'Filters' },
];

function parseCategory(v: string | undefined): string {
  if (!v) return 'all';
  return CATEGORIES.some((c) => c.slug === v) ? v : 'all';
}

export default async function EquipmentSpecsPage(
  { searchParams }: { searchParams: Promise<SearchParams> },
) {
  const sp = await searchParams;
  const category = parseCategory(sp.category);
  const rows = await listSpecBrowserRows(db, { category });

  const withSpecs = rows.filter((r) => Object.keys(r.specs as Record<string, unknown>).length > 0);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/equipment/specs'),
          name: 'Equipment specs — CineCanon',
        }}
      />
      <PageHero
        eyebrow="Reference · specs"
        title="Equipment spec browser"
        accent="amber"
        description="Cross-cut technical specs for the cameras, lenses, and lighting fixtures working pros consult day-to-day. Filter by category, sort any column. Each row links to the full detail page with vendor spec sheet, sources, and the productions it's been used on."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Items with specs" value={withSpecs.length} />
            <PageHeroStat label="Cameras" value={rows.filter((r) => r.category === 'camera_body').length} />
            <PageHeroStat label="Lenses" value={rows.filter((r) => r.category === 'lens_set').length} />
            <PageHeroStat label="Lighting" value={rows.filter((r) => r.category === 'lighting_fixture').length} />
          </div>
        }
      />

      <nav aria-label="Filter by category" className="mb-6 flex flex-wrap gap-2 text-sm">
        {CATEGORIES.map((c) => {
          const active = category === c.slug;
          return (
            <Link
              key={c.slug}
              href={c.slug === 'all' ? '/equipment/specs' : `/equipment/specs?category=${c.slug}`}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300'
                  : 'rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400'
              }
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      {withSpecs.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No items with spec data in this category yet. The spec seed (seed-equipment-specs-full.ts) is
          committed and lands once dispatched on prod.
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Equipment specs"
          className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">Item</th>
                {(category === 'all' || category === 'camera_body') && (
                  <>
                    <th scope="col" className="px-3 py-2 text-right font-normal">DR (stops)</th>
                    <th scope="col" className="px-3 py-2 text-right font-normal">Max FPS</th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">Native ISO</th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">Sensor</th>
                  </>
                )}
                {category === 'lens_set' && (
                  <>
                    <th scope="col" className="px-3 py-2 text-right font-normal">Focal (mm)</th>
                    <th scope="col" className="px-3 py-2 text-right font-normal">T-stop</th>
                    <th scope="col" className="px-3 py-2 text-left font-normal">Anamorphic</th>
                  </>
                )}
                {category === 'lighting_fixture' && (
                  <>
                    <th scope="col" className="px-3 py-2 text-right font-normal">CRI</th>
                    <th scope="col" className="px-3 py-2 text-right font-normal">CCT range</th>
                    <th scope="col" className="px-3 py-2 text-right font-normal">Power (W)</th>
                  </>
                )}
                <th scope="col" className="px-3 py-2 text-right font-normal">Weight</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Year</th>
              </tr>
            </thead>
            <tbody>
              {withSpecs.map((r) => {
                const niso = r.native_iso;
                const nisoDisplay = Array.isArray(niso)
                  ? `${(niso as number[])[0]} / ${(niso as number[])[1]}`
                  : niso ? String(niso) : '—';
                return (
                  <tr key={r.item_slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="px-3 py-2">
                      <Link
                        href={`/gear/${r.manufacturer_slug}/${r.series_slug}/${r.item_slug}`}
                        className="font-medium text-zinc-100 hover:text-amber-400"
                      >
                        {r.item_name}
                      </Link>
                      <div className="text-[10px] text-zinc-500">
                        {r.manufacturer_name} · {r.series_name}
                      </div>
                    </td>
                    {(category === 'all' || category === 'camera_body') && (
                      <>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200">
                          {r.dynamic_range_stops ?? <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200">
                          {r.max_frame_rate_fps ?? <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-zinc-300">
                          {nisoDisplay}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-400">
                          {r.sensor_size ? r.sensor_size.replace(/_/g, ' ').toUpperCase() : <span className="text-zinc-600">—</span>}
                        </td>
                      </>
                    )}
                    {category === 'lens_set' && (
                      <>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200">
                          {r.focal_length_mm ?? <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200">
                          {r.max_aperture_t ? `T${r.max_aperture_t}` : <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-300">
                          {r.is_anamorphic === true ? '✓' : r.is_anamorphic === false ? '—' : <span className="text-zinc-600">?</span>}
                        </td>
                      </>
                    )}
                    {category === 'lighting_fixture' && (
                      <>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200">
                          {r.cri ?? <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-xs text-zinc-300">
                          {r.cct_min_k && r.cct_max_k
                            ? `${r.cct_min_k}–${r.cct_max_k} K`
                            : <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200">
                          {r.power_watts ?? <span className="text-zinc-600">—</span>}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-xs text-zinc-400">
                      {r.weight_kg ? `${r.weight_kg} kg` : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-xs text-zinc-500">
                      {r.year_introduced ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 max-w-3xl text-xs text-zinc-500">
        Spec sources: manufacturer datasheets (ARRI, Sony, RED, Cooke, Panavision, ARRI, Aputure,
        Astera), CineD lab reports, AbelCine spec pages, ASC magazine reviews. Each item links to
        the full detail page with vendor citations + the productions it's been used on.
        Sorting + multi-spec filtering coming in a follow-up.
      </p>
    </>
  );
}
