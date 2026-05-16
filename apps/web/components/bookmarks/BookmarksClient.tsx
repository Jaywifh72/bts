'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBookmarkStore } from '@/lib/bookmarks/use-store';
import type { Bookmark } from '@/lib/bookmarks/types';

const KIND_LABEL: Record<string, string> = {
  film: 'Films',
  crew: 'Crew',
  'gear-item': 'Gear',
  'gear-series': 'Gear',
  'vfx-house': 'VFX Houses',
};

export function BookmarksClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const store = useBookmarkStore(isLoggedIn);
  const [items, setItems] = useState<Bookmark[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      void store.list().then((v) => { if (!cancelled) setItems(v); });
    }
    load();
    window.addEventListener('cinecanon:bookmarks-changed', load);
    window.addEventListener('storage', load);
    return () => {
      cancelled = true;
      window.removeEventListener('cinecanon:bookmarks-changed', load);
      window.removeEventListener('storage', load);
    };
  }, [store]);

  if (items === null) {
    return <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
        No bookmarks yet. Tap the ☆ icon on any film, crew, or gear page to save it here.
      </div>
    );
  }

  const grouped = new Map<string, Bookmark[]>();
  for (const item of items) {
    const list = grouped.get(item.kind) ?? [];
    list.push(item);
    grouped.set(item.kind, list);
  }

  async function onRemove(b: Bookmark) {
    await store.remove(b.kind, b.slug);
    window.dispatchEvent(new CustomEvent('cinecanon:bookmarks-changed'));
  }

  return (
    <div className="space-y-8">
      {[...grouped.entries()].map(([kind, list]) => (
        <section key={kind}>
          <h2 className="mb-2 font-serif text-lg text-zinc-200">{KIND_LABEL[kind] ?? kind}</h2>
          <ul className="divide-y divide-zinc-900 rounded border border-zinc-800 bg-zinc-900/40">
            {list.map((b) => (
              <li key={`${b.kind}:${b.slug}`} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <Link href={b.href} className="min-w-0 flex-1">
                  <div className="truncate text-zinc-100 hover:text-amber-400">{b.title}</div>
                  {b.subtitle && <div className="text-xs text-zinc-500">{b.subtitle}</div>}
                </Link>
                <button
                  type="button"
                  onClick={() => onRemove(b)}
                  className="text-xs text-zinc-500 hover:text-red-400"
                  aria-label={`Remove ${b.title} from bookmarks`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
