import Link from 'next/link';

/**
 * UX-audit P0-5 — view-mode switch for archive index pages. Grid is the
 * Letterboxd-style browse view; table is the Bloomberg-Terminal-density
 * scan view a pro reaches for when they're comparing rows.
 *
 * Render this above the result grid on /films and /crew. The component
 * is render-only — it builds <Link> hrefs by merging the active view
 * into the existing query string, so the server-rendered page picks up
 * the new `?view=` value on next navigation.
 */
type View = 'grid' | 'table';

export function ViewToggle({
  basePath,
  currentParams,
  active,
}: {
  basePath: string;
  /** All query params currently on the page (excluding `view`). */
  currentParams: URLSearchParams;
  active: View;
}) {
  function buildHref(target: View): string {
    const params = new URLSearchParams(currentParams);
    if (target === 'grid') params.delete('view');
    else params.set('view', target);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const cls = (target: View) =>
    `rounded px-2 py-1 text-xs ${
      active === target
        ? 'bg-amber-600 text-zinc-950'
        : 'text-zinc-400 hover:bg-zinc-800'
    }`;

  return (
    <nav
      aria-label="Result view"
      className="ml-auto flex gap-1 rounded border border-zinc-800 bg-zinc-900/40 p-1"
    >
      <Link
        href={buildHref('grid')}
        aria-current={active === 'grid' ? 'page' : undefined}
        className={cls('grid')}
      >
        Grid
      </Link>
      <Link
        href={buildHref('table')}
        aria-current={active === 'table' ? 'page' : undefined}
        className={cls('table')}
      >
        Table
      </Link>
    </nav>
  );
}

export function parseView(v: string | undefined): View {
  return v === 'table' ? 'table' : 'grid';
}
