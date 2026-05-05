'use client';

import { useEffect, useState } from 'react';
import { isBookmarked, toggleBookmark, type BookmarkKind } from '@/lib/bookmarks';

/**
 * Heart-style bookmark toggle. Pure client; no auth needed.
 * Listens to a custom event so multiple instances on the same page
 * (and across tabs sharing localStorage) stay in sync.
 */
export function BookmarkButton({
  kind,
  slug,
  title,
  subtitle,
  href,
  size = 'md',
}: {
  kind: BookmarkKind;
  slug: string;
  title: string;
  subtitle?: string;
  href: string;
  size?: 'sm' | 'md';
}) {
  const [active, setActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setActive(isBookmarked(kind, slug));
    function refresh() { setActive(isBookmarked(kind, slug)); }
    window.addEventListener('studiopro:bookmarks-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('studiopro:bookmarks-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [kind, slug]);

  if (!hydrated) {
    // Avoid SSR/CSR mismatch flash; render a placeholder of the same size.
    return <span aria-hidden className={size === 'sm' ? 'inline-block h-5 w-5' : 'inline-block h-6 w-6'} />;
  }

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowActive = toggleBookmark({ kind, slug, title, subtitle, href });
    setActive(nowActive);
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
