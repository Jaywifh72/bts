import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'By decade',
  description: 'Browse the archive by decade of release. 1920s through 2020s.',
  alternates: { canonical: `${siteUrl()}/decades` },
};

export const revalidate = 86400;

type DecadeRow = {
  decade: number;
  total: number;
  curated: number;
  exemplars: Array<{ slug: string; title: string; year: number; poster_path: string | null }>;
};

export default async function DecadesPage() {
  const rows = await db.execute<DecadeRow>(sql`
    WITH per_decade AS (
      SELECT
        (FLOOR(release_year::numeric / 10) * 10)::int AS decade,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE data_tier = 'curated')::int AS curated
      FROM productions
      WHERE release_year IS NOT NULL
      GROUP BY decade
    )
    SELECT
      pd.*,
      (
        SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
        FROM (
          SELECT p.slug, p.title, p.release_year AS year, p.poster_path
          FROM productions p
          WHERE (FLOOR(p.release_year::numeric / 10) * 10)::int = pd.decade
            AND p.data_tier = 'curated'
          ORDER BY p.popularity DESC NULLS LAST, p.title
          LIMIT 4
        ) e
      ) AS exemplars
    FROM per_decade pd
    ORDER BY pd.decade DESC
  `);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/decades'), name: 'Browse by decade — CineCanon' }} />
      <PageHero
        eyebrow="Atlas"
        title="By decade"
        accent="purple"
        description="A century of cinematography on one page. Each decade links to the curated dossiers that anchor it — and the technologies, schools, and signature DPs that defined its look."
      />

      <section className="mb-12">
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((d) => (
            <li
              key={d.decade}
              className="rounded border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-2xl text-zinc-100">{d.decade}s</h3>
                <p className="text-xs text-zinc-500">
                  {d.total} films · {d.curated} curated
                </p>
              </div>
              {d.exemplars.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {d.exemplars.map((e) => (
                    <li key={e.slug}>
                      <Link href={`/films/${e.slug}`} className="text-zinc-300 hover:text-amber-400">
                        {e.title} ({e.year})
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px]">
                <Link
                  href={`/films?decade=${d.decade}s`}
                  className="text-amber-400 hover:underline"
                >
                  Browse all {d.total} {d.decade}s films →
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
