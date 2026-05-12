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
  examples: Array<{ slug: string; title: string; year: number | null; location_name: string }>;
};

export default async function LocationsPage() {
  // Aggregate by country with 3 example productions per country. Single
  // round-trip via a JSON aggregate. Locations data is small (currently
  // ~70 rows), so this scales for years.
  const rows = await db.execute<CountryRow>(sql`
    WITH per_country AS (
      SELECT
        COALESCE(pl.country, 'Unknown') AS country,
        COUNT(*)::int AS location_count,
        COUNT(DISTINCT pl.production_id)::int AS production_count
      FROM production_locations pl
      GROUP BY COALESCE(pl.country, 'Unknown')
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
      (
        SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
        FROM (
          SELECT slug, title, year, location_name
          FROM examples WHERE country = pc.country
          LIMIT 3
        ) e
      ) AS examples
    FROM per_country pc
    ORDER BY pc.location_count DESC, pc.country ASC
    LIMIT 25
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
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/locations'), name: 'Shooting locations — Studio Pro' }} />
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
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.country} className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-lg text-zinc-100">{c.country}</h3>
                <p className="text-xs text-zinc-500">
                  {c.location_count} {c.location_count === 1 ? 'location' : 'locations'} · {c.production_count} productions
                </p>
              </div>
              {c.examples.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {c.examples.map((e) => (
                    <li key={e.slug}>
                      <Link href={`/films/${e.slug}`} className="text-zinc-300 hover:text-amber-400">
                        {e.title}{e.year ? ` (${e.year})` : ''}
                      </Link>
                      <span className="ml-1 text-zinc-600">— {e.location_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">About</p>
        Coordinates are WGS-84 lat/long pairs stored at 6-decimal precision. An
        interactive clustered-pin map is on the roadmap; today the country
        index is the entry point. Read{' '}
        <Link href="/methodology" className="text-amber-400 hover:underline">the methodology</Link>{' '}for sourcing.
      </aside>
    </>
  );
}
