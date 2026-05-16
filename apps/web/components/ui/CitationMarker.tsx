import Link from 'next/link';

/**
 * Renders inline `[N]` source markers next to a claim. Each number links
 * to the same-page anchor `#source-N` rendered by `<SourcesList>`. Empty
 * input → renders nothing (caller doesn't need to guard).
 *
 * A11y: each link carries `aria-describedby={`source-${n}`}` so a screen
 * reader announces the source title alongside the citation. The bracketed
 * number is also visually distinguishable at 4.5:1 (amber-300, full opacity).
 */
/** UX-audit G4: size variants so `[N]` doesn't disappear in dense
 *  12px caption rows (gear specs, scene tables). `sm` (default) is the
 *  10px footnote pill used in body copy. `xs` keeps the same visual
 *  weight but raises text to 11px so it survives smaller surrounding
 *  type. `md` is for 14px+ body where 10px would feel too small. */
type CitationMarkerSize = 'xs' | 'sm' | 'md';

const SIZE_CLASS: Record<CitationMarkerSize, string> = {
  xs: 'text-[11px] leading-none',
  sm: 'text-[10px] leading-none',
  md: 'text-xs leading-none',
};

export function CitationMarker({
  numbers,
  size = 'sm',
}: {
  numbers: readonly number[];
  size?: CitationMarkerSize;
}) {
  if (numbers.length === 0) return null;
  return (
    <span className="ml-1 inline-flex items-baseline gap-0.5 align-baseline">
      <span className="sr-only">Sources: </span>
      {numbers.map((n, i) => (
        <span key={n} className={`${SIZE_CLASS[size]} text-amber-300`}>
          {i > 0 && <span aria-hidden="true" className="text-zinc-400">,</span>}
          <Link
            href={`#source-${n}`}
            aria-describedby={`source-${n}`}
            className="hover:text-amber-200"
          >
            [{n}]
          </Link>
        </span>
      ))}
    </span>
  );
}
