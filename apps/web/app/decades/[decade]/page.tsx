import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, sql } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { ProductionCard } from '@/components/productions/ProductionCard';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

/**
 * Theme F4 / UX-audit second-pass — `/decades/[decade]` real dossier.
 *
 * The first audit flagged `/decades` as "the worst page on the site" — a
 * flat list of decades with no detail route. This adds the dossier the
 * decade-as-comparative-axis deserves:
 *
 *   • Timeline strip — every curated film as a dot on the year axis
 *   • Format share by year — modal acquisition_format aggregated
 *   • Aspect-ratio shifts — count per (year, aspect) for the period
 *   • Signature DPs — most-credited cinematographers of the decade
 *   • Curated dossiers grid — the films we have full coverage on
 *
 * For decades where coverage is thin (1920s–1950s typically), we render
 * an HONEST "Coverage forthcoming" panel rather than faking density.
 */

export const revalidate = 86400;

const VALID_DECADES = new Set([
  '1900', '1910', '1920', '1930', '1940', '1950',
  '1960', '1970', '1980', '1990', '2000', '2010', '2020',
]);

type Props = { params: Promise<{ decade: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { decade } = await props.params;
  if (!VALID_DECADES.has(decade)) return {};
  return {
    title: `The ${decade}s — by decade`,
    description: `Cinematography in the ${decade}s: signature DPs, format share, aspect-ratio shifts, and the curated dossiers that anchor the decade.`,
    alternates: { canonical: `${siteUrl()}/decades/${decade}` },
  };
}

export async function generateStaticParams() {
  return Array.from(VALID_DECADES).map((decade) => ({ decade }));
}

export default async function DecadeDossierPage(props: Props) {
  const { decade: decadeParam } = await props.params;
  if (!VALID_DECADES.has(decadeParam)) notFound();
  const decade = parseInt(decadeParam, 10);
  const decadeEnd = decade + 9;

  const [stats, byYear, formatShare, aspectShare, signatureDps, curated] = await Promise.all([
    db.execute<{ total: number; curated: number; with_format: number; with_dp: number }>(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE p.data_tier = 'curated')::int AS curated,
        COUNT(DISTINCT pf.production_id)::int AS with_format,
        COUNT(DISTINCT ca.production_id)::int AS with_dp
      FROM productions p
      LEFT JOIN production_formats pf
        ON pf.production_id = p.id AND pf.is_primary = true
      LEFT JOIN crew_assignments ca ON ca.production_id = p.id
      LEFT JOIN roles r ON r.id = ca.role_id
        AND (r.name ILIKE '%cinematograph%' OR r.slug ILIKE 'director-of-photo%')
      WHERE p.release_year BETWEEN ${decade} AND ${decadeEnd}
    `).then((r) => r[0]),

    // Films per year — timeline strip data.
    db.execute<{ year: number; total: number; curated: number }>(sql`
      SELECT p.release_year::int AS year,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE p.data_tier = 'curated')::int AS curated
      FROM productions p
      WHERE p.release_year BETWEEN ${decade} AND ${decadeEnd}
      GROUP BY p.release_year
      ORDER BY p.release_year
    `),

    // Format share — count per (acquisition_format) for the period.
    db.execute<{ acquisition_format: string; n: number }>(sql`
      SELECT pf.acquisition_format, COUNT(*)::int AS n
      FROM productions p
      JOIN production_formats pf
        ON pf.production_id = p.id AND pf.is_primary = true
      WHERE p.release_year BETWEEN ${decade} AND ${decadeEnd}
        AND pf.acquisition_format IS NOT NULL
      GROUP BY pf.acquisition_format
      ORDER BY n DESC
      LIMIT 8
    `),

    // Aspect-ratio share — same shape, different column.
    db.execute<{ aspect_ratio: string; n: number }>(sql`
      SELECT pf.aspect_ratio, COUNT(*)::int AS n
      FROM productions p
      JOIN production_formats pf
        ON pf.production_id = p.id AND pf.is_primary = true
      WHERE p.release_year BETWEEN ${decade} AND ${decadeEnd}
        AND pf.aspect_ratio IS NOT NULL
      GROUP BY pf.aspect_ratio
      ORDER BY n DESC
      LIMIT 6
    `),

    // Signature DPs of the decade — most-credited cinematographers.
    db.execute<{ slug: string; display_name: string; film_count: number; profile_path: string | null }>(sql`
      SELECT pp.slug, pp.display_name, pp.profile_path,
             COUNT(DISTINCT ca.production_id)::int AS film_count
      FROM crew_assignments ca
      JOIN people pp ON pp.id = ca.person_id
      JOIN roles r ON r.id = ca.role_id
      JOIN productions p ON p.id = ca.production_id
      WHERE p.release_year BETWEEN ${decade} AND ${decadeEnd}
        AND (r.name ILIKE '%cinematograph%' OR r.slug ILIKE 'director-of-photo%')
      GROUP BY pp.id
      HAVING COUNT(DISTINCT ca.production_id) >= 1
      ORDER BY film_count DESC, pp.display_name
      LIMIT 12
    `),

    // Curated dossiers grid.
    db.execute<{
      slug: string; title: string; type: string; release_year: number;
      synopsis: string | null; primary_aspect_ratio: string | null;
      primary_acquisition_format: string | null; poster_path: string | null;
      data_tier: 'curated' | 'imported';
    }>(sql`
      SELECT p.slug, p.title, p.type, p.release_year, p.synopsis,
             pf.aspect_ratio AS primary_aspect_ratio,
             pf.acquisition_format AS primary_acquisition_format,
             p.poster_path, p.data_tier
      FROM productions p
      LEFT JOIN production_formats pf
        ON pf.production_id = p.id AND pf.is_primary = true
      WHERE p.release_year BETWEEN ${decade} AND ${decadeEnd}
        AND p.data_tier = 'curated'
      ORDER BY p.popularity DESC NULLS LAST, p.title
      LIMIT 12
    `),
  ]);

  const totalFormatCount = formatShare.reduce((acc, r) => acc + r.n, 0);
  const totalAspectCount = aspectShare.reduce((acc, r) => acc + r.n, 0);
  const maxYearCount = Math.max(1, ...byYear.map((r) => r.total));

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'CineCanon', path: '/' },
    { name: 'By decade', path: '/decades' },
    { name: `${decade}s`, path: `/decades/${decade}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <PageHero
        eyebrow="Atlas · By decade"
        title={`The ${decade}s`}
        accent="zinc"
        description={
          stats && stats.total === 0
            ? `No productions from the ${decade}s in the archive yet. Coverage forthcoming.`
            : `Cinematography in the ${decade}s: format share, aspect-ratio shifts, signature DPs, and the curated dossiers that anchor the decade.`
        }
        stats={stats && stats.total > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Films indexed" value={stats.total.toLocaleString()} />
            <PageHeroStat label="Curated dossiers" value={stats.curated.toLocaleString()} />
            <PageHeroStat label="With primary format" value={stats.with_format.toLocaleString()} />
            <PageHeroStat label="With DP credit" value={stats.with_dp.toLocaleString()} />
          </div>
        ) : undefined}
        actions={
          <Link
            href={`/films?decade=${decade}`}
            className="text-xs text-zinc-400 hover:text-amber-400"
          >
            All {stats?.total ?? 0} films in {decade}s <span aria-hidden="true">→</span>
          </Link>
        }
      />

      {/* HONEST coverage gate — if nothing in this decade, surface the
          gap and route the user back instead of pretending we have data. */}
      {stats && stats.total === 0 ? (
        <section className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
          <p>
            The archive doesn't yet index any productions from the {decade}s. Curation
            priority is currently weighted toward the 2010s and 2020s where source
            availability is highest.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            See <Link href="/methodology" className="text-amber-400 hover:underline">the methodology page</Link> for
            the coverage roadmap, or <Link href="/decades" className="text-amber-400 hover:underline">browse other decades</Link>.
          </p>
        </section>
      ) : (
        <>
          {/* Timeline strip — bar chart of films per year, curated overlaid */}
          <section className="mb-10">
            <h2 className="mb-4 font-serif text-xl text-zinc-100">Timeline · films per year</h2>
            <div
              role="img"
              aria-label={`Films released per year in the ${decade}s. Amber bars indicate curated dossiers; grey bars are all indexed films.`}
              className="overflow-x-auto rounded border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex items-end gap-2" style={{ height: '160px' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const year = decade + i;
                  const row = byYear.find((r) => r.year === year);
                  const total = row?.total ?? 0;
                  const curated = row?.curated ?? 0;
                  const totalH = (total / maxYearCount) * 100;
                  const curatedH = (curated / maxYearCount) * 100;
                  return (
                    <div key={year} className="flex flex-1 flex-col items-center gap-1">
                      <div className="relative flex w-full flex-1 items-end" style={{ minHeight: '120px' }}>
                        <div
                          aria-hidden="true"
                          title={`${year}: ${total} films (${curated} curated)`}
                          className="w-full bg-zinc-700"
                          style={{ height: `${totalH}%` }}
                        />
                        {curated > 0 && (
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 w-full bg-amber-500"
                            style={{ height: `${curatedH}%` }}
                          />
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-zinc-400">{year % 100}</p>
                      <p className="font-mono text-[10px] text-zinc-500">{total}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-wide text-zinc-300">
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className="inline-block h-2 w-3 bg-amber-500" /> curated
                </span>
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className="inline-block h-2 w-3 bg-zinc-700" /> all indexed
                </span>
              </p>
            </div>
          </section>

          {/* Format + aspect share — two narrow tables side by side */}
          <section className="mb-10 grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 font-serif text-xl text-zinc-100">Format share</h2>
              {formatShare.length === 0 ? (
                <p className="text-xs text-zinc-400">No primary-format data attached to {decade}s films yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {formatShare.map((f) => {
                    const pct = totalFormatCount > 0 ? (f.n / totalFormatCount) * 100 : 0;
                    return (
                      <li key={f.acquisition_format} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-zinc-200" title={f.acquisition_format}>
                          {f.acquisition_format}
                        </span>
                        <div className="relative h-3 flex-1 overflow-hidden rounded bg-zinc-800">
                          <div
                            aria-hidden="true"
                            className="h-full bg-amber-600/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-300">
                          {f.n}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <h2 className="mb-3 font-serif text-xl text-zinc-100">Aspect ratio</h2>
              {aspectShare.length === 0 ? (
                <p className="text-xs text-zinc-400">No aspect-ratio data attached to {decade}s films yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {aspectShare.map((a) => {
                    const pct = totalAspectCount > 0 ? (a.n / totalAspectCount) * 100 : 0;
                    return (
                      <li key={a.aspect_ratio} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 truncate font-mono text-zinc-200">
                          {a.aspect_ratio}
                        </span>
                        <div className="relative h-3 flex-1 overflow-hidden rounded bg-zinc-800">
                          <div
                            aria-hidden="true"
                            className="h-full bg-blue-500/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-300">
                          {a.n}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Signature DPs of the decade */}
          <section className="mb-10">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">
                Signature DPs
                <span className="ml-2 text-sm font-normal text-zinc-400">most-credited cinematographers</span>
              </h2>
              <Link href={`/films?decade=${decade}`} className="text-xs text-zinc-400 hover:text-amber-400">
                Filter all films <span aria-hidden="true">→</span>
              </Link>
            </div>
            {signatureDps.length === 0 ? (
              <p className="text-xs text-zinc-400">No DP credits attached to {decade}s films yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {signatureDps.map((dp) => (
                  <li key={dp.slug}>
                    <Link
                      href={`/crew/${dp.slug}`}
                      className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
                    >
                      <p className="font-serif text-base text-zinc-100">{dp.display_name}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {dp.film_count} {dp.film_count === 1 ? 'credit' : 'credits'} in the {decade}s
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Curated dossier grid */}
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">
                Curated dossiers
                <span className="ml-2 text-sm font-normal text-zinc-400">{curated.length} of {stats?.curated ?? 0}</span>
              </h2>
              <Link href={`/films?decade=${decade}&tier=curated`} className="text-xs text-zinc-400 hover:text-amber-400">
                All curated <span aria-hidden="true">→</span>
              </Link>
            </div>
            {curated.length === 0 ? (
              <p className="text-xs text-zinc-400">
                No fully-curated {decade}s dossiers yet. The{' '}
                <Link href="/methodology" className="text-amber-400 hover:underline">methodology page</Link>{' '}
                describes the curation priority.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {curated.map((row) => (
                  <ProductionCard
                    key={row.slug}
                    slug={row.slug}
                    title={row.title}
                    type={row.type}
                    releaseYear={row.release_year}
                    synopsis={row.synopsis}
                    primaryAspectRatio={row.primary_aspect_ratio}
                    primaryAcquisitionFormat={row.primary_acquisition_format}
                    posterPath={row.poster_path}
                    dataTier={row.data_tier}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
