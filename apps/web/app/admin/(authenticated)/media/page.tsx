import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  db,
  listAllMediaAssets,
  countAllMediaAssets,
  getMostSharedMedia,
  type MediaAssetKind,
} from '@bts/db';
import { Pagination } from '@/components/ui/Pagination';

export const metadata: Metadata = {
  title: 'Media',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const KIND_FILTERS: Array<{ key: 'all' | MediaAssetKind; label: string }> = [
  { key: 'all',      label: 'all' },
  { key: 'video',    label: 'video' },
  { key: 'image',    label: 'image' },
  { key: 'link',     label: 'link' },
  { key: 'document', label: 'document' },
  { key: 'audio',    label: 'audio' },
];

const PAGE_SIZE = 30;

interface Props {
  searchParams: { kind?: string; q?: string; page?: string };
}

function buildHref(args: { kind?: string; q?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (args.kind && args.kind !== 'all') params.set('kind', args.kind);
  if (args.q) params.set('q', args.q);
  if (args.page && args.page > 1) params.set('page', String(args.page));
  const qs = params.toString();
  return qs ? `/admin/media?${qs}` : '/admin/media';
}

const KIND_BADGE: Record<string, string> = {
  video:    'bg-red-950/30 text-red-300 border-red-900/50',
  image:    'bg-emerald-950/30 text-emerald-300 border-emerald-900/50',
  link:     'bg-amber-950/30 text-amber-300 border-amber-900/50',
  document: 'bg-purple-950/30 text-purple-300 border-purple-900/50',
  audio:    'bg-sky-950/30 text-sky-300 border-sky-900/50',
};

export default async function AdminMediaPage({ searchParams }: Props) {
  const kindParam = searchParams.kind;
  const kind = kindParam && KIND_FILTERS.some((f) => f.key === kindParam) && kindParam !== 'all'
    ? (kindParam as MediaAssetKind)
    : undefined;
  const search = searchParams.q?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const [assets, total, mostShared] = await Promise.all([
    listAllMediaAssets(db, {
      kind, search,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countAllMediaAssets(db, { kind, search }),
    getMostSharedMedia(db, 6),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-50">Media</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Polymorphic asset library — every video, image, link, and
            document the archive references, deduped by URL. Each
            asset can be associated with any combination of entities
            (films, people, stunt companies, sequences, etc.) via
            <code className="ml-1 font-mono text-amber-400">media_associations</code>.
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div className="font-mono text-zinc-300">{total.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-wide">Assets total</div>
        </div>
      </header>

      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/admin/media/new"
          className="rounded bg-amber-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-zinc-950 hover:bg-amber-500"
        >
          + New asset
        </Link>
      </div>

      {/* Most-shared assets — the dedup payoff visible at a glance */}
      {mostShared.length > 0 && (
        <section className="mb-8 rounded border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Most-shared assets
            </h2>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              one URL, many entities
            </span>
          </div>
          <ul className="space-y-2">
            {mostShared.map((m) => (
              <li
                key={m.id}
                className="flex items-baseline justify-between gap-3 rounded border border-zinc-800 bg-zinc-950/40 p-3"
              >
                <Link
                  href={`/admin/media/${m.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-baseline gap-2">
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${KIND_BADGE[m.kind] ?? 'border-zinc-700 text-zinc-400'}`}>
                      {m.kind}
                    </span>
                    <span className="truncate text-sm text-zinc-100 hover:text-amber-400">
                      {m.title}
                    </span>
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                    {m.url}
                  </div>
                </Link>
                <span className="shrink-0 text-right">
                  <span className="font-mono text-amber-500/90">{m.association_count}×</span>
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    assoc
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filters */}
      <form action="/admin/media" className="mb-6 flex flex-wrap items-baseline gap-3">
        <nav className="flex flex-wrap gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs">
          {KIND_FILTERS.map((f) => {
            const active = (f.key === 'all' && !kindParam) || f.key === kindParam;
            return (
              <Link
                key={f.key}
                href={buildHref({ kind: f.key === 'all' ? undefined : f.key, q: search })}
                className={`rounded px-2 py-1 ${
                  active ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </nav>
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search title or URL"
          className="grow rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-700 focus:outline-none"
        />
        {kindParam && kindParam !== 'all' && (
          <input type="hidden" name="kind" value={kindParam} />
        )}
        <button
          type="submit"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-amber-700"
        >
          Search
        </button>
      </form>

      {/* Asset list */}
      {assets.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No assets match this filter.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {assets.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/media/${a.id}`}
                className="flex items-start gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/50 hover:bg-amber-950/10"
              >
                {a.thumbnail_url && a.kind === 'video' ? (
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded border border-zinc-800">
                    <Image
                      src={a.thumbnail_url}
                      alt={a.title ? `Thumbnail for ${a.title}` : ''}
                      fill
                      sizes="96px"
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <span className="block h-14 w-24 shrink-0 rounded border border-zinc-800 bg-zinc-950" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`shrink-0 rounded border px-1 py-0.5 text-[10px] uppercase tracking-wide ${KIND_BADGE[a.kind] ?? 'border-zinc-700 text-zinc-400'}`}>
                      {a.kind}
                    </span>
                    <span className="truncate text-sm text-zinc-100">
                      {a.title}
                    </span>
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                    {a.url}
                  </div>
                  <div className="mt-1 flex items-baseline gap-3 text-[10px] uppercase tracking-wide text-zinc-500">
                    <span className="font-mono text-amber-500/80">
                      {a.association_count} assoc
                    </span>
                    {a.publication && <span>{a.publication}</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Media assets pagination"
        buildHref={(p) => buildHref({ kind: kindParam, q: search, page: p })}
      />
    </div>
  );
}
