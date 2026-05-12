export default function Loading() {
  return (
    <div className="animate-pulse py-4" aria-label="Loading admin view" aria-busy="true">
      <div className="mb-6 h-10 w-1/3 rounded bg-zinc-800" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 rounded border border-zinc-800 bg-zinc-900/40" />
        ))}
      </div>
    </div>
  );
}
