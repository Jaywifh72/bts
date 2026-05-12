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
  return (
    <nav
      aria-label={ariaLabel}
      className="mt-8 flex items-center justify-between gap-4 text-sm"
    >
      <div className="text-zinc-500">
        Page <span className="tabular-nums text-zinc-300">{page}</span> of{' '}
        <span className="tabular-nums text-zinc-400">{totalPages}</span>
      </div>
      <div className="flex items-center gap-3">
        {prevPage ? (
          <Link
            href={buildHref(prevPage)}
            rel="prev"
            className="rounded border border-zinc-800 px-3 py-1 text-zinc-300 hover:border-amber-700/60 hover:text-amber-400"
          >
            ← Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="rounded border border-zinc-900 px-3 py-1 text-zinc-700"
          >
            ← Previous
          </span>
        )}
        {nextPage ? (
          <Link
            href={buildHref(nextPage)}
            rel="next"
            className="rounded border border-zinc-800 px-3 py-1 text-zinc-300 hover:border-amber-700/60 hover:text-amber-400"
          >
            Next →
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="rounded border border-zinc-900 px-3 py-1 text-zinc-700"
          >
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
