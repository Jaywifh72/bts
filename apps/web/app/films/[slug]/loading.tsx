export default function Loading() {
  return (
    <div className="animate-pulse" aria-label="Loading film" aria-busy="true">
      <div className="mb-10 flex gap-6">
        <div className="hidden h-[260px] w-44 shrink-0 rounded bg-zinc-800 sm:block" />
        <div className="flex-1 space-y-3 py-4">
          <div className="h-3 w-32 rounded bg-zinc-800" />
          <div className="h-12 w-3/4 rounded bg-zinc-800" />
          <div className="h-4 w-2/3 rounded bg-zinc-800" />
          <div className="mt-4 h-3 w-1/2 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="mb-3 h-3 w-24 rounded bg-zinc-800" />
            <div className="h-32 rounded border border-zinc-800 bg-zinc-900/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
