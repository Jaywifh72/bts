import Link from 'next/link';

/**
 * Renders inline `[N]` source markers next to a claim. Each number links
 * to the same-page anchor `#source-N` rendered by `<SourcesList>`. Empty
 * input → renders nothing (caller doesn't need to guard).
 */
export function CitationMarker({ numbers }: { numbers: readonly number[] }) {
  if (numbers.length === 0) return null;
  return (
    <span className="ml-1 inline-flex items-baseline gap-0.5 align-baseline" aria-label={`sources ${numbers.join(', ')}`}>
      {numbers.map((n, i) => (
        <span key={n} className="text-[10px] leading-none text-amber-400/80">
          {i > 0 && <span className="text-zinc-600">,</span>}
          <Link href={`#source-${n}`} className="hover:text-amber-300">
            [{n}]
          </Link>
        </span>
      ))}
    </span>
  );
}
