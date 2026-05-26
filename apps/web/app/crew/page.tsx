import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listCrewCategoriesInUse } from '@bts/db';
import { PersonCard } from '@/components/people/PersonCard';
import { PersonTable } from '@/components/people/PersonTable';
import { CrewFilters } from '@/components/people/CrewFilters';
import { Pagination } from '@/components/ui/Pagination';
import { PageHero } from '@/components/ui/PageHero';
import { ViewToggle, parseView } from '@/components/ui/ViewToggle';
import { CompareCheckbox, CompareDrawer } from '@/components/ui/Compare';
import { JsonLd } from '@/lib/jsonLd';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Crew — Directors, DPs, Editors & Designers',
  description: 'Directors, cinematographers, editors, production designers, sound and VFX leads — searchable crew database with film credits and department filters.',
  alternates: { canonical: '/crew' },
};

// QA — revalidate hourly. People rows are slow-moving; search/filter
// permutations cache well.
export const revalidate = 3600;

const PAGE_SIZE = 60;

type Props = {
  searchParams: Promise<{ category?: string; sort?: string; page?: string; view?: string }>;
};

function parseSort(v: string | undefined): 'name' | 'credits' {
  return v === 'name' || v === 'credits' ? v : 'credits';
}

export default async function CrewPage(props: Props) {
  const searchParams = await props.searchParams;
  const category = searchParams.category || undefined;
  const sort = parseSort(searchParams.sort);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const view = parseView(searchParams.view);

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
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': absoluteUrl('/crew'),
        url: absoluteUrl('/crew'),
        name: 'Crew — CineCanon',
        description: 'Directors, cinematographers, editors, production designers, sound and VFX leads.',
        mainEntity: { '@type': 'ItemList', numberOfItems: total },
      }} />
      <PageHero
        eyebrow="Archive"
        title="Crew"
        description={
          <>
            {total.toLocaleString()} {total === 1 ? 'person' : 'people'}
            {category ? ` in ${category.replace('_', ' ')}` : ''}
          </>
        }
      />

      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <CrewFilters categories={categories} current={{ category, sort }} />
        </div>
        <ViewToggle basePath="/crew" currentParams={baseParams} active={view} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No crew matches these filters.
        </div>
      ) : view === 'table' ? (
        <PersonTable
          rows={rows.map((row) => ({
            slug: row.slug,
            displayName: row.display_name,
            primaryRole: row.primary_role,
            nationality: row.nationality,
            birthYear: row.birth_year,
            creditCount: row.credit_count,
          }))}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div key={row.slug} className="relative">
              <CompareCheckbox slug={row.slug} label={row.display_name} />
              <PersonCard
                slug={row.slug}
                displayName={row.display_name}
                nationality={row.nationality}
                primaryRole={row.primary_role}
                birthYear={row.birth_year}
                profilePath={row.profile_path}
                creditCount={row.credit_count}
              />
            </div>
          ))}
        </div>
      )}

      <CompareDrawer compareHref="/crew/compare" itemKindLabel="people" />

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Crew pagination"
        buildHref={(p) => {
          const params = new URLSearchParams(baseParams);
          if (p > 1) params.set('page', String(p));
          else params.delete('page');
          return `/crew${params.toString() ? `?${params.toString()}` : ''}`;
        }}
      />
    </>
  );
}
