export default function Loading() {
  return (
    <div className="animate-pulse" aria-label="Loading crew" aria-busy="true">
      <div className="mb-8">
        <div className="h-3 w-16 rounded bg-zinc-800" />
        <div className="mt-2 h-10 w-48 rounded bg-zinc-800" />
      </div>
      <ul className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
