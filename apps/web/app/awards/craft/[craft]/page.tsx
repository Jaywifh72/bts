import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';
import { orgLabel } from '@/lib/award-labels';
import { CRAFTS, getCraft } from '@/lib/awards/crafts';
import {
  getCraftSummaries,
  getTopRecipientsForCraft,
  listAwardsByCraft,
} from '@/lib/awards/queries';

export const revalidate = 86400;

const RECIPIENT_PATH = {
  person: '/crew',
  vfx_house: '/vfx',
  stunt_company: '/stunts/companies',
  production: '/films',
} as const;

export function generateStaticParams() {
  return CRAFTS.map((c) => ({ craft: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ craft: string }> },
): Promise<Metadata> {
  const { craft } = await params;
  const def = getCraft(craft);
  if (!def) return { title: 'Awards' };
  return {
    title: `${def.name} Awards`,
    description: `${def.name} — every documented win and nomination across the major industry-recognition organisations. ${def.tagline}.`,
    alternates: { canonical: `${siteUrl()}/awards/craft/${def.slug}` },
  };
}

export default async function CraftAwardsPage(
  { params }: { params: Promise<{ craft: string }> },
) {
  const { craft } = await params;
  const def = getCraft(craft);
  if (!def) notFound();

  const [summaries, topRecipients, recentWins, recentNoms] = await Promise.all([
    getCraftSummaries(),
    getTopRecipientsForCraft(def.slug, 20),
    listAwardsByCraft(def.slug, { winnersOnly: true, limit: 50 }),
    listAwardsByCraft(def.slug, { winnersOnly: false, limit: 100 }),
  ]);

  const summary = summaries.find((s) => s.craft === def.slug);
  // Drop wins from the noms list so the two strips don't double-count.
  const nomsOnly = recentNoms.filter((a) => !a.is_winner).slice(0, 30);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl(`/awards/craft/${def.slug}`),
          name: `${def.name} Awards — CineCanon`,
          isPartOf: { '@type': 'CollectionPage', '@id': absoluteUrl('/awards') },
        }}
      />

      <PageHero
        eyebrow="Awards · craft"
        title={def.name}
        accent="amber"
        description={`${def.tagline}. Cross-cut of every documented win and nomination — Oscars, BAFTAs, Cannes, society awards, festival prizes — filtered to ${def.name.toLowerCase()}.`}
        stats={summary ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Total entries" value={summary.total} />
            <PageHeroStat label="Wins" value={summary.wins} />
            <PageHeroStat label="Awarding bodies" value={summary.orgs} />
            <PageHeroStat label="Years" value={`${summary.year_min}–${summary.year_max}`} />
          </div>
        ) : undefined}
      />

      {/* Craft strip — quick jump between crafts. */}
      <nav aria-label="Other crafts" className="mb-8 flex flex-wrap gap-2 text-sm">
        {CRAFTS.map((c) => {
          const isActive = c.slug === def.slug;
          const count = summaries.find((s) => s.craft === c.slug)?.total ?? 0;
          if (count === 0 && !isActive) return null;
          return (
            <Link
              key={c.slug}
              href={`/awards/craft/${c.slug}`}
              aria-current={isActive ? 'page' : undefined}
              className={`rounded border px-2.5 py-1 ${
                isActive
                  ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                  : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-amber-700 hover:text-amber-400'
              }`}
            >
              {c.name} <span className="ml-1 font-mono text-[10px] text-zinc-500">{count}</span>
            </Link>
          );
        })}
      </nav>

      {summary == null || summary.total === 0 ? (
        <section className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No documented awards in this craft yet. The catalogue grows as new
          deep-dive entries land — check back, or browse{' '}
          <Link href="/awards" className="text-amber-400 hover:text-amber-300">
            all awards
          </Link>{' '}
          to see what's in scope today.
        </section>
      ) : (
        <>
          {/* Top recipients */}
          {topRecipients.length > 0 && (
            <section className="mb-12">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-zinc-100">Top recipients</h2>
                <p className="text-xs text-zinc-500">By wins, then nominations</p>
              </div>
              <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {topRecipients.map((r, i) => (
                  <li
                    key={`${r.recipient_kind}-${r.recipient_slug}`}
                    className="flex items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm"
                  >
                    <span className="w-5 text-right font-mono text-[10px] text-zinc-500">
                      {i + 1}
                    </span>
                    <Link
                      href={`${RECIPIENT_PATH[r.recipient_kind]}/${r.recipient_slug}`}
                      className="flex-1 text-zinc-200 hover:text-amber-400"
                    >
                      {r.recipient_name}
                    </Link>
                    <span className="font-mono text-xs text-amber-400">
                      {r.wins} <span className="text-zinc-500">w</span>
                    </span>
                    <span className="font-mono text-xs text-zinc-400">
                      {r.noms} <span className="text-zinc-500">n</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Recent wins */}
          {recentWins.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-3 font-serif text-xl text-zinc-100">
                Recent wins
                <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
                  ({recentWins.length} shown)
                </span>
              </h2>
              <ul className="space-y-1.5 text-sm">
                {recentWins.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-amber-400">
                      <span aria-hidden="true">✓ </span>WON
                    </span>
                    <span className="text-zinc-300">{orgLabel(a.award_org)}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-200">{a.category}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="font-mono text-xs text-zinc-500">{a.year}</span>
                    <span className="text-zinc-600">→</span>
                    <Link
                      href={`/films/${a.production_slug}`}
                      className="text-zinc-200 hover:text-amber-400"
                    >
                      {a.production_title}
                    </Link>
                    {a.recipient_slug && a.recipient_name && (
                      <>
                        <span className="text-zinc-500">·</span>
                        <Link
                          href={`${RECIPIENT_PATH[a.recipient_kind]}/${a.recipient_slug}`}
                          className="text-amber-400/80 hover:text-amber-400"
                        >
                          {a.recipient_name}
                        </Link>
                      </>
                    )}
                    {a.source_url && (
                      <a
                        href={a.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto font-mono text-[10px] text-amber-400 hover:text-amber-300"
                      >
                        [src] <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recent nominations (excluding wins above) */}
          {nomsOnly.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-3 font-serif text-xl text-zinc-100">
                Recent nominations
                <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
                  ({nomsOnly.length} shown)
                </span>
              </h2>
              <ul className="space-y-1.5 text-sm">
                {nomsOnly.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-zinc-400">
                      <span aria-hidden="true">○ </span>NOM
                    </span>
                    <span className="text-zinc-300">{orgLabel(a.award_org)}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-200">{a.category}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="font-mono text-xs text-zinc-500">{a.year}</span>
                    <span className="text-zinc-600">→</span>
                    <Link
                      href={`/films/${a.production_slug}`}
                      className="text-zinc-200 hover:text-amber-400"
                    >
                      {a.production_title}
                    </Link>
                    {a.recipient_slug && a.recipient_name && (
                      <>
                        <span className="text-zinc-500">·</span>
                        <Link
                          href={`${RECIPIENT_PATH[a.recipient_kind]}/${a.recipient_slug}`}
                          className="text-amber-400/80 hover:text-amber-400"
                        >
                          {a.recipient_name}
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mb-12 text-xs text-zinc-500">
            Looking for the full filterable list?{' '}
            <Link href={`/awards?craft=${def.slug}#results`} className="text-amber-400 hover:text-amber-300">
              Open the awards index with this craft pre-selected →
            </Link>
          </p>
        </>
      )}
    </>
  );
}
