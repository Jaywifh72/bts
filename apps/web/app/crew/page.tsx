import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listCrewCategoriesInUse } from '@bts/db';
import { PersonCard } from '@/components/people/PersonCard';
import { CrewFilters } from '@/components/people/CrewFilters';

export const metadata: Metadata = { title: 'Crew' };

const PAGE_SIZE = 60;

type Props = {
  searchParams: { category?: string; sort?: string; page?: string };
};

function parseSort(v: string | undefined): 'name' | 'credits' {
  return v === 'name' || v === 'credits' ? v : 'credits';
}

export default async function CrewPage({ searchParams }: Props) {
  const category = searchParams.category || undefined;
  const sort = parseSort(searchParams.sort);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const filters = {
    category,
    withCreditsOnly: true,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [rows, total, categories] = await Promise.all([
    listPeople(db, filters),
    countPeople(db, filters),
    listCrewCategoriesInUse(db),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseParams = new URLSearchParams();
  if (category) baseParams.set('category', category);
  if (sort !== 'credits') baseParams.set('sort', sort);

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Crew</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {total.toLocaleString()} {total === 1 ? 'person' : 'people'}
          {category ? ` in ${category.replace('_', ' ')}` : ''}
        </p>
      </div>

      <CrewFilters categories={categories} current={{ category, sort }} />

      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No crew matches these filters.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <PersonCard
              key={row.slug}
              slug={row.slug}
              displayName={row.display_name}
              nationality={row.nationality}
              primaryRole={row.primary_role}
              birthYear={row.birth_year}
              profilePath={row.profile_path}
              creditCount={row.credit_count}
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
                  return `/crew${p.toString() ? `?${p.toString()}` : ''}`;
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
                  return `/crew?${p.toString()}`;
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
