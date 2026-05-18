import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listVfxHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';

export const metadata: Metadata = { title: 'VFX Houses' };

// QA — VFX house roster is slow-moving; daily revalidate is right.
export const revalidate = 86400;

const KIND_LABEL: Record<string, string> = {
  full_service: 'Full-service',
  boutique: 'Boutique',
  in_house: 'In-house',
  previs: 'Previs',
  postvis: 'Postvis',
  studio: 'Studio',
};

const COUNTRY_NAME = new Intl.DisplayNames(['en'], { type: 'region' });

type Sort = 'productions' | 'primary' | 'shots' | 'name';

function parseSort(v: string | undefined): Sort {
  return v === 'primary' || v === 'shots' || v === 'name' ? v : 'productions';
}

export default async function VfxPage({ searchParams }: { searchParams: Promise<{ sort?: string; kind?: string }> }) {
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const kindFilter = sp.kind ?? '';

  const rows = await listVfxHouses(db);

  let filtered = kindFilter ? rows.filter((r) => r.kind === kindFilter) : rows;
  // Sort
  if (sort === 'primary') {
    filtered = [...filtered].sort((a, b) => b.primary_count - a.primary_count || a.name.localeCompare(b.name));
  } else if (sort === 'shots') {
    filtered = [...filtered].sort((a, b) => (b.total_shots ?? 0) - (a.total_shots ?? 0) || a.name.localeCompare(b.name));
  } else if (sort === 'name') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  const totalShots = rows.reduce((acc, r) => acc + (r.total_shots ?? 0), 0);
  const totalProductions = rows.reduce((acc, r) => acc + r.production_count, 0);

  // Distinct kinds present for filter pills
  const kindsPresent = Array.from(new Set(rows.map((r) => r.kind).filter(Boolean))) as string[];

  function sortHref(target: Sort): string {
    const params = new URLSearchParams();
    if (target !== 'productions') params.set('sort', target);
    if (kindFilter) params.set('kind', kindFilter);
    const qs = params.toString();
    return qs ? `/vfx?${qs}` : '/vfx';
  }

  function kindHref(k: string | null): string {
    const params = new URLSearchParams();
    if (sort !== 'productions') params.set('sort', sort);
    if (k) params.set('kind', k);
    const qs = params.toString();
    return qs ? `/vfx?${qs}` : '/vfx';
  }

  return (
    <>
      <PageHero
        eyebrow="Archive"
        title="VFX Houses"
        accent="purple"
        description="Visual-effects studios with editorial taglines, kind classification, and per-house credit counts. Filter by kind, sort by primary credits or total shots."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Houses indexed" value={rows.length.toLocaleString()} />
            <PageHeroStat label="Total credits" value={totalProductions.toLocaleString()} />
            <PageHeroStat label="Shots documented" value={totalShots.toLocaleString()} />
            <PageHeroStat label="Kind variants" value={kindsPresent.length} />
          </div>
        }
      />

      {/* Sub-discipline drill-into strip. */}
      <nav aria-label="VFX sub-disciplines" className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-[10px] uppercase tracking-widest text-zinc-500">Drill into</span>
        <Link href="/vfx/volumes" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">LED volumes</Link>
        <Link href="/awards/craft/visual-effects" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">VFX awards</Link>
      </nav>

      {/* Kind filter pills */}
      {kindsPresent.length > 0 && (
        <nav aria-label="Filter by kind" className="mb-4 flex flex-wrap gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs">
          <Link
            href={kindHref(null)}
            className={`rounded px-2 py-1 ${!kindFilter ? 'bg-amber-600 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`}
          >
            all ({rows.length})
          </Link>
          {kindsPresent.map((k) => {
            const count = rows.filter((r) => r.kind === k).length;
            const active = kindFilter === k;
            return (
              <Link
                key={k}
                href={kindHref(k)}
                className={`rounded px-2 py-1 ${active ? 'bg-amber-600 text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800'}`}
              >
                {KIND_LABEL[k] ?? k.replace(/_/g, ' ')} ({count})
              </Link>
            );
          })}
        </nav>
      )}

      {rows.length === 0 ? (
        <p className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-center text-zinc-400">
          No VFX data imported yet.
        </p>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="VFX houses"
          className="scroll-hint-right overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <table className="stack-on-mobile w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <SortHeader sort={sort} target="name" buildHref={sortHref} label="House" />
                <th scope="col" className="px-3 py-2 text-left font-normal">Kind</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">HQ</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Tagline</th>
                <SortHeader sort={sort} target="productions" buildHref={sortHref} label="Credits" align="right" />
                <SortHeader sort={sort} target="primary" buildHref={sortHref} label="Primary" align="right" />
                <SortHeader sort={sort} target="shots" buildHref={sortHref} label="Shots" align="right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                let countryName = h.country ?? '';
                if (h.country) {
                  try { countryName = COUNTRY_NAME.of(h.country) ?? h.country; } catch { /* invalid */ }
                }
                return (
                  <tr key={h.slug} className="border-b border-zinc-900 align-top hover:bg-zinc-900/40">
                    <td data-label="House" className="px-3 py-2">
                      <Link href={`/vfx/${h.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                        {h.name}
                      </Link>
                      {h.founded_year && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-zinc-500">
                          est. {h.founded_year}
                        </span>
                      )}
                    </td>
                    <td data-label="Kind" className="px-3 py-2">
                      {h.kind ? (
                        <span className="rounded border border-purple-700/60 bg-purple-950/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-purple-200">
                          {KIND_LABEL[h.kind] ?? h.kind.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td data-label="HQ" className="px-3 py-2 text-xs text-zinc-300">
                      {[h.headquarters, countryName].filter(Boolean).join(' · ') || <span className="text-zinc-500">—</span>}
                    </td>
                    <td data-label="Tagline" className="px-3 py-2 max-w-md text-xs text-zinc-400">
                      {h.tagline ?? (h.summary ? h.summary.slice(0, 120) + (h.summary.length > 120 ? '…' : '') : <span className="text-zinc-500">—</span>)}
                    </td>
                    <td data-label="Credits" className="px-3 py-2 text-right font-mono tabular-nums text-amber-300">
                      {h.production_count}
                    </td>
                    <td data-label="Primary" className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">
                      {h.primary_count}
                    </td>
                    <td data-label="Shots" className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">
                      {h.total_shots ? h.total_shots.toLocaleString() : <span className="text-zinc-500">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SortHeader({
  sort, target, buildHref, label, align = 'left',
}: {
  sort: Sort; target: Sort; buildHref: (t: Sort) => string; label: string; align?: 'left' | 'right';
}) {
  const isActive = sort === target;
  const alignClass = align === 'right' ? 'text-right' : 'text-left';
  return (
    <th
      scope="col"
      aria-sort={isActive ? (target === 'name' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2 font-normal ${alignClass}`}
    >
      <Link
        href={buildHref(target)}
        className={`hover:text-amber-400 ${isActive ? 'text-amber-300' : ''}`}
      >
        {label}
        {isActive && <span aria-hidden="true">{target === 'name' ? ' ↑' : ' ↓'}</span>}
      </Link>
    </th>
  );
}
