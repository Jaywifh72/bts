export default function Loading() {
  return (
    <div className="animate-pulse" aria-label="Loading gear" aria-busy="true">
      <div className="mb-8">
        <div className="h-3 w-16 rounded bg-zinc-800" />
        <div className="mt-2 h-10 w-48 rounded bg-zinc-800" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <li
            key={i}
            className="flex gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-4"
          >
            <div className="h-14 w-14 shrink-0 rounded bg-zinc-800" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-2/3 rounded bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
