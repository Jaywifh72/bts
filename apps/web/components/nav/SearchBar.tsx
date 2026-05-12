'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  category: string;
  display: string;
  subtitle: string | null;
  href: string;
  score: number;
};

const CATEGORY_ICON: Record<string, string> = {
  production: '🎬',
  person: '👤',
  vfx_house: '✨',
  manufacturer: '🏭',
  series: '📷',
  item: '🔧',
  studio: '🎞',
  scene: '🎭',
  video: '▶',
};

/**
 * Search input in the TopNav with debounced autocomplete (T5-1).
 *
 * Behaviour:
 *   - "/" focuses the input from anywhere (ignored when another input
 *     has focus so we don't hijack typing).
 *   - 200ms debounce after each keystroke fires GET /api/search/suggest.
 *   - Arrow up/down navigates suggestions; Enter follows the highlighted
 *     suggestion (or submits to /search if nothing highlighted).
 *   - Esc closes the dropdown.
 *   - Click outside closes the dropdown.
 *   - Empty submit is a no-op.
 */
export function SearchBar() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  // Global "/" focus shortcut
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

  // Click-outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!inputRef.current?.parentElement?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced fetch of suggestions
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        setSuggestions(data.results);
        setOpen(true);
        setHighlightedIdx(-1);
      } catch {
        // ignore aborts
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [q]);

  function followAt(idx: number) {
    const target = suggestions[idx];
    if (!target) return;
    setOpen(false);
    router.push(target.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightedIdx(-1);
    } else if (e.key === 'Enter') {
      if (highlightedIdx >= 0) {
        e.preventDefault();
        followAt(highlightedIdx);
      }
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length === 0) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative" role="search" autoComplete="off">
      <input
        ref={inputRef}
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search…"
        aria-label="Search productions, crew, gear, VFX"
        aria-autocomplete="list"
        // Only reference the listbox when it's actually in the DOM —
        // otherwise screen readers report a dangling controls relation.
        aria-controls={open && suggestions.length > 0 ? 'search-suggest' : undefined}
        aria-expanded={open && suggestions.length > 0}
        // On small viewports the focus-expand to w-72 overflows; only
        // apply the expansion at sm+ widths.
        className="w-44 rounded border border-zinc-800 bg-zinc-900 py-1 pl-3 pr-9 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none sm:focus:w-72 transition-all"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-[10px] text-zinc-500">
        /
      </kbd>
      {open && suggestions.length > 0 && (
        <ul
          id="search-suggest"
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded border border-zinc-800 bg-zinc-950 text-sm shadow-2xl"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.category}:${s.href}`} role="option" aria-selected={i === highlightedIdx}>
              <a
                href={s.href}
                onMouseEnter={() => setHighlightedIdx(i)}
                onMouseDown={(e) => { e.preventDefault(); followAt(i); }}
                className={`flex items-center gap-3 px-3 py-2 ${
                  i === highlightedIdx ? 'bg-zinc-900' : 'hover:bg-zinc-900'
                }`}
              >
                <span className="text-base" aria-hidden>{CATEGORY_ICON[s.category] ?? '•'}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-200">{s.display}</span>
                {s.subtitle && (
                  <span className="shrink-0 text-xs text-zinc-500">{s.subtitle}</span>
                )}
              </a>
            </li>
          ))}
          <li>
            <a
              href={`/search?q=${encodeURIComponent(q.trim())}`}
              onMouseDown={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q.trim())}`); setOpen(false); }}
              className="block border-t border-zinc-800 bg-zinc-900/50 px-3 py-2 text-center text-xs text-amber-400 hover:bg-zinc-900"
            >
              See all results for "{q.trim()}" →
            </a>
          </li>
        </ul>
      )}
    </form>
  );
}
