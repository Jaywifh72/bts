'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Compact search input that lives in the TopNav. Submits to /search?q=...
 * via plain form GET so results are bookmarkable / shareable.
 *
 * "/" focuses the input from anywhere on the page (Wikipedia / GitHub
 * convention). Ignored when another input/textarea is already focused so
 * we don't hijack typing.
 */
export function SearchBar() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  // The nav SearchBar always renders empty — the /search page itself shows
  // the active query in its header. Keeps this component CSR-safe (no
  // useSearchParams) so it can sit in the root layout without forcing every
  // SSG'd page into Suspense bailout.

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? '';
    if (q.length === 0) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative" role="search">
      <input
        ref={inputRef}
        name="q"
        type="search"
        placeholder="Search…"
        aria-label="Search productions, crew, gear, VFX"
        className="w-44 rounded border border-zinc-800 bg-zinc-900 py-1 pl-3 pr-9 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:w-64 transition-all"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-[10px] text-zinc-500">
        /
      </kbd>
    </form>
  );
}
