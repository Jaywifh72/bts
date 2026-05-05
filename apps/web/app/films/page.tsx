import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  listProductions,
  countProductions,
  listGenresInUse,
  listDecadesInUse,
} from '@bts/db';
import { ProductionCard } from '@/components/productions/ProductionCard';
import { FilmsFilters } from '@/components/productions/FilmsFilters';

export const metadata: Metadata = { title: 'Films' };

const PAGE_SIZE = 60;

type Props = {
  searchParams: {
    decade?: string;
    genre?: string;
    tier?: string;
    sort?: string;
    page?: string;
    studio?: string;
  };
};

function parseSort(v: string | undefined) {
  return ['recent', 'oldest', 'title', 'popularity', 'rating'].includes(v ?? '')
    ? (v as 'recent' | 'oldest' | 'title' | 'popularity' | 'rating')
    : 'recent';
}

function parseTier(v: string | undefined): 'curated' | 'imported' | 'all' {
  return v === 'curated' || v === 'imported' || v === 'all' ? v : 'all';
}

export default async function FilmsPage({ searchParams }: Props) {
  const decade = searchParams.decade ? parseInt(searchParams.decade, 10) : undefined;
  const genre = searchParams.genre || undefined;
  const studioSlug = searchParams.studio || undefined;
  const tier = parseTier(searchParams.tier);
  const sort = parseSort(searchParams.sort);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const filters = {
    decade: Number.isFinite(decade) ? decade : undefined,
    genre,
    studioSlug,
    dataTier: tier,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [rows, total, decades, genres] = await Promise.all([
    listProductions(db, filters),
    countProductions(db, filters),
    listDecadesInUse(db),
    listGenresInUse(db),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build base href for pagination preserving filter params (everything except page).
  const baseParams = new URLSearchParams();
  if (decade) baseParams.set('decade', String(decade));
  if (genre) baseParams.set('genre', genre);
  if (studioSlug) baseParams.set('studio', studioSlug);
  if (tier !== 'all') baseParams.set('tier', tier);
  if (sort !== 'recent') baseParams.set('sort', sort);

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Films</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {total.toLocaleString()} {total === 1 ? 'production' : 'productions'}
          {tier !== 'all' && ` · ${tier}`}
          {studioSlug && ` · studio: ${studioSlug}`}
        </p>
      </div>

      <FilmsFilters decades={decades} genres={genres} current={{ decade, genre, tier, sort }} />

      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No films match these filters.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
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

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between text-sm text-zinc-400">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={(() => {
                  const p = new URLSearchParams(baseParams);
                  if (page - 1 > 1) p.set('page', String(page - 1));
                  return `/films${p.toString() ? `?${p.toString()}` : ''}`;
                })()}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={(() => {
                  const p = new URLSearchParams(baseParams);
                  p.set('page', String(page + 1));
                  return `/films?${p.toString()}`;
                })()}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800"
              >
                Next →
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
