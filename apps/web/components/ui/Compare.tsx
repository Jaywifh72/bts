'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * UX-audit P0-3 — comparability primitives. Two pieces in one file because
 * they share the URL-state contract (`?items=a,b,c`):
 *
 *   <CompareCheckbox slug="dune-part-two-2024" />
 *     Sits on each card in the grid. Toggles a slug into the compare set.
 *
 *   <CompareDrawer basePath="/films" compareHref="/films/compare" />
 *     Sticky-bottom drawer that appears as soon as ≥1 item is selected.
 *     Renders the selected count and a "Compare →" CTA.
 *
 * The set is capped at 4 — past that, comparisons collapse into illegible
 * column-of-columns. Trying to check a 5th is a no-op (matches Gear's
 * existing compare contract).
 */
const MAX_COMPARE = 4;
const PARAM = 'items';

function parseItems(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Coarse slug → display. "dune-part-two-2024" → "Dune Part Two 2024".
 *  Cheap heuristic for the drawer's preview strip; the destination page
 *  still resolves the true title from the DB. */
function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function useCompareState() {
  const router = useRouter();
  const params = useSearchParams();
  const items = useMemo(() => parseItems(params.get(PARAM)), [params]);

  const toggle = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(params);
      const current = parseItems(next.get(PARAM));
      const has = current.includes(slug);
      const updated = has
        ? current.filter((s) => s !== slug)
        : current.length >= MAX_COMPARE
          ? current
          : [...current, slug];
      if (updated.length === 0) next.delete(PARAM);
      else next.set(PARAM, updated.join(','));
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [params, router],
  );

  return { items, toggle };
}

export function CompareCheckbox({ slug, label }: { slug: string; label?: string }) {
  const { items, toggle } = useCompareState();
  const checked = items.includes(slug);
  const disabled = !checked && items.length >= MAX_COMPARE;
  const human = label ?? slug;
  return (
    <label
      className={`absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-zinc-950/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
        disabled ? 'text-zinc-600' : 'text-zinc-300 hover:text-amber-400'
      }`}
      title={disabled ? `Compare set full (${MAX_COMPARE})` : `Add ${human} to compare set`}
      aria-disabled={disabled || undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(slug)}
        className="accent-amber-600"
        aria-label={
          checked ? `Remove ${human} from compare set` : `Add ${human} to compare set`
        }
      />
      compare
    </label>
  );
}

export function CompareDrawer({
  compareHref,
  itemKindLabel = 'films',
}: {
  /** Destination page (e.g. /films/compare or /crew/compare). */
  compareHref: string;
  /** "films" / "people" — used in the drawer caption. */
  itemKindLabel?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const items = useMemo(() => parseItems(params.get(PARAM)), [params]);

  if (items.length === 0) return null;

  function clear() {
    const next = new URLSearchParams(params);
    next.delete(PARAM);
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Compare selection"
      className="sticky bottom-3 z-20 mx-auto mt-6 flex max-w-2xl items-center gap-3 rounded-lg border border-amber-700/50 bg-zinc-950/95 px-4 py-2.5 shadow-xl backdrop-blur"
    >
      <span className="text-sm text-zinc-300">
        <span className="font-mono text-amber-400">{items.length}</span> {itemKindLabel} selected
      </span>
      <span aria-hidden="true" className="text-xs text-zinc-400 truncate flex-1">
        {items.map(humanizeSlug).join(' · ')}
      </span>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-zinc-400 hover:text-zinc-200"
      >
        Clear
      </button>
      {items.length >= 2 ? (
        <Link
          href={`${compareHref}?${PARAM}=${items.join(',')}`}
          className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-zinc-950 hover:bg-amber-500"
        >
          Compare {items.length} <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="text-xs text-zinc-400">Add 1 more to compare</span>
      )}
    </div>
  );
}
