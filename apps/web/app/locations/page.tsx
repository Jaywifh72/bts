import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shooting locations',
  description:
    'Every documented shooting location across the curated archive — geocoded, country-tagged, production-attributed.',
  alternates: { canonical: `${siteUrl()}/locations` },
};

export const revalidate = 86400;

type CountryRow = {
  country: string;
  location_count: number;
  production_count: number;
  year_min: number | null;
  year_max: number | null;
  top_format: string | null;
  examples: Array<{ slug: string; title: string; year: number | null; location_name: string }>;
};

type SortKey = 'locations' | 'productions' | 'country' | 'recent';

function parseSort(v: string | undefined): SortKey {
  return v === 'productions' || v === 'country' || v === 'recent' ? v : 'locations';
}

function SortHeader({ sort, target, label }: { sort: SortKey; target: SortKey; label: string }) {
  const isActive = sort === target;
  const href = target === 'locations' ? '/locations' : `/locations?sort=${target}`;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (target === 'country' ? 'ascending' : 'descending') : 'none'}
      className="px-3 py-2 text-left font-normal"
    >
      <Link
        href={href}
        className={`hover:text-amber-400 ${isActive ? 'text-amber-300' : ''}`}
      >
        {label}
        {isActive && <span aria-hidden="true">{target === 'country' ? ' ↑' : ' ↓'}</span>}
      </Link>
    </th>
  );
}

export default async function LocationsPage({ searchParams }: { searchParams?: Promise<{ sort?: string }> }) {
  const sp = searchParams ? await searchParams : {};
  const sort = parseSort(sp.sort);
  const orderClause = sort === 'productions'
    ? sql`pc.production_count DESC, pc.country ASC`
    : sort === 'country'
      ? sql`pc.country ASC`
      : sort === 'recent'
        ? sql`pc.year_max DESC NULLS LAST, pc.country ASC`
        : sql`pc.location_count DESC, pc.country ASC`;

  // Aggregate by country: counts, year range, top primary-acquisition format,
  // and 3 example productions. Single round-trip via JSON aggregate. The
  // modal-format CTE is split out because Postgres won't recognize the
  // `pl.country` reference inside a correlated subquery against an
  // outer GROUP BY that buckets by `COALESCE(pl.country, 'Unknown')` —
  // the expression-vs-column equivalence isn't planner-detected.
  const rows = await db.execute<CountryRow>(sql`
    WITH per_country AS (
      SELECT
        COALESCE(pl.country, 'Unknown') AS country,
        COUNT(*)::int AS location_count,
        COUNT(DISTINCT pl.production_id)::int AS production_count,
        MIN(p.release_year)::int AS year_min,
        MAX(p.release_year)::int AS year_max
      FROM production_locations pl
      JOIN productions p ON p.id = pl.production_id
      GROUP BY COALESCE(pl.country, 'Unknown')
    ),
    country_formats AS (
      -- count primary-format usage per country
      SELECT COALESCE(pl.country, 'Unknown') AS country,
             pf.acquisition_format,
             COUNT(*)::int AS n,
             ROW_NUMBER() OVER (
               PARTITION BY COALESCE(pl.country, 'Unknown')
               ORDER BY COUNT(*) DESC
             ) AS rn
      FROM production_locations pl
      JOIN production_formats pf
        ON pf.production_id = pl.production_id AND pf.is_primary = true
      WHERE pf.acquisition_format IS NOT NULL
      GROUP BY COALESCE(pl.country, 'Unknown'), pf.acquisition_format
    ),
    top_format AS (
      SELECT country, acquisition_format AS top_format
      FROM country_formats WHERE rn = 1
    ),
    examples AS (
      SELECT DISTINCT ON (COALESCE(pl.country, 'Unknown'), p.slug)
        COALESCE(pl.country, 'Unknown') AS country,
        p.slug, p.title, p.release_year AS year, pl.name AS location_name
      FROM production_locations pl
      JOIN productions p ON p.id = pl.production_id
      ORDER BY COALESCE(pl.country, 'Unknown'), p.slug, p.release_year DESC NULLS LAST
    )
    SELECT
      pc.country,
      pc.location_count,
      pc.production_count,
      pc.year_min,
      pc.year_max,
      tf.top_format,
      (
        SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
        FROM (
          SELECT slug, title, year, location_name
          FROM examples WHERE country = pc.country
          LIMIT 3
        ) e
      ) AS examples
    FROM per_country pc
    LEFT JOIN top_format tf ON tf.country = pc.country
    ORDER BY ${orderClause}
    LIMIT 50
  `);

  const [stats] = await db.execute<{ total_locations: number; total_countries: number; total_productions: number }>(sql`
    SELECT
      COUNT(*)::int AS total_locations,
      COUNT(DISTINCT country)::int AS total_countries,
      COUNT(DISTINCT production_id)::int AS total_productions
    FROM production_locations
  `);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/locations'), name: 'Shooting locations — CineCanon' }} />
      <PageHero
        eyebrow="Atlas"
        title="Shooting locations"
        accent="emerald"
        description="Every documented shooting location in the curated archive. Geocoded, country-tagged, production-attributed. Click a country to drill into the films it hosted."
        stats={stats ? (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Locations" value={stats.total_locations} />
            <PageHeroStat label="Countries" value={stats.total_countries} />
            <PageHeroStat label="Productions" value={stats.total_productions} />
          </div>
        ) : undefined}
      />

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">By country</h2>
        <div
          tabIndex={0}
          role="region"
          aria-label="Locations by country"
          className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <SortHeader sort={sort} target="country"     label="Country" />
                <SortHeader sort={sort} target="locations"   label="Locations" />
                <SortHeader sort={sort} target="productions" label="Productions" />
                <SortHeader sort={sort} target="recent"      label="Years" />
                <th scope="col" className="px-3 py-2 text-left font-normal">Top format</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Example films</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.country} className="border-b border-zinc-900 align-top hover:bg-zinc-900/40">
                  <td className="px-3 py-2 font-medium text-zinc-100">{c.country}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-zinc-400">{c.location_count}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-zinc-400">{c.production_count}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-zinc-400">
                    {c.year_min && c.year_max
                      ? c.year_min === c.year_max
                        ? c.year_min
                        : `${c.year_min}–${c.year_max}`
                      : <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {c.top_format ?? <span className="text-zinc-500">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {c.examples.length === 0 ? (
                      <span className="text-zinc-500">—</span>
                    ) : (
                      <ul className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                        {c.examples.map((e) => (
                          <li key={e.slug}>
                            <Link href={`/films/${e.slug}`} className="text-zinc-300 hover:text-amber-400">
                              {e.title}{e.year ? ` (${e.year})` : ''}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-400">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-300">About</p>
        Coordinates are WGS-84 lat/long pairs stored at 6-decimal precision. An
        interactive clustered-pin map is on the roadmap. Read{' '}
        <Link href="/methodology" className="text-amber-400 hover:underline">the methodology</Link>{' '}for sourcing.
      </aside>
    </>
  );
}
