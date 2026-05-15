import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql, listAwards, listAwardYears, type AwardOrg, type AwardRecipientType } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';
import { ORG_LABELS, orgLabel } from '@/lib/award-labels';

export const metadata: Metadata = {
  title: 'Awards',
  description:
    'Cross-organisation index of every documented award win and nomination in the curated archive — Oscars, BAFTAs, Cannes, Venice, Critics Choice, ASC Awards, VES, Spirit Awards, Golden Globes, Taurus, SAG Stunt Ensemble. Filterable by org, year, category, and recipient type.',
  alternates: { canonical: `${siteUrl()}/awards` },
};

// The page query is filter-driven, so we can't pre-render every shape.
// `revalidate` still bounds the cache for the (default) no-filter view.
export const revalidate = 86400;

type OrgRow = {
  award_org: string;
  total: number;
  wins: number;
  year_range: string;
  recent_winners: Array<{ slug: string; title: string; year: number; category: string }>;
};

type SearchParams = {
  org?: string;
  year?: string;
  category?: string;
  recipient?: string;
  wins?: string;
};

const RECIPIENT_LABELS: Record<AwardRecipientType, string> = {
  person: 'Person (DP, director, etc.)',
  vfx_house: 'VFX house',
  stunt_company: 'Stunt company',
  production: 'Production (Best Picture, etc.)',
};

const RECIPIENT_PATH: Record<AwardRecipientType, string> = {
  person: '/crew',
  vfx_house: '/vfx',
  stunt_company: '/stunts/companies',
  production: '/films',
};

function parseOrg(v: string | undefined): AwardOrg | 'all' {
  if (!v) return 'all';
  return (v in ORG_LABELS) ? (v as AwardOrg) : 'all';
}

function parseRecipient(v: string | undefined): AwardRecipientType | 'all' {
  if (!v) return 'all';
  return v === 'person' || v === 'vfx_house' || v === 'stunt_company' || v === 'production'
    ? v : 'all';
}

export default async function AwardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const org = parseOrg(sp.org);
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : ('all' as const);
  const category = (sp.category ?? '').trim();
  const recipient = parseRecipient(sp.recipient);
  const winnersOnly = sp.wins === '1';

  const [byOrg, stats, years, filtered] = await Promise.all([
    // Existing summary: counts per org + recent wins for the per-org panel.
    db.execute<OrgRow>(sql`
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
            -- UX-audit (CO-4): 3 recent wins per org instead of 6 in the
            -- default view. The filter form above gives a way to drill into
            -- any org's full list. Cuts the default-view scroll from
            -- ~3430px to ~2000px.
            LIMIT 3
          ) w
        ) AS recent_winners
      FROM by_org bo
      ORDER BY bo.total DESC
    `),
    // Hero stats.
    db.execute<{ total: number; wins: number; orgs: number; year_min: number; year_max: number }>(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_winner)::int AS wins,
        COUNT(DISTINCT award_org)::int AS orgs,
        MIN(year)::int AS year_min,
        MAX(year)::int AS year_max
      FROM production_awards
    `).then((r) => r[0]),
    // Year dropdown options.
    listAwardYears(db),
    // Filtered results table (driven by query string).
    listAwards(db, { org, year, category: category || undefined, recipientKind: recipient, winnersOnly, limit: 200 }),
  ]);

  const hasFilter = org !== 'all' || year !== 'all' || category !== '' || recipient !== 'all' || winnersOnly;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/awards'), name: 'Awards — CineCanon' }} />
      <PageHero
        eyebrow="Cross-cut"
        title="Awards"
        accent="amber"
        description="Every documented win and nomination across the major industry-recognition organisations — Oscars, BAFTAs, Cannes, Venice, Critics Choice, ASC, VES, Spirit Awards, Taurus, SAG Stunt Ensemble. Cited and indexed."
        stats={stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Total entries" value={stats.total} />
            <PageHeroStat label="Wins" value={stats.wins} />
            <PageHeroStat label="Orgs" value={stats.orgs} />
            <PageHeroStat label="Years" value={`${stats.year_min}–${stats.year_max}`} />
          </div>
        ) : undefined}
      />

      {/* Filter form. Server-rendered: submit reloads with new query string. */}
      <section className="mb-10 rounded border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 font-serif text-base text-zinc-100">Find awards</h2>
        {/* UX-audit 2026-05-15: action="#results" so a filter submit lands */}
        {/* at the results section rather than scrolling to the top of the page. */}
        <form method="get" action="#results" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">Organisation</span>
            <select
              name="org"
              defaultValue={org}
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="all">All</option>
              {(Object.keys(ORG_LABELS) as AwardOrg[]).map((k) => (
                <option key={k} value={k}>{ORG_LABELS[k]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">Year</span>
            <select
              name="year"
              defaultValue={year === 'all' ? '' : String(year)}
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="">All</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">Category contains</span>
            <input
              name="category"
              defaultValue={category}
              placeholder="e.g. cinematography"
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">Recipient type</span>
            <select
              name="recipient"
              defaultValue={recipient}
              className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="person">Person</option>
              <option value="vfx_house">VFX house</option>
              <option value="stunt_company">Stunt company</option>
              <option value="production">Production (no specific recipient)</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                name="wins"
                value="1"
                defaultChecked={winnersOnly}
                className="accent-amber-600"
              />
              Wins only
            </label>
            <button
              type="submit"
              className="ml-auto rounded bg-amber-600 px-3 py-1 text-sm font-medium text-zinc-950 hover:bg-amber-500"
            >
              Filter
            </button>
            {hasFilter && (
              <Link
                href="/awards"
                className="text-xs text-zinc-500 hover:text-amber-400"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Filter results — only when a filter is active; otherwise show the
          per-org summary panels (familiar landing-state). The id="results"
          paired with form action="#results" above keeps the visitor's
          scroll near the result list after a filter submit. */}
      {hasFilter ? (
        <section id="results" className="scroll-mt-4 mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">
            Results ({filtered.length}{filtered.length === 200 ? '+' : ''})
          </h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">No awards match these filters. Try widening org / year, or remove the wins-only toggle.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {filtered.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <span
                    className={`font-mono text-xs ${a.is_winner ? 'text-amber-400' : 'text-zinc-500'}`}
                    title={a.is_winner ? 'Won' : 'Nominated'}
                  >
                    {a.is_winner ? 'WON' : 'NOM'}
                  </span>
                  <span className="text-zinc-300">{orgLabel(a.award_org)}</span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-200">{a.category}</span>
                  <span className="text-zinc-500">·</span>
                  <span className="font-mono text-xs text-zinc-500">{a.year}</span>
                  <span className="text-zinc-600">→</span>
                  <Link href={`/films/${a.production_slug}`} className="text-zinc-200 hover:text-amber-400">
                    {a.production_title}
                  </Link>
                  {a.recipient_slug && a.recipient_name && (
                    <>
                      <span className="text-zinc-500">·</span>
                      <Link
                        href={`${RECIPIENT_PATH[a.recipient_kind]}/${a.recipient_slug}`}
                        className="text-amber-400/80 hover:text-amber-400"
                        title={RECIPIENT_LABELS[a.recipient_kind]}
                      >
                        {a.recipient_name}
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        // Same id as the filtered-results branch — covers the case where
        // the visitor submits an empty filter (no query string parsed
        // into hasFilter=true): they still land at the panels section.
        <section id="results" className="scroll-mt-4 mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">By organisation</h2>
          <ul className="space-y-4">
            {byOrg.map((o) => (
              <li key={o.award_org} className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-lg text-zinc-100">{ORG_LABELS[o.award_org as AwardOrg] ?? o.award_org}</h3>
                  <p className="text-xs text-zinc-500">
                    {o.wins} wins · {o.total} entries · {o.year_range}
                  </p>
                </div>
                {o.recent_winners.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Recent wins</p>
                      {/* UX-audit (CO-4): direct path to the full list */}
                      {/* via the filter form on the same page. */}
                      <Link
                        href={`/awards?org=${o.award_org}&wins=1#results`}
                        className="text-[10px] uppercase tracking-wide text-amber-500/70 hover:text-amber-400"
                      >
                        See all {o.wins} →
                      </Link>
                    </div>
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
      )}
    </>
  );
}
