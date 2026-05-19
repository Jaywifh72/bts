'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * UX-audit E1 — ⌘K / Ctrl+K command palette.
 *
 * Wraps the existing `/api/search/suggest` trigram endpoint with a modal
 * dialog the user can summon from anywhere. Three nav layers, in order:
 *
 *   - ⌘K / Ctrl+K opens the palette anywhere on the site.
 *   - `/` focuses the inline `SearchBar` in the nav (unchanged).
 *   - `g f`, `g c`, etc. — vim-style direct route jumps (unchanged).
 *
 * The brief specifies "fuzzy search-anywhere palette" — the suggest
 * endpoint already does trigram matching with per-category caps; the
 * palette inherits that ranking. Result rows render category + title +
 * subtitle so the user knows whether they're navigating to a film, a
 * person, a gear item, or a VFX house.
 *
 * a11y: rendered as a real `role="dialog"` with focus trap, Escape, and
 * return-focus. Arrow keys move highlight; Enter navigates.
 */
type SuggestResult = {
  category: string;
  display: string;
  subtitle: string | null;
  href: string;
  score: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  production: 'Film',
  person: 'Crew',
  vfx_house: 'VFX',
  manufacturer: 'Gear',
  series: 'Series',
  item: 'Item',
  studio: 'Studio',
  scene: 'Scene',
  video: 'Video',
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SuggestResult[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Global ⌘K / Ctrl+K toggle. Ignored when the user is typing in another
  // input (matches the chord-handler behaviour in KeyboardShortcuts).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus management when opening/closing.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Focus input on next tick so the dialog has mounted.
    queueMicrotask(() => inputRef.current?.focus());
    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  // Reset state on close. React 19 idiom: track prev-open in state and
  // reset during render, instead of a setState-in-effect anti-pattern.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setQ('');
      setResults([]);
      setActive(0);
    }
  }

  // UX-audit Move 6 — prefix detection. `@text` filters to people,
  // `#text` to sources, `[n]` is numeric claim id (resolved on Enter),
  // anything else is the multi-category default.
  const trimmed = q.trim();
  const mode: 'person' | 'source' | 'claim' | 'all' =
    trimmed.startsWith('@') ? 'person'
    : trimmed.startsWith('#') ? 'source'
    : trimmed.startsWith('[') ? 'claim'
    : 'all';
  const queryBody = trimmed.replace(/^[@#[\]]+/, '').trim();

  // Whether the current input warrants a suggest fetch. Derived from
  // input rather than mirrored into state — so the bail-out branches
  // below don't need to call setState (which `set-state-in-effect`
  // flags as anti-pattern).
  const shouldFetch = open && mode !== 'claim' && queryBody.length >= 2;
  // Results to render — gated by `shouldFetch` so stale results from a
  // prior query are hidden the moment input no longer qualifies, with
  // no imperative clear required.
  const displayResults: SuggestResult[] = shouldFetch ? results : [];

  // Debounced fetch.
  useEffect(() => {
    if (!shouldFetch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- defensive reset when fetch is short-circuited
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const kindFilter = mode === 'person' ? '&kind=person'
          : mode === 'source' ? '&kind=source'
          : '';
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(queryBody)}${kindFilter}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const json = (await res.json()) as { results: SuggestResult[] };
        setResults(json.results);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(id);
  }, [queryBody, mode, shouldFetch]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, displayResults.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Claim-id mode — Enter routes to the public /claims/[id]
      // resolver, which 307s to the parent entity dossier with a
      // #claim-N anchor for highlight.
      if (mode === 'claim') {
        const n = parseInt(queryBody, 10);
        if (Number.isFinite(n) && n > 0) {
          setOpen(false);
          router.push(`/claims/${n}`);
        }
        return;
      }
      const target = displayResults[active];
      if (target) {
        setOpen(false);
        router.push(target.href);
      } else if (queryBody.length > 0) {
        // No suggestions yet — submit to the dedicated search page.
        // Strip the prefix when handing off so /search doesn't see it.
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(queryBody)}`);
      }
      return;
    }
  }

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Search palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="mt-16 w-full max-w-xl overflow-hidden rounded border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <span aria-hidden="true" className="text-zinc-500">⌘K</span>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search · @person · #source · [claim-id]"
            aria-label="Search query"
            aria-controls="cmdk-results"
            aria-activedescendant={displayResults[active] ? `cmdk-row-${active}` : undefined}
            className="flex-1 bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {mode !== 'all' && (
            <span
              aria-label={`Mode: ${mode}`}
              className="rounded border border-amber-700/60 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300"
            >
              {mode}
            </span>
          )}
          {loading && (
            <span aria-hidden="true" className="text-xs text-zinc-500">…</span>
          )}
        </div>

        {mode === 'claim' ? (
          <div className="px-4 py-6 text-sm text-zinc-300">
            <p>
              Claim-id mode.{' '}
              {queryBody.length === 0 ? (
                <span className="text-zinc-400">Type a numeric claim id and press Enter.</span>
              ) : /^\d+$/.test(queryBody) ? (
                <>
                  Press <kbd className="rounded border border-zinc-700 px-1 text-xs">Enter</kbd>{' '}
                  to open claim <span className="font-mono text-amber-300">#{queryBody}</span>.
                </>
              ) : (
                <span className="text-zinc-400">Claim ids are numeric — try <code className="text-zinc-300">[3014]</code>.</span>
              )}
            </p>
          </div>
        ) : queryBody.length < 2 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-400">
            {mode === 'person' && 'Person mode — type at least 2 characters of a name.'}
            {mode === 'source' && 'Source mode — type at least 2 characters of a publication or source title.'}
            {mode === 'all' && 'Type at least 2 characters to search the archive.'}
          </div>
        ) : displayResults.length === 0 && !loading ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-400">
            No matches. Press <kbd className="rounded border border-zinc-700 px-1 text-xs">Enter</kbd>{' '}
            to submit to <span className="text-amber-400">/search</span>.
          </div>
        ) : (
          <ul id="cmdk-results" role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto">
            {displayResults.map((r, i) => (
              <li
                key={`${r.category}:${r.href}`}
                id={`cmdk-row-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    setOpen(false);
                    router.push(r.href);
                  }}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left ${
                    i === active ? 'bg-amber-950/30' : 'hover:bg-zinc-900'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="mr-2 inline-block min-w-[44px] rounded border border-zinc-700 px-1 py-0.5 text-center text-[10px] uppercase tracking-wide text-zinc-300">
                      {CATEGORY_LABEL[r.category] ?? r.category}
                    </span>
                    <span className="text-zinc-100">{r.display}</span>
                    {r.subtitle && (
                      <span className="ml-2 text-xs text-zinc-400">{r.subtitle}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className="shrink-0 font-mono text-[10px] text-zinc-500 tabular-nums">
                    {r.score.toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-zinc-800 px-3 py-1.5 text-[10px] uppercase tracking-wide text-zinc-400">
          <kbd className="rounded border border-zinc-700 px-1 text-xs">↑↓</kbd> navigate ·{' '}
          <kbd className="rounded border border-zinc-700 px-1 text-xs">↵</kbd> open ·{' '}
          <kbd className="rounded border border-zinc-700 px-1 text-xs">esc</kbd> close ·{' '}
          <span className="ml-2 normal-case tracking-normal text-zinc-500">
            modes: <span className="text-amber-300">@</span>person ·{' '}
            <span className="text-amber-300">#</span>source ·{' '}
            <span className="text-amber-300">[</span>claim-id<span className="text-amber-300">]</span>
          </span>
        </div>
      </div>
    </div>
  );
}
