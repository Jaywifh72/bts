import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHero, PageHeroStat, type PageHeroAccent } from '@/components/ui/PageHero';
import { PersonTable } from '@/components/people/PersonTable';
import { CrossCutLink } from '@/components/role/RolePage';

/**
 * UX-audit P0-1 — shared contract for department index pages
 * (/sound, /editing, /music, /costume-hair-makeup, /production-design).
 *
 * The pre-audit shape was: hero, four /ask chips, person tiles, film tiles.
 * Pure template theater — five pages with the same anatomy and no real
 * referential density. This component adds:
 *
 *   - A stats strip with department-specific numbers (people, credits,
 *     curated dossiers) so the hero earns its space.
 *   - A glossary slot so domain vocabulary lives on the index, not on
 *     hidden /ask suggestion pages.
 *   - A vendor slot for departments where it applies (sound→post-houses,
 *     music→scoring stages, etc.) — empty for v1, will be wired per-dept
 *     as schema permits.
 *
 * Existing pages keep their /ask cross-cuts and person/film grids — those
 * are still useful, just no longer the *only* content on the page.
 */
export type Glossary = Array<{ term: string; def: ReactNode }>;

export function DepartmentIndex({
  eyebrow = 'Department',
  title,
  description,
  accent,
  stats,
  glossary,
  crossCuts,
  vendors,
  people,
  films,
  allCrewHref,
}: {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  accent: PageHeroAccent;
  stats: Array<{ label: string; value: ReactNode }>;
  glossary?: Glossary;
  /** Each `href` must point at a working /ask query, /search query, or
   *  a real index route. Maintenance: when /ask's filter extractor
   *  changes, spot-check these by clicking through — there's no test
   *  asserting they parse to non-empty filters yet (UX-audit G15). */
  crossCuts: Array<{ title: string; href: string }>;
  vendors?: ReactNode;
  people: Array<{
    slug: string;
    display_name: string;
    credit_count?: number | null;
    primary_role?: string | null;
    nationality?: string | null;
    birth_year?: number | null;
  }>;
  films: Array<{ slug: string; title: string; release_year: number | null }>;
  /** Link to the crew index pre-filtered for this department's category. */
  allCrewHref: string;
}) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        accent={accent}
        description={description}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <PageHeroStat key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        }
      />

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {crossCuts.map((c) => (
            <CrossCutLink key={c.href} href={c.href} title={c.title} />
          ))}
        </ul>
      </section>

      {vendors}

      {people.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-cited professionals</h2>
            <Link href={allCrewHref} className="text-xs text-zinc-400 hover:text-amber-400">
              All →
            </Link>
          </div>
          <PersonTable
            rows={people.map((p) => ({
              slug: p.slug,
              displayName: p.display_name,
              primaryRole: p.primary_role ?? null,
              nationality: p.nationality ?? null,
              birthYear: p.birth_year ?? null,
              creditCount: p.credit_count ?? 0,
            }))}
          />
        </section>
      )}

      {films.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Curated dossiers</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {films.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/films/${f.slug}`}
                  className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
                >
                  <p className="font-serif text-base text-zinc-100">{f.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{f.release_year}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {glossary && glossary.length > 0 && (
        <details className="group mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4">
          <summary className="cursor-pointer font-serif text-base text-zinc-100 hover:text-amber-400">
            Glossary
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {glossary.length} terms · {title.toLowerCase()} vocabulary
            </span>
            <span aria-hidden="true" className="ml-1 text-zinc-500 group-open:hidden">▸</span>
            <span aria-hidden="true" className="ml-1 hidden text-zinc-500 group-open:inline">▾</span>
          </summary>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            {glossary.map((g) => (
              <div
                key={String(g.term)}
                className="rounded border border-zinc-800 bg-zinc-900/60 p-3"
              >
                <dt className="font-mono text-xs uppercase tracking-wide text-amber-300">
                  {g.term}
                </dt>
                <dd className="mt-1 text-zinc-300">{g.def}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </>
  );
}
