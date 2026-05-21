import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  sql,
  listFeaturedProductions,
  countProductions,
  listRecentlyUpdatedProductions,
  getShotOfTheDay,
  getShotsOfTheDay,
  getEditorialDepthStats,
  listRecentlyResolvedCorrections,
  listRecentCitations,
} from '@bts/db';
import Image from 'next/image';
import { ProductionCard } from '@/components/productions/ProductionCard';
import { ShotOfTheDayCard } from '@/components/productions/ShotOfTheDayCard';
import { formatRelativeTime } from '@/lib/format-time';
import { safeAuth } from '@/lib/safe-auth';

const HOMEPAGE_DESCRIPTION =
  'CineCanon is the cinematic technical reference for working camera-department professionals — cited, confidence-graded data on what every film was shot on, by whom, with what gear, lighting, color, sound, music, stunts, and VFX.';

export const metadata: Metadata = {
  title: 'CineCanon — Cinematic Technical Reference',
  description: HOMEPAGE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
    title: 'CineCanon — Cinematic Technical Reference',
    description: HOMEPAGE_DESCRIPTION,
  },
  twitter: {
    title: 'CineCanon — Cinematic Technical Reference',
    description: HOMEPAGE_DESCRIPTION,
  },
};

// QA — revalidate hourly. The depth-stats subqueries change at most a
// few times per day, the shot-of-the-day rotates daily, so hourly is a
// safe upper bound for cache freshness.
export const revalidate = 3600;

import { KILLER_QUERIES } from '@/lib/queries-index';

// UX-audit G9 — homepage rail is the first three entries of the canonical
// `/queries` list (single source of truth). Add a new query → it can land
// on the homepage by being one of the first three in `lib/queries-index`.
const queries = KILLER_QUERIES.slice(0, 3).map((q) => ({
  href: `/queries/${q.slug}`,
  title: q.title,
  description: q.description,
}));

export default async function HomePage() {
  // E-49 — pin shot-of-the-day to today's UTC date so the value rotates
  // at midnight UTC for everyone.
  const todayKey = new Date().toISOString().slice(0, 10);
  // QA P2-4 2026-05-20: the "Coverage dashboard → /admin" link burned a
  // guaranteed 307 redirect for every anon visitor and crawler. Render
  // it only for signed-in users.
  const session = await safeAuth();
  const [
    featured, totalCurated, totalAll, recentlyUpdatedRaw,
    shotOfTheDay, depthStats,
    recentCorrections, recentCitations, shotWall, awardsStats,
    soundStats, musicStats,
  ] = await Promise.all([
    listFeaturedProductions(db, 6),
    countProductions(db, { dataTier: 'curated' }),
    countProductions(db),
    // Over-fetch so we still have ≥ 4 after deduplicating against Featured.
    listRecentlyUpdatedProductions(db, 10),
    getShotOfTheDay(db, todayKey),
    getEditorialDepthStats(db),
    // Homepage Move 3 — archive-this-week rail.
    listRecentlyResolvedCorrections(db, 5),
    listRecentCitations(db, 5),
    getShotsOfTheDay(db, todayKey, 8),
    // Awards roll-up for the depth-grid tile. Live from production_awards so
    // the homepage count moves the moment a new award row lands.
    db.execute<{ total: number; wins: number; orgs: number }>(sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE is_winner)::int AS wins,
             COUNT(DISTINCT award_org)::int AS orgs
      FROM production_awards
    `).then((r) => r[0] ?? { total: 0, wins: 0, orgs: 0 }),
    // Sound depth — post-houses tagged sound + sound-department crew count.
    db.execute<{ houses: number; people: number }>(sql`
      SELECT
        (SELECT COUNT(*)::int FROM post_houses WHERE kind IN ('sound_mix', 'sound_design')) AS houses,
        (SELECT COUNT(DISTINCT ca.person_id)::int
           FROM crew_assignments ca
           JOIN roles r ON r.id = ca.role_id
          WHERE r.slug IN ('production-sound-mixer','sound-designer','re-recording-mixer',
                           'foley-artist','boom-operator','supervising-sound-editor','dialog-editor')) AS people
    `).then((r) => r[0] ?? { houses: 0, people: 0 }),
    // Music depth — scoring stages + composer/music-supervisor crew count.
    db.execute<{ stages: number; composers: number }>(sql`
      SELECT
        (SELECT COUNT(*)::int FROM scoring_stages) AS stages,
        (SELECT COUNT(DISTINCT ca.person_id)::int
           FROM crew_assignments ca
           JOIN roles r ON r.id = ca.role_id
          WHERE r.slug IN ('composer','co-composer','orchestrator','music-supervisor','music-editor')) AS composers
    `).then((r) => r[0] ?? { stages: 0, composers: 0 }),
  ]);

  // UX-audit 2026-05-15: Anora etc. were appearing in BOTH rails within
  // 800px of scroll. Recently Updated explicitly excludes anything that's
  // already on the Featured rail so the two sections show distinct content.
  const featuredSlugs = new Set(featured.map((f) => f.slug));
  const recentlyUpdated = recentlyUpdatedRaw
    .filter((r) => !featuredSlugs.has(r.slug))
    .slice(0, 4);

  return (
    <>
      {/* Hero — leads with the moat. */}
      <div className="mb-12 border-b border-zinc-800 pb-10">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-500/80">
          Reference shelf for working camera-department professionals
        </p>
        <h1 className="mt-2 font-serif text-5xl leading-none text-zinc-50">
          CineCanon
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">
          A working reference for cinematic technical craft —
          <span className="text-zinc-100"> what was shot, on what, by whom,
          and what proves it.</span> Every claim cited and confidence-graded.
          Every URL canonical and back-cited. Pro-grade tools you'll bookmark.
        </p>

        {/* Ask anything — promoted from /ask. */}
        <form action="/ask" method="get" className="mt-6 flex max-w-2xl gap-2">
          <input
            name="q"
            type="search"
            placeholder="Ask: e.g. 'Lubezki anamorphic at golden hour before 2015'"
            className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
            aria-label="Ask anything"
          />
          <button
            type="submit"
            className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500"
          >
            Ask →
          </button>
        </form>
        {/* UX-audit 2026-05-15: chips used to be flat 11px grey text — */}
        {/* read as a label, not a button. Now bordered + padded so the */}
        {/* primary first-interaction affordance is obvious. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Try</span>
          <Link
            href="/ask?q=Roger+Deakins+photochemical+finishing"
            className="rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-amber-600 hover:bg-amber-950/30 hover:text-amber-300 transition-colors"
          >
            Deakins photochemical workflow
          </Link>
          <Link
            href="/ask?q=ALEXA+65+anamorphic+features"
            className="rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-amber-600 hover:bg-amber-950/30 hover:text-amber-300 transition-colors"
          >
            ALEXA 65 anamorphic
          </Link>
          <Link
            href="/ask?q=magic+hour+exterior+lighting+2023"
            className="rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-amber-600 hover:bg-amber-950/30 hover:text-amber-300 transition-colors"
          >
            magic-hour 2023
          </Link>
        </div>
      </div>

      {/* UX-audit second pass (Move 3) — replaced three marketing tiles
          with a real archive-this-week rail. A returning DP lands here
          and immediately sees what changed since their last visit. */}
      <section className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-50">
            Archive this week
            <span className="ml-2 text-sm font-normal text-zinc-400">
              {totalAll.toLocaleString()} productions · {totalCurated} curated dossiers
            </span>
          </h2>
          {session && (
            <Link href="/admin" className="text-xs text-zinc-500 hover:text-amber-400">
              Coverage dashboard <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Column 1 — recently resolved corrections */}
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-300">
              Corrections resolved
            </p>
            {recentCorrections.length === 0 ? (
              <p className="text-xs text-zinc-400">
                No corrections resolved recently. Spot something wrong on any page?{' '}
                <span className="text-zinc-300">Use the "Report claim error" link in the page footer.</span>
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentCorrections.map((c) => (
                  <li key={c.id} className="border-l-2 border-amber-700/40 pl-2.5">
                    {c.production_slug && c.production_title ? (
                      <Link
                        href={`/films/${c.production_slug}`}
                        className="font-medium text-zinc-100 hover:text-amber-400"
                      >
                        {c.production_title}
                      </Link>
                    ) : (
                      <span className="font-medium text-zinc-100">Site-wide</span>
                    )}
                    <p className="mt-0.5 line-clamp-2 text-zinc-400">{c.message}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      <time dateTime={c.resolved_at}>{formatRelativeTime(c.resolved_at)}</time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Column 2 — recently attached citations */}
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-300">
              Citations attached
            </p>
            {recentCitations.length === 0 ? (
              <p className="text-xs text-zinc-400">
                No new source citations in the last cycle. The bibliography is at{' '}
                <Link href="/references" className="text-amber-400 hover:underline">/references</Link>.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentCitations.map((c) => (
                  <li key={`${c.claim_id}-${c.source_id}`} className="border-l-2 border-amber-700/40 pl-2.5">
                    <p className="line-clamp-1 font-medium text-zinc-100">
                      {c.source_publication ? (
                        <span className="text-zinc-400">{c.source_publication} · </span>
                      ) : null}
                      {c.source_title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-zinc-400">
                      <span className="text-zinc-500">→ </span>{c.claim_statement}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      <span className="rounded border border-zinc-700 px-1 py-px text-zinc-300">
                        {c.confidence}
                      </span>
                      <time dateTime={c.attached_at}>{formatRelativeTime(c.attached_at)}</time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Column 3 — productions touched */}
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-300">
              Productions touched
            </p>
            {recentlyUpdatedRaw.length === 0 ? (
              <p className="text-xs text-zinc-400">No edits in the recent window.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentlyUpdatedRaw.slice(0, 5).map((r) => (
                  <li key={r.slug} className="border-l-2 border-amber-700/40 pl-2.5">
                    <Link
                      href={`/films/${r.slug}`}
                      className="font-medium text-zinc-100 hover:text-amber-400"
                    >
                      {r.title}
                    </Link>{' '}
                    <span className="text-zinc-500">{r.release_year ? `(${r.release_year})` : ''}</span>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      <time dateTime={r.last_verified_at ?? ''}>
                        {r.last_verified_at ? formatRelativeTime(r.last_verified_at) : '—'}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* UX-audit second pass — Shot-of-the-day now a wall, not a single.
          Daily-rotating window of 8 keyframes so a returning visitor sees
          a fresh strip without fully shuffling the archive. Falls back to
          the single hero card when fewer than 4 keyframes are seeded. */}
      {shotWall.length >= 4 ? (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-50">
              Frames of the day
              <span className="ml-2 text-sm font-normal text-zinc-400">
                rotating wall · {shotWall.length} shots
              </span>
            </h2>
            <Link href="/shots" className="text-xs text-zinc-500 hover:text-amber-400">
              Browse all frames <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {shotWall.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/films/${s.production_slug}#keyframes`}
                  className="group block overflow-hidden rounded border border-zinc-800 bg-zinc-950 hover:border-amber-700/60"
                  title={`${s.production_title}${s.caption ? ' — ' + s.caption : ''}`}
                >
                  <div className="relative aspect-[16/9]">
                    {s.image_url && (
                      <Image
                        src={s.image_url}
                        alt={`Keyframe from ${s.production_title}${s.caption ? ': ' + s.caption : ''}`}
                        fill
                        sizes="(min-width: 640px) 22vw, 50vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="border-t border-zinc-800 px-2 py-1.5">
                    <p className="line-clamp-1 text-xs font-medium text-zinc-100 group-hover:text-amber-400">
                      {s.production_title}
                    </p>
                    {s.caption && (
                      <p className="line-clamp-1 text-[10px] text-zinc-400">{s.caption}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : shotOfTheDay ? (
        <ShotOfTheDayCard shot={shotOfTheDay} todayKey={todayKey} />
      ) : null}

      {/* Phase 29 — editorial-depth tile grid. Surfaces every
          curated technical-reference neighbourhood with its headline
          stat so a first-time visitor can tell at a glance what the
          archive is deep on. */}
      <div className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="font-serif text-xl text-zinc-50">Technical reference depth</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Where CineCanon goes beyond TMDb metadata — hand-curated editorial
              across the working departments.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/stunts"
            className="group flex flex-col gap-2 rounded border border-red-900/40 bg-red-950/10 p-4 hover:border-red-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">Stunts</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              The most under-documented department, catalogued
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {depthStats.stunt_companies} companies · {depthStats.stunt_sequences} sequences
              · {depthStats.stunt_rigging} rigging entries · {depthStats.safety_bulletins} indexed
              SAG-AFTRA bulletins · {depthStats.stunt_doubling} doubling credits.
            </p>
          </Link>

          <Link
            href="/vfx"
            className="group flex flex-col gap-2 rounded border border-purple-900/40 bg-purple-950/10 p-4 hover:border-purple-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-purple-400/80">VFX</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Studios + breakdowns + colour-science chains
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {depthStats.vfx_houses} VFX houses with editorial tagline + summary +
              cited references; {depthStats.color_pipelines} per-production colour pipelines from
              camera-log to deliverable.
            </p>
          </Link>

          <Link
            href="/gear"
            className="group flex flex-col gap-2 rounded border border-amber-900/40 bg-amber-950/10 p-4 hover:border-amber-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80">Gear</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Camera + lens + lighting + grip
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {depthStats.lighting_setups} per-scene lighting setups with cinematographer
              motivation; {depthStats.post_links} post-production assignments tying films
              to their DI labs and sound houses.
            </p>
          </Link>

          <Link
            href="/films"
            className="group flex flex-col gap-2 rounded border border-blue-900/40 bg-blue-950/10 p-4 hover:border-blue-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/80">Productions</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Locations, scenes, and a curated tier
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {depthStats.locations} geocoded shooting locations with sun-position
              metadata · {totalCurated} hand-curated films with full crew + scene-level
              equipment usage.
            </p>
          </Link>

          <Link
            href="/awards"
            className="group flex flex-col gap-2 rounded border border-amber-900/40 bg-amber-950/10 p-4 hover:border-amber-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80">Awards</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Every win and nomination, by craft
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {awardsStats.total.toLocaleString()} documented entries · {awardsStats.wins.toLocaleString()} wins
              across {awardsStats.orgs} awarding bodies — Oscars, BAFTAs, Cannes, ASC, VES,
              Taurus. Filter by craft, org, year, or recipient.
            </p>
          </Link>

          <Link
            href="/sound"
            className="group flex flex-col gap-2 rounded border border-sky-900/40 bg-sky-950/10 p-4 hover:border-sky-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-400/80">Sound</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Mixers, designers, foley, dub stages
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {soundStats.houses} post-houses tagged sound mix or sound design ·
              {' '}{soundStats.people.toLocaleString()} working sound-department crew with cited credits.
              Production mixers, supervising sound editors, re-recording mixers, foley.
            </p>
          </Link>

          <Link
            href="/music"
            className="group flex flex-col gap-2 rounded border border-violet-900/40 bg-violet-950/10 p-4 hover:border-violet-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400/80">Music & Score</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Composers, scoring stages, supervisors
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {musicStats.composers.toLocaleString()} composers, orchestrators, music editors and supervisors ·
              {' '}{musicStats.stages} scoring stages catalogued. Score deep-dives and curated cue-level
              listening guides coming online.
            </p>
          </Link>

          <Link
            href="/references"
            className="group flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">References</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Cross-cited sources across the archive
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {depthStats.cited_references} URLs cited on more than one entity — Variety,
              fxguide, SAG-AFTRA, Wikipedia. Click any source to see every film,
              person, sequence, or bulletin that depends on it.
            </p>
          </Link>

          <Link
            href="/stunts/people"
            className="group flex flex-col gap-2 rounded border border-emerald-900/40 bg-emerald-950/10 p-4 hover:border-emerald-700/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80">People</p>
            <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
              Stunt performers + coordinators
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {depthStats.stunt_people} performers with documented disciplines, doubling
              history, training credentials, and primary company affiliation —
              the working roster of modern action coordination.
            </p>
          </Link>
        </div>
      </div>

      {/* Featured: curated tier only — hand-seeded with crew/scenes/equipment depth */}
      <div className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="font-serif text-xl text-zinc-50">Featured Productions</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {totalCurated} hand-curated films with full crew, scene-level equipment data, and cited sources.
            </p>
          </div>
          <Link
            href="/films?tier=curated"
            className="text-xs text-zinc-500 hover:text-amber-400"
          >
            View all curated →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((row) => (
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
      </div>

      {/* T5-5 — Updated this week feed (signals the site is alive) */}
      {recentlyUpdated.length > 0 && (
        <div className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-50">Recently updated</h2>
            <Link href="/films?tier=curated&sort=recent" className="text-xs text-zinc-500 hover:text-amber-400">
              All curated →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyUpdated.map((row) => (
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
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}

      {/* Killer queries */}
      <div>
        <h2 className="mb-4 font-serif text-xl text-zinc-50">Reference Queries</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {queries.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-amber-400/30 transition-colors"
            >
              <h3 className="font-medium text-zinc-100">{q.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{q.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
