import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Awards',
  description:
    'Cross-organisation index of every documented award win and nomination in the curated archive — Oscars, BAFTAs, Cannes, Venice, Critics Choice, ASC Awards, VES, Spirit Awards, Golden Globes.',
  alternates: { canonical: `${siteUrl()}/awards` },
};

export const revalidate = 86400;

const ORG_LABELS: Record<string, string> = {
  academy_awards: 'Academy Awards',
  bafta: 'BAFTA',
  cannes: 'Cannes',
  venice: 'Venice',
  berlin: 'Berlin',
  golden_globes: 'Golden Globes',
  critics_choice: 'Critics Choice',
  asc_award: 'ASC Award',
  aso_award: 'ASO Award',
  csc_award: 'CSC Award',
  bsc_award: 'BSC Award',
  spirit_awards: 'Independent Spirit Awards',
  ves_award: 'VES Award',
  eca: 'ECA',
  other: 'Other',
};

type OrgRow = {
  award_org: string;
  total: number;
  wins: number;
  year_range: string;
  recent_winners: Array<{ slug: string; title: string; year: number; category: string }>;
};

export default async function AwardsPage() {
  const rows = await db.execute<OrgRow>(sql`
    WITH by_org AS (
      SELECT
        a.award_org::text AS award_org,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.is_winner)::int AS wins,
        MIN(a.year) || '–' || MAX(a.year) AS year_range
      FROM production_awards a
      GROUP BY a.award_org
    )
    SELECT
      bo.*,
      (
        SELECT COALESCE(json_agg(row_to_json(w)), '[]'::json)
        FROM (
          SELECT p.slug, p.title, a2.year, a2.category
          FROM production_awards a2
          JOIN productions p ON p.id = a2.production_id
          WHERE a2.award_org::text = bo.award_org AND a2.is_winner = TRUE
          ORDER BY a2.year DESC, p.title
          LIMIT 6
        ) w
      ) AS recent_winners
    FROM by_org bo
    ORDER BY bo.total DESC
  `);

  const [stats] = await db.execute<{ total: number; wins: number; orgs: number; year_min: number; year_max: number }>(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_winner)::int AS wins,
      COUNT(DISTINCT award_org)::int AS orgs,
      MIN(year)::int AS year_min,
      MAX(year)::int AS year_max
    FROM production_awards
  `);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/awards'), name: 'Awards — CineCanon' }} />
      <PageHero
        eyebrow="Cross-cut"
        title="Awards"
        accent="amber"
        description="Every documented win and nomination across the major industry-recognition organisations — Oscars, BAFTAs, Cannes, Venice, Critics Choice, ASC, VES, Spirit Awards. Cited and indexed."
        stats={stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Total entries" value={stats.total} />
            <PageHeroStat label="Wins" value={stats.wins} />
            <PageHeroStat label="Orgs" value={stats.orgs} />
            <PageHeroStat label="Years" value={`${stats.year_min}–${stats.year_max}`} />
          </div>
        ) : undefined}
      />

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">By organisation</h2>
        <ul className="space-y-4">
          {rows.map((o) => (
            <li key={o.award_org} className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-lg text-zinc-100">{ORG_LABELS[o.award_org] ?? o.award_org}</h3>
                <p className="text-xs text-zinc-500">
                  {o.wins} wins · {o.total} entries · {o.year_range}
                </p>
              </div>
              {o.recent_winners.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Recent wins</p>
                  <ul className="mt-1 space-y-1">
                    {o.recent_winners.map((w, i) => (
                      <li key={`${o.award_org}-${i}`} className="text-sm">
                        <span className="font-mono text-amber-500/70">{w.year}</span>{' '}
                        <Link href={`/films/${w.slug}`} className="text-zinc-200 hover:text-amber-400">
                          {w.title}
                        </Link>
                        <span className="ml-2 text-xs text-zinc-500">— {w.category}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
