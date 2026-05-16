import Link from 'next/link';

/**
 * Shared paginator. Replaces ~8 ad-hoc copies scattered across the
 * /films, /references, and admin pages. Each caller was rolling its
 * own "Page X of Y · Prev · Next" layout with subtly different
 * styling.
 *
 * `buildHref` is a closure so the caller controls how page numbers map
 * to URLs (search params, path segments, whatever). The component
 * hides itself when there's only one page.
 *
 * a11y: nav landmark with aria-label, aria-current on the active page,
 * aria-disabled on the bounds.
 *
 * UX-audit E7: numbered page buttons alongside Prev/Next. Renders a
 * windowed range (current ± 2) with first/last anchors and ellipses
 * for jumps. Cap of ~7 visible numbers prevents horizontal overflow on
 * 320px viewports.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  ariaLabel = 'Pagination',
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  ariaLabel?: string;
}) {
  if (totalPages <= 1) return null;
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  // Windowed page list. Always show first + last; show current ± 2 in between;
  // collapse gaps to '…'. Result: [1, …, 4, 5, 6, 7, 8, …, 24].
  const pageNumbers: Array<number | '…'> = [];
  const seen = new Set<number>();
  function push(n: number) {
    if (n >= 1 && n <= totalPages && !seen.has(n)) {
      seen.add(n);
      pageNumbers.push(n);
    }
  }
  push(1);
  for (let p = page - 2; p <= page + 2; p++) push(p);
  push(totalPages);
  // Insert ellipses where gaps exist.
  const windowed: Array<number | '…'> = [];
  for (let i = 0; i < pageNumbers.length; i++) {
    const cur = pageNumbers[i] as number;
    const prev = pageNumbers[i - 1] as number | undefined;
    if (prev !== undefined && cur - prev > 1) windowed.push('…');
    windowed.push(cur);
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <div className="text-zinc-400">
        Page <span className="tabular-nums text-zinc-300">{page}</span> of{' '}
        <span className="tabular-nums text-zinc-300">{totalPages}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {prevPage ? (
          <Link
            href={buildHref(prevPage)}
            rel="prev"
            className="rounded border border-zinc-800 px-2.5 py-1 text-zinc-300 hover:border-amber-700/60 hover:text-amber-400"
          >
            <span aria-hidden="true">← </span>Prev
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="rounded border border-zinc-900 px-2.5 py-1 text-zinc-500"
          >
            <span aria-hidden="true">← </span>Prev
          </span>
        )}
        {windowed.map((entry, i) =>
          entry === '…' ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-zinc-500">…</span>
          ) : entry === page ? (
            <span
              key={entry}
              aria-current="page"
              className="rounded border border-amber-600 bg-amber-950/40 px-2.5 py-1 font-mono tabular-nums text-amber-300"
            >
              {entry}
            </span>
          ) : (
            <Link
              key={entry}
              href={buildHref(entry)}
              aria-label={`Page ${entry}`}
              className="rounded border border-zinc-800 px-2.5 py-1 font-mono tabular-nums text-zinc-300 hover:border-amber-700/60 hover:text-amber-400"
            >
              {entry}
            </Link>
          ),
        )}
        {nextPage ? (
          <Link
            href={buildHref(nextPage)}
            rel="next"
            className="rounded border border-zinc-800 px-2.5 py-1 text-zinc-300 hover:border-amber-700/60 hover:text-amber-400"
          >
            Next<span aria-hidden="true"> →</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="rounded border border-zinc-900 px-2.5 py-1 text-zinc-500"
          >
            Next<span aria-hidden="true"> →</span>
          </span>
        )}
      </div>
    </nav>
  );
}
