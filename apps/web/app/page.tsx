import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  listFeaturedProductions,
  countProductions,
  listRecentlyUpdatedProductions,
  getShotOfTheDay,
  getEditorialDepthStats,
} from '@bts/db';
import { ProductionCard } from '@/components/productions/ProductionCard';
import { ShotOfTheDayCard } from '@/components/productions/ShotOfTheDayCard';

export const metadata: Metadata = {
  title: 'CineCanon — Cinematic Technical Reference',
};

// QA — revalidate hourly. The depth-stats subqueries change at most a
// few times per day, the shot-of-the-day rotates daily, so hourly is a
// safe upper bound for cache freshness.
export const revalidate = 3600;

const queries = [
  {
    href: '/queries/alexa65-sphero',
    title: 'ALEXA 65 + Panavision Sphero',
    description: 'Every feature shot on this combination, by DP.',
  },
  {
    href: '/queries/dune-part-two-lenses',
    title: 'Greig Fraser on Dune: Part Two',
    description: 'Every lens used on the production.',
  },
  {
    href: '/queries/magic-hour-2023',
    title: 'Magic-Hour Lighting, 2023',
    description: 'Every exterior magic-hour scene, by fixture.',
  },
] as const;

export default async function HomePage() {
  // E-49 — pin shot-of-the-day to today's UTC date so the value rotates
  // at midnight UTC for everyone.
  const todayKey = new Date().toISOString().slice(0, 10);
  const [featured, totalCurated, totalAll, recentlyUpdatedRaw, shotOfTheDay, depthStats] = await Promise.all([
    listFeaturedProductions(db, 6),
    countProductions(db, { dataTier: 'curated' }),
    countProductions(db),
    // Over-fetch so we still have ≥ 4 after deduplicating against Featured.
    listRecentlyUpdatedProductions(db, 10),
    getShotOfTheDay(db, todayKey),
    getEditorialDepthStats(db),
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

      {/* "Why this is different" — the moat made legible. */}
      <div className="mb-12 grid gap-3 sm:grid-cols-3">
        <Link
          href="/about#confidence"
          className="group rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-amber-700/60 transition-colors"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80">
            Cited &amp; graded
          </p>
          <h3 className="mt-1 font-serif text-base text-zinc-100 group-hover:text-amber-400">
            Every claim has provenance
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Primary, secondary, manufacturer, speculative — confidence rated
            per source. No mystery facts.
          </p>
        </Link>
        <Link
          href="/references"
          className="group rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-amber-700/60 transition-colors"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80">
            Reference graph
          </p>
          <h3 className="mt-1 font-serif text-base text-zinc-100 group-hover:text-amber-400">
            One URL, back-cited everywhere
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Every source URL is canonical. Click a citation to see every film,
            crew member, sequence, and bulletin that depends on it.
          </p>
        </Link>
        <Link
          href="/tools"
          className="group rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-amber-700/60 transition-colors"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80">
            Pro-grade tools
          </p>
          <h3 className="mt-1 font-serif text-base text-zinc-100 group-hover:text-amber-400">
            CDL, ACES, frame-lines, loadout
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            Working calculators that read against the curated archive.
            Bookmark-and-share, not vapor.
          </p>
        </Link>
      </div>

      {/* E-49 — daily-rotating shot of the day. Self-hides when no
          keyframes are seeded, and (via the client component) also
          self-hides if the image source 404s. */}
      {shotOfTheDay && (
        <ShotOfTheDayCard shot={shotOfTheDay} todayKey={todayKey} />
      )}

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
