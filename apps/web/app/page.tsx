import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listProductions } from '@bts/db';
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
  const productions = await listProductions(db);
  const featured = productions.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <div className="mb-12 border-b border-zinc-800 pb-8">
        <h1 className="font-serif text-5xl text-zinc-50">Studio Pro</h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Behind-the-scenes technical metadata for working film professionals.
          Camera packages, lens choices, lighting rigs — cited and searchable.
        </p>
        <div className="mt-4 flex gap-4">
          <Link href="/films" className="text-sm text-amber-400 hover:underline">Browse all films →</Link>
          <Link href="/gear" className="text-sm text-amber-400 hover:underline">Browse gear →</Link>
          <Link href="/crew" className="text-sm text-amber-400 hover:underline">Browse crew →</Link>
        </div>
      </div>

      {/* Featured productions */}
      <div className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-50">Recent Additions</h2>
          <Link href="/films" className="text-xs text-zinc-500 hover:text-amber-400">View all</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            />
          ))}
        </div>
      </div>

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
