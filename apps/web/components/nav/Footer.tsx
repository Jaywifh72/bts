import Link from 'next/link';

/**
 * Site-wide footer. Establishes that the site has an editorial point of view,
 * cites its sources, and is open about what's hand-curated vs sourced from
 * TMDb. Also includes a simple About link so a working pro can decide whether
 * to trust the data before bookmarking.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-8 text-xs text-zinc-500">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="font-serif text-sm text-zinc-300">Studio Pro</p>
            <p className="mt-1 max-w-xs text-zinc-500">
              Cinematic technical reference for working film professionals.
              Hand-curated where it counts; TMDb-sourced metadata for breadth.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Browse</p>
            <Link href="/films?tier=curated" className="hover:text-zinc-300">Curated films</Link>
            <Link href="/films" className="hover:text-zinc-300">All films</Link>
            <Link href="/crew" className="hover:text-zinc-300">Crew</Link>
            <Link href="/gear" className="hover:text-zinc-300">Gear</Link>
            <Link href="/vfx" className="hover:text-zinc-300">VFX houses</Link>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Reference</p>
            <Link href="/queries/alexa65-sphero" className="hover:text-zinc-300">ALEXA 65 + Sphero</Link>
            <Link href="/queries/dune-part-two-lenses" className="hover:text-zinc-300">Dune Part Two lenses</Link>
            <Link href="/queries/magic-hour-2023" className="hover:text-zinc-300">Magic-hour, 2023</Link>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">About</p>
            <Link href="/about" className="hover:text-zinc-300">About this site</Link>
            <Link href="/about#sources" className="hover:text-zinc-300">Data sources</Link>
            <Link href="/about#methodology" className="hover:text-zinc-300">Methodology</Link>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-4 text-[11px] text-zinc-600">
          <p>Movie metadata courtesy of <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">TMDb</a> — this product uses the TMDb API but is not endorsed or certified by TMDb.</p>
          <p>© {new Date().getFullYear()} Studio Pro</p>
        </div>
      </div>
    </footer>
  );
}
