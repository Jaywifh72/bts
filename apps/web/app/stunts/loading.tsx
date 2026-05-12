export default function Loading() {
  return (
    <div className="animate-pulse" aria-label="Loading stunts" aria-busy="true">
      <div className="mb-10">
        <div className="h-3 w-16 rounded bg-zinc-800" />
        <div className="mt-2 h-10 w-64 rounded bg-zinc-800" />
        <div className="mt-3 h-4 w-1/2 rounded bg-zinc-800" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="mb-3 h-3 w-32 rounded bg-zinc-800" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-24 rounded border border-zinc-800 bg-zinc-900/40" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
