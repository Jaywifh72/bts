import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listFeaturedProductions, countProductions, listRecentlyUpdatedProductions } from '@bts/db';
import { ProductionCard } from '@/components/productions/ProductionCard';

export const metadata: Metadata = {
  title: 'Studio Pro — Cinematic Technical Reference',
};

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
  const [featured, totalCurated, totalAll, recentlyUpdated] = await Promise.all([
    listFeaturedProductions(db, 6),
    countProductions(db, { dataTier: 'curated' }),
    countProductions(db),
    listRecentlyUpdatedProductions(db, 4),
  ]);

  return (
    <>
      {/* Hero */}
      <div className="mb-12 border-b border-zinc-800 pb-8">
        <h1 className="font-serif text-5xl text-zinc-50">Studio Pro</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Behind-the-scenes technical metadata for working film professionals.
          Camera packages, lens choices, lighting rigs — cited and searchable.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href="/films" className="text-sm text-amber-400 hover:underline">
            Browse all {totalAll.toLocaleString()} films →
          </Link>
          <Link href="/gear" className="text-sm text-amber-400 hover:underline">Browse gear →</Link>
          <Link href="/crew" className="text-sm text-amber-400 hover:underline">Browse crew →</Link>
          <Link href="/vfx" className="text-sm text-amber-400 hover:underline">Browse VFX →</Link>
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
