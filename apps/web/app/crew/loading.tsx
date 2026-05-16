export default function Loading() {
  // UX-audit G12 — skeleton mirrors the actual /crew page layout:
  // PageHero strip + filter row + view toggle + 3-column grid of
  // PersonCard shapes. Avoids the layout shift the previous
  // vertical-list version caused once the real grid rendered.
  return (
    <div className="animate-pulse" aria-label="Loading crew" aria-busy="true">
      <div className="mb-10 border-b border-zinc-800 pb-8">
        <div className="h-3 w-16 rounded bg-zinc-800" />
        <div className="mt-3 h-12 w-48 rounded bg-zinc-800" />
        <div className="mt-3 h-3 w-72 rounded bg-zinc-800" />
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="flex flex-1 flex-wrap gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="h-9 w-32 rounded bg-zinc-800" />
          <div className="h-9 w-32 rounded bg-zinc-800" />
          <div className="ml-auto h-9 w-16 rounded bg-zinc-800" />
        </div>
        <div className="h-9 w-24 rounded border border-zinc-800 bg-zinc-900/40" />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3"
          >
            <div className="h-14 w-14 shrink-0 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
