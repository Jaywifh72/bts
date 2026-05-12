import Link from 'next/link';
import { FORMAT_TAXONOMY } from '@/lib/formats';

interface Format {
  aspect_ratio: string;
  acquisition_format: string;
  label?: string | null;
}

/**
 * T4-4 — try to map a free-text acquisition_format string to a canonical
 * format taxonomy slug for "Shot on this format" linking. Returns null
 * when no taxonomy entry's pattern matches (the badge degrades to plain
 * text in that case rather than linking to a 404).
 */
function findFormatSlug(acquisitionFormat: string): string | null {
  const haystack = acquisitionFormat.toLowerCase();
  for (const entry of FORMAT_TAXONOMY) {
    for (const pattern of entry.patterns) {
      // The query layer uses ILIKE; here we just need a JS substring match
      // on the % wildcards. Strip them and test contains.
      const needle = pattern.replace(/%/g, '').toLowerCase().trim();
      if (needle && haystack.includes(needle)) return entry.slug;
    }
  }
  return null;
}

/**
 * `linkify` opts in to making the acquisition_format text a `<Link>` to
 * the canonical /format/<slug> page. Off by default — many call sites
 * render this inside a parent `<Link>` (e.g. ProductionCard wraps the
 * whole card in an anchor), and nesting `<a>` tags causes browser
 * auto-correction + hydration mismatches. Turn it on only when you know
 * the badge has no anchor ancestor (e.g. the film detail header).
 */
export function FormatBadge({
  format,
  linkify = false,
}: {
  format: Format;
  linkify?: boolean;
}) {
  const slug = linkify ? findFormatSlug(format.acquisition_format) : null;
  const formatText = slug ? (
    <Link href={`/format/${slug}`} className="hover:text-amber-400">
      {format.acquisition_format}
    </Link>
  ) : (
    <span>{format.acquisition_format}</span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
      <span className="font-medium text-zinc-100">{format.aspect_ratio}</span>
      <span className="text-zinc-500">·</span>
      {formatText}
      {format.label && (
        <>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-500">{format.label}</span>
        </>
      )}
    </span>
  );
}
