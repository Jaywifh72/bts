export default function Loading() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-zinc-50">SEO Audit</h1>
        <p className="mt-1 text-sm text-zinc-400">Running…</p>
      </header>
      <section className="rounded border-2 border-amber-700/40 bg-amber-600/10 p-5">
        <p className="text-[10px] uppercase tracking-widest text-amber-300">Audit in progress</p>
        <p className="mt-2 font-serif text-lg text-zinc-50">
          Fetching 14 priority pages and parsing on-page SEO signals…
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          Server-side run. ~10–15s without Core Web Vitals, ~40–90s with PSI.
          Page will refresh automatically when complete.
        </p>
      </section>
    </div>
  );
}
