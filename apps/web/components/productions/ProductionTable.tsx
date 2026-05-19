import Link from 'next/link';

/**
 * UX-audit P0-5 — spreadsheet view of the films archive. Same data
 * `ProductionCard` carries, repacked into sortable-looking rows so a DP
 * scanning 60 entries at once can read year/format/aspect/depth-flags
 * without their eyes bouncing across a 3-column grid.
 */
type DepthFlags = {
  has_stunt_sequences?: boolean;
  has_stunt_doubling?: boolean;
  has_color_pipeline?: boolean;
  has_lighting_setups?: boolean;
  has_locations?: boolean;
  has_post_houses?: boolean;
};

type Row = {
  slug: string;
  title: string;
  type: string;
  releaseYear: number | null;
  primaryAspectRatio: string | null;
  primaryAcquisitionFormat: string | null;
  dataTier?: 'curated' | 'imported';
  voteAverage?: string | null;
  depth?: DepthFlags;
};

const DEPTH_DOTS: Array<{ flag: keyof DepthFlags; label: string; cls: string }> = [
  { flag: 'has_stunt_sequences', label: 'Stunts',    cls: 'bg-red-500' },
  { flag: 'has_color_pipeline',  label: 'Colour',    cls: 'bg-purple-500' },
  { flag: 'has_lighting_setups', label: 'Lighting',  cls: 'bg-amber-500' },
  { flag: 'has_locations',       label: 'Locations', cls: 'bg-blue-500' },
  { flag: 'has_post_houses',     label: 'Post',      cls: 'bg-zinc-400' },
];

type SortKey = 'recent' | 'oldest' | 'title' | 'popularity' | 'rating';

// Header helper — when sortable wiring is provided, render as a link with
// an active-state arrow glyph; otherwise plain text. Declared at module
// scope so React 19's static-components rule is satisfied; previously
// nested inside ProductionTable, which caused state-resetting remounts.
function SortHeader({
  targetA,
  targetB,
  label,
  currentSort,
  buildSortHref,
}: {
  targetA: SortKey;
  targetB?: SortKey;
  label: string;
  currentSort?: SortKey;
  buildSortHref?: (target: SortKey) => string;
}) {
  if (!buildSortHref) {
    return <th scope="col" className="px-3 py-2 text-left font-normal">{label}</th>;
  }
  const isActive = currentSort === targetA || (targetB && currentSort === targetB);
  const next = currentSort === targetA && targetB ? targetB : targetA;
  const glyph = !isActive ? '' : currentSort === 'oldest' || currentSort === 'title' ? ' ↑' : ' ↓';
  return (
    <th
      scope="col"
      aria-sort={isActive ? (currentSort === 'oldest' || currentSort === 'title' ? 'ascending' : 'descending') : 'none'}
      className="px-3 py-2 text-left font-normal"
    >
      <Link
        href={buildSortHref(next)}
        className={`hover:text-amber-400 ${isActive ? 'text-amber-300' : ''}`}
      >
        {label}<span aria-hidden="true">{glyph}</span>
      </Link>
    </th>
  );
}

export function ProductionTable({
  rows,
  currentSort,
  buildSortHref,
}: {
  rows: Row[];
  /** Current sort key from URL state, if the caller wants sortable headers. */
  currentSort?: SortKey;
  /** Build an href that sets `?sort=`. When omitted, headers render as plain text. */
  buildSortHref?: (target: SortKey) => string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Films"
      className="scroll-hint-right overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
    >
      <table className="stack-on-mobile w-full text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
          <tr>
            <SortHeader targetA="title" label="Title" currentSort={currentSort} buildSortHref={buildSortHref} />
            <SortHeader targetA="recent" targetB="oldest" label="Year" currentSort={currentSort} buildSortHref={buildSortHref} />
            <th scope="col" className="px-3 py-2 text-left font-normal">Format</th>
            <th scope="col" className="px-3 py-2 text-left font-normal">Aspect</th>
            <th scope="col" className="px-3 py-2 text-left font-normal" title="Editorial-depth flags: stunts, colour, lighting, locations, post">Depth</th>
            <SortHeader targetA="rating" label="Rating" currentSort={currentSort} buildSortHref={buildSortHref} />
            <th scope="col" className="px-3 py-2 text-left font-normal">Tier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
              <tr key={r.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                <td data-label="Title" className="px-3 py-2">
                  <Link href={`/films/${r.slug}`} className="text-zinc-100 hover:text-amber-400">
                    {r.title}
                  </Link>
                  {r.type !== 'movie' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-zinc-500">{r.type}</span>
                  )}
                </td>
                <td data-label="Year" className="px-3 py-2 font-mono tabular-nums text-zinc-400">{r.releaseYear ?? '—'}</td>
                <td data-label="Format" className="px-3 py-2 text-zinc-300">
                  {r.primaryAcquisitionFormat ?? <span className="text-zinc-500">—</span>}
                </td>
                <td data-label="Aspect" className="px-3 py-2 font-mono tabular-nums text-zinc-400">{r.primaryAspectRatio ?? '—'}</td>
                <td data-label="Depth" className="px-3 py-2">
                  <div className="flex gap-1">
                    {DEPTH_DOTS.map((d) =>
                      r.depth?.[d.flag] ? (
                        <span key={d.flag} className="inline-flex items-center">
                          <span className="sr-only">{d.label} curated. </span>
                          <span
                            aria-hidden="true"
                            title={`${d.label} curated`}
                            className={`inline-block h-1.5 w-1.5 rounded-full ${d.cls}`}
                          />
                        </span>
                      ) : null,
                    )}
                  </div>
                </td>
                <td data-label="Rating" className="px-3 py-2 font-mono tabular-nums text-zinc-400">
                  {r.voteAverage ? Number(r.voteAverage).toFixed(1) : <span className="text-zinc-500">—</span>}
                </td>
                <td data-label="Tier" className="px-3 py-2">
                  {r.dataTier === 'curated' ? (
                    <span className="rounded border border-amber-700/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">
                      curated
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-zinc-400">imported</span>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {/* Depth-dot legend so the colour code in the Depth column is
          self-explanatory without hover. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800 bg-zinc-900/30 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-300">
        <span className="text-zinc-400">Depth legend:</span>
        {DEPTH_DOTS.map((d) => (
          <span key={d.flag} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${d.cls}`} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
