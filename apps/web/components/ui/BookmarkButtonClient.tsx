'use client';

import { useEffect, useState } from 'react';
import { useBookmarkStore } from '@/lib/bookmarks/use-store';
import type { BookmarkKind } from '@/lib/bookmarks/types';

/**
 * Heart-style bookmark toggle. Routes to localStorage or the server
 * depending on `isLoggedIn` (passed in by the BookmarkButton server
 * wrapper). Listens to a custom event so multiple instances on the
 * same page (and across tabs sharing localStorage) stay in sync.
 */
export function BookmarkButtonClient({
  kind,
  slug,
  title,
  subtitle,
  href,
  size = 'md',
  isLoggedIn,
}: {
  kind: BookmarkKind;
  slug: string;
  title: string;
  subtitle?: string;
  href: string;
  size?: 'sm' | 'md';
  isLoggedIn: boolean;
}) {
  const store = useBookmarkStore(isLoggedIn);
  const [active, setActive] = useState(false);

  // SSR renders the inactive state (☆); the effect runs only on the client
  // and updates `active` to match the real store value. No hydration-gate
  // state is needed — server and client agree on the initial DOM.
  useEffect(() => {
    let cancelled = false;
    function refresh() {
      void store.has(kind, slug).then((v) => { if (!cancelled) setActive(v); });
    }
    refresh();
    window.addEventListener('cinecanon:bookmarks-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('cinecanon:bookmarks-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [store, kind, slug]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowActive = await store.toggle({ kind, slug, title, subtitle, href });
    setActive(nowActive);
    // Local store dispatches the event itself; server store doesn't.
    if (isLoggedIn) {
      window.dispatchEvent(new CustomEvent('cinecanon:bookmarks-changed'));
    }
  }

  const dim = size === 'sm' ? 'h-5 w-5 text-base' : 'h-6 w-6 text-lg';
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? 'Remove bookmark' : 'Bookmark this'}
      aria-label={active ? `Remove bookmark for ${title}` : `Bookmark ${title}`}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center justify-center rounded transition-colors ${dim} ${
        active ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-zinc-300'
      }`}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
