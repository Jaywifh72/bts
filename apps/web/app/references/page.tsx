import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listMostCitedAssets, countMostCitedAssets, type MediaAssetKind } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = {
  title: 'References',
  description:
    'Most-cited sources across the Studio Pro archive — Variety / fxguide / SAG-AFTRA / Wikipedia URLs that turn up across films, stunt people, VFX houses, sequences, and bulletins. Each row links to every entity that cites it.',
};

export const dynamic = 'force-dynamic';

const KIND_FILTERS: Array<{ key: 'all' | MediaAssetKind; label: string }> = [
  { key: 'all',      label: 'all' },
  { key: 'video',    label: 'video' },
  { key: 'link',     label: 'article' },
  { key: 'document', label: 'document' },
  { key: 'image',    label: 'image' },
];

const PAGE_SIZE = 30;

interface Props {
  searchParams: { kind?: string; page?: string };
}

function buildHref(args: { kind?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (args.kind && args.kind !== 'all') params.set('kind', args.kind);
  if (args.page && args.page > 1) params.set('page', String(args.page));
  const qs = params.toString();
  return qs ? `/references?${qs}` : '/references';
}

const KIND_BADGE: Record<string, string> = {
  video:    'bg-red-950/30 text-red-300 border-red-900/50',
  image:    'bg-emerald-950/30 text-emerald-300 border-emerald-900/50',
  link:     'bg-amber-950/30 text-amber-300 border-amber-900/50',
  document: 'bg-purple-950/30 text-purple-300 border-purple-900/50',
  audio:    'bg-sky-950/30 text-sky-300 border-sky-900/50',
};

export default async function ReferencesIndexPage({ searchParams }: Props) {
  const kindParam = searchParams.kind;
  const kind = kindParam && KIND_FILTERS.some((f) => f.key === kindParam) && kindParam !== 'all'
    ? (kindParam as MediaAssetKind)
    : undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const [assets, total] = await Promise.all([
    listMostCitedAssets(db, {
      kinds: kind ? [kind] : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countMostCitedAssets(db),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Aggregate stats for the hero
  const grandTotalAssociations = assets.reduce((acc, a) => acc + a.association_count, 0);

  return (
    <>
      {/* Hero */}
      <div className="relative mb-12 overflow-hidden border-b border-zinc-800 pb-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-950/30 via-zinc-950/0 to-transparent"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-500/80">Archive · References</p>
          <h1 className="mt-2 font-serif text-5xl text-zinc-50 leading-none">
            Sources cited across the archive
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Every URL in the archive — Variety, fxguide, SAG-AFTRA
            bulletins, Wikipedia, behind-the-scenes interviews —
            stored once, attached to as many entities as cite it.
            This page surfaces the most-shared sources first; click
            through to see every film, person, sequence, or bulletin
            that depends on a given source.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Stat label="Cited sources" value={total} />
            <Stat label="Total citations (top page)" value={grandTotalAssociations} />
            <Stat label="Top source's associations" value={assets[0]?.association_count ?? 0} />
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <nav
        aria-label="Filter by source kind"
        className="mb-6 flex flex-wrap gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {KIND_FILTERS.map((f) => {
          const active = (f.key === 'all' && !kindParam) || f.key === kindParam;
          return (
            <Link
              key={f.key}
              href={buildHref({ kind: f.key === 'all' ? undefined : f.key })}
              className={`rounded px-2 py-1 ${
                active ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {/* Most-cited list */}
      <section>
        <SectionHeader
          label={kindParam && kindParam !== 'all' ? `Most-cited ${kindParam}s` : 'Most-cited sources'}
          heading={`${total.toLocaleString()} ${total === 1 ? 'source' : 'sources'} cited at least twice`}
        />
        <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
          Each card&apos;s ×N badge counts the number of distinct entity
          associations on the underlying canonical URL. The same row
          might be a reference on a stunt-rigging entry, a safety
          bulletin, and a stunt sequence — one URL, three
          associations.
        </p>

        {assets.length === 0 ? (
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
            No multi-cited sources match this filter.
          </div>
        ) : (
          <ul className="space-y-2">
            {assets.map((a, i) => (
              <li key={a.id}>
                <Link
                  href={`/references/${a.id}`}
                  className="group flex items-baseline gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/50 hover:bg-amber-950/10 transition-colors"
                >
                  <span className="shrink-0 font-mono text-[10px] text-zinc-600 sm:w-7 sm:text-right">
                    {(page - 1) * PAGE_SIZE + i + 1}.
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${KIND_BADGE[a.kind] ?? 'border-zinc-700 text-zinc-400'}`}>
                        {a.kind}
                      </span>
                      <span className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
                        {a.title}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wide text-zinc-500">
                      {a.publication && <span>{a.publication}</span>}
                      <span>{a.entity_type_count} entity type{a.entity_type_count === 1 ? '' : 's'}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-mono text-amber-500/90">
                      {a.association_count.toLocaleString()}
                    </span>
                    <span className="ml-1 text-[10px] uppercase tracking-wide text-zinc-500">×</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="References pagination"
        buildHref={(p) => buildHref({ kind: kindParam, page: p })}
      />

      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          About this index
        </p>
        Studio Pro stores every cited URL once in a polymorphic
        media table. References that previously appeared as separate
        rows on a VFX house, a stunt company, and a stunt sequence
        collapse to a single canonical record with three associations
        — and a reader on any of those entities can navigate here to
        see every other entity citing the same source.
      </aside>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}
