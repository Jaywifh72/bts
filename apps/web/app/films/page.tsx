import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  listProductions,
  countProductions,
  listGenresInUse,
  listDecadesInUse,
  getProductionDepthFlags,
} from '@bts/db';
import { ProductionCard } from '@/components/productions/ProductionCard';
import { ProductionTable } from '@/components/productions/ProductionTable';
import { FilmsFilters } from '@/components/productions/FilmsFilters';
import { Pagination } from '@/components/ui/Pagination';
import { PageHero } from '@/components/ui/PageHero';
import { ViewToggle, parseView } from '@/components/ui/ViewToggle';
import { CompareCheckbox, CompareDrawer } from '@/components/ui/Compare';

export const metadata: Metadata = { title: 'Films' };

// QA — revalidate hourly so search/filter result pages aren't dynamic
// per visitor. Admin pages bypass this with their own dynamic exports.
export const revalidate = 3600;

const PAGE_SIZE = 60;

type Props = {
  searchParams: Promise<{
    decade?: string;
    genre?: string;
    tier?: string;
    sort?: string;
    page?: string;
    studio?: string;
    view?: string;
  }>;
};

function parseSort(v: string | undefined) {
  return ['recent', 'oldest', 'title', 'popularity', 'rating'].includes(v ?? '')
    ? (v as 'recent' | 'oldest' | 'title' | 'popularity' | 'rating')
    : 'recent';
}

function parseTier(v: string | undefined): 'curated' | 'imported' | 'all' {
  return v === 'curated' || v === 'imported' || v === 'all' ? v : 'all';
}

export default async function FilmsPage(props: Props) {
  const searchParams = await props.searchParams;
  // Multi-decade: accept comma-separated `?decade=2010,2020`. Single value
  // remains supported for back-compat with deep links. Canonical form is
  // sorted ascending and de-duplicated so `?decade=2020,2010` and
  // `?decade=2010,2020,2010` collapse to the same cache key.
  const decadesParam = Array.from(
    new Set(
      (searchParams.decade ?? '')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ).sort((a, b) => a - b);
  const decades = decadesParam.length > 0 ? decadesParam : undefined;
  const genre = searchParams.genre || undefined;
  const studioSlug = searchParams.studio || undefined;
  const tier = parseTier(searchParams.tier);
  const sort = parseSort(searchParams.sort);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const view = parseView(searchParams.view);

  const filters = {
    decades,
    genre,
    studioSlug,
    dataTier: tier,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [rows, total, decadeOptions, genres] = await Promise.all([
    listProductions(db, filters),
    countProductions(db, filters),
    listDecadesInUse(db),
    listGenresInUse(db),
  ]);

  // Phase 30 — fetch editorial-depth flags for the visible page only.
  // Restricted to the rendered slugs so the EXISTS queries stay cheap.
  const depthMap = await getProductionDepthFlags(db, rows.map((r) => r.slug));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build base href for pagination preserving filter params (everything except page).
  const baseParams = new URLSearchParams();
  if (decades) baseParams.set('decade', decades.join(','));
  if (genre) baseParams.set('genre', genre);
  if (studioSlug) baseParams.set('studio', studioSlug);
  if (tier !== 'all') baseParams.set('tier', tier);
  if (sort !== 'recent') baseParams.set('sort', sort);

  // CSV export URL preserves the current filter set.
  const csvParams = new URLSearchParams();
  if (tier !== 'all') csvParams.set('tier', tier);
  if (genre) csvParams.set('genre', genre);
  if (decades) csvParams.set('decade', decades.join(','));
  const csvHref = `/api/export/films.csv${csvParams.toString() ? `?${csvParams.toString()}` : ''}`;

  return (
    <>
      <PageHero
        eyebrow="Archive"
        title="Films"
        description={
          <>
            {total.toLocaleString()} {total === 1 ? 'production' : 'productions'}
            {tier !== 'all' && ` · ${tier}`}
            {studioSlug && ` · studio: ${studioSlug}`}
          </>
        }
        actions={
          <a
            href={csvHref}
            className="rounded border border-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:border-amber-700/60 hover:text-amber-400"
            aria-label="Export current view as CSV"
            download
          >
            Export CSV ↓
          </a>
        }
      />

      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <FilmsFilters decades={decadeOptions} genres={genres} current={{ decades, genre, tier, sort }} />
        </div>
        <ViewToggle basePath="/films" currentParams={baseParams} active={view} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No films match these filters.
        </div>
      ) : view === 'table' ? (
        <ProductionTable
          rows={rows.map((row) => ({
            slug: row.slug,
            title: row.title,
            type: row.type,
            releaseYear: row.release_year,
            primaryAspectRatio: row.primary_aspect_ratio,
            primaryAcquisitionFormat: row.primary_acquisition_format,
            dataTier: row.data_tier,
            voteAverage: row.vote_average,
            depth: depthMap.get(row.slug),
          }))}
          currentSort={sort}
          buildSortHref={(target) => {
            const params = new URLSearchParams(baseParams);
            if (target === 'recent') params.delete('sort');
            else params.set('sort', target);
            params.set('view', 'table');
            params.delete('page');
            return `/films${params.toString() ? `?${params.toString()}` : ''}`;
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div key={row.slug} className="relative">
              <CompareCheckbox slug={row.slug} label={row.title} />
              <ProductionCard
                slug={row.slug}
                title={row.title}
                type={row.type}
                releaseYear={row.release_year}
                synopsis={row.synopsis}
                primaryAspectRatio={row.primary_aspect_ratio}
                primaryAcquisitionFormat={row.primary_acquisition_format}
                posterPath={row.poster_path}
                dataTier={row.data_tier}
                depth={depthMap.get(row.slug)}
              />
            </div>
          ))}
        </div>
      )}

      <CompareDrawer compareHref="/films/compare" itemKindLabel="films" />

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Films pagination"
        buildHref={(p) => {
          const params = new URLSearchParams(baseParams);
          if (p > 1) params.set('page', String(p));
          else params.delete('page');
          return `/films${params.toString() ? `?${params.toString()}` : ''}`;
        }}
      />
    </>
  );
}
