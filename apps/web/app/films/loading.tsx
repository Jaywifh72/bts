export default function Loading() {
  // UX-audit G12 — skeleton mirrors the post-audit /films page layout:
  // PageHero (with CSV export action) + filter row + view-toggle pill
  // + 3-column ProductionCard grid. Prevents layout shift when real
  // content arrives.
  return (
    <div className="animate-pulse" aria-label="Loading films" aria-busy="true">
      <div className="mb-10 border-b border-zinc-800 pb-8">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="h-3 w-16 rounded bg-zinc-800" />
            <div className="mt-3 h-12 w-40 rounded bg-zinc-800" />
            <div className="mt-3 h-3 w-72 rounded bg-zinc-800" />
          </div>
          <div className="h-7 w-24 rounded border border-zinc-800 bg-zinc-900/40" />
        </div>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="flex flex-1 flex-wrap gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="h-9 w-48 rounded bg-zinc-800" />
          <div className="h-9 w-32 rounded bg-zinc-800" />
          <div className="h-9 w-32 rounded bg-zinc-800" />
          <div className="h-9 w-32 rounded bg-zinc-800" />
          <div className="ml-auto h-9 w-16 rounded bg-zinc-800" />
        </div>
        <div className="h-9 w-24 rounded border border-zinc-800 bg-zinc-900/40" />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <li key={i} className="flex gap-3 rounded border border-zinc-800 bg-zinc-900 p-3">
            <div className="h-[108px] w-[72px] shrink-0 rounded bg-zinc-800" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-800" />
              <div className="h-3 w-2/3 rounded bg-zinc-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
