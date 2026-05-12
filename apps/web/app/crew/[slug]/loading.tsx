export default function Loading() {
  return (
    <div className="animate-pulse" aria-label="Loading crew member" aria-busy="true">
      <div className="mb-10 flex items-start gap-5">
        <div className="h-24 w-24 shrink-0 rounded-full bg-zinc-800" />
        <div className="flex-1 space-y-3">
          <div className="h-10 w-2/3 rounded bg-zinc-800" />
          <div className="h-3 w-1/3 rounded bg-zinc-800" />
          <div className="h-4 w-3/4 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="mb-3 h-3 w-32 rounded bg-zinc-800" />
            <div className="h-40 rounded border border-zinc-800 bg-zinc-900/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
