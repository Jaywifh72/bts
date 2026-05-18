import Link from 'next/link';
import { CineCanonMark } from '@/components/brand/CineCanonMark';

/**
 * Site-wide footer. Establishes that the site has an editorial point of view,
 * cites its sources, and is open about what's hand-curated vs sourced from
 * TMDb. Also includes a simple About link so a working pro can decide whether
 * to trust the data before bookmarking.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-8 text-xs text-zinc-400">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <div className="flex items-center gap-2">
              <CineCanonMark size={24} title="" />
              <p className="font-serif text-sm text-zinc-300">CineCanon</p>
            </div>
            <p className="mt-1 max-w-xs text-zinc-500">
              Cinematic technical reference for working film professionals.
              Hand-curated where it counts; TMDb-sourced metadata for breadth.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-300">Sections</p>
            <Link href="/films?tier=curated" className="hover:text-zinc-300">Curated films</Link>
            <Link href="/films" className="hover:text-zinc-300">All films</Link>
            <Link href="/crew" className="hover:text-zinc-300">Crew</Link>
            <Link href="/gear" className="hover:text-zinc-300">Gear</Link>
            <Link href="/equipment/specs" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ spec browser</Link>
            <Link href="/gear/rentals" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ rental houses</Link>
            <Link href="/vfx" className="hover:text-zinc-300">VFX houses</Link>
            <Link href="/vfx/volumes" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ LED volumes</Link>
            <Link href="/vfx/title-houses" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ title sequence houses</Link>
            <Link href="/stunts" className="hover:text-zinc-300">Stunts</Link>
            <Link href="/sound" className="hover:text-zinc-300">Sound</Link>
            <Link href="/sound/post" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ post sound</Link>
            <Link href="/sound/effects" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ effects & design</Link>
            <Link href="/sound/foley" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ foley</Link>
            <Link href="/sound/adr-studios" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ ADR studios</Link>
            <Link href="/sound/effects/libraries" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ sfx libraries</Link>
            <Link href="/sound/houses" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ sound houses</Link>
            <Link href="/editing" className="hover:text-zinc-300">Editing</Link>
            <Link href="/editing/editors" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ editors</Link>
            <Link href="/music" className="hover:text-zinc-300">Music</Link>
            <Link href="/music/composers" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ composers</Link>
            <Link href="/music/scoring-stages" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ scoring stages</Link>
            <Link href="/music/orchestras" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ orchestras</Link>
            <Link href="/music/supervisors" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ music supervisors</Link>
            <Link href="/production-design" className="hover:text-zinc-300">Production design</Link>
            <Link href="/production-design/designers" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ designers + art dept</Link>
            <Link href="/costume-hair-makeup" className="hover:text-zinc-300">Costume / Hair / Makeup</Link>
            <Link href="/costume-hair-makeup/designers" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ designers + dept heads</Link>
            <Link href="/costume-hair-makeup/effects-houses" className="hover:text-zinc-300 pl-3 text-zinc-500">↳ effects houses</Link>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-300">Cross-cuts</p>
            <Link href="/ask" className="hover:text-zinc-300">Ask anything</Link>
            <Link href="/queries" className="hover:text-zinc-300">Killer queries</Link>
            <Link href="/references" className="hover:text-zinc-300">References graph</Link>
            <Link href="/partnerships" className="hover:text-zinc-300">Creative partnerships</Link>
            <Link href="/decisions" className="hover:text-zinc-300">Craft decisions</Link>
            <Link href="/tools" className="hover:text-zinc-300">Tools (calculators + pickers)</Link>
            <Link href="/editing/walkthroughs" className="hover:text-zinc-300">Edit walkthroughs</Link>
            <Link href="/music/cue-guides" className="hover:text-zinc-300">Cue guides</Link>
            <Link href="/vfx/shot-breakdowns" className="hover:text-zinc-300">VFX shot breakdowns</Link>
            <Link href="/production-design/works" className="hover:text-zinc-300">PD dossiers</Link>
            <Link href="/costume-hair-makeup/costume-works" className="hover:text-zinc-300">Costume dossiers</Link>
            <Link href="/costume-hair-makeup/makeup-works" className="hover:text-zinc-300">MU & hair dossiers</Link>
            <Link href="/awards" className="hover:text-zinc-300">Awards</Link>
            <Link href="/locations" className="hover:text-zinc-300">Locations atlas</Link>
            <Link href="/decades" className="hover:text-zinc-300">By decade</Link>
            <Link href="/format" className="hover:text-zinc-300">By format</Link>
            <Link href="/shots" className="hover:text-zinc-300">Shots (palette)</Link>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-300">For working pros</p>
            <Link href="/tools" className="hover:text-zinc-300">Tools</Link>
            <Link href="/for-dps" className="hover:text-zinc-300">For DPs</Link>
            <Link href="/for-colorists" className="hover:text-zinc-300">For Colorists</Link>
            <Link href="/for-coordinators" className="hover:text-zinc-300">For Stunt Coordinators</Link>
            <Link href="/for-gaffers" className="hover:text-zinc-300">For Gaffers</Link>
            <Link href="/for-sound-mixers" className="hover:text-zinc-300">For Sound Mixers</Link>
            <Link href="/for-sound-designers" className="hover:text-zinc-300">For Sound Designers</Link>
            <Link href="/for-composers" className="hover:text-zinc-300">For Composers</Link>
            <Link href="/for-music-supervisors" className="hover:text-zinc-300">For Music Supervisors</Link>
            <Link href="/for-editors" className="hover:text-zinc-300">For Editors</Link>
            <Link href="/for-production-designers" className="hover:text-zinc-300">For Production Designers</Link>
            <Link href="/for-costume-designers" className="hover:text-zinc-300">For Costume Designers</Link>
            <Link href="/for-makeup-artists" className="hover:text-zinc-300">For Makeup & Hair Artists</Link>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-300">About</p>
            <Link href="/about" className="hover:text-zinc-300">About this site</Link>
            <Link href="/methodology" className="hover:text-zinc-300">Methodology</Link>
            <Link href="/about#sources" className="hover:text-zinc-300">Data sources</Link>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-300">Follow</p>
            <a
              href="/digest.xml"
              className="hover:text-zinc-300"
              title="Atom feed of newly curated productions"
              type="application/atom+xml"
            >
              Weekly digest <span className="text-zinc-500">(Atom)</span>
            </a>
            <Link href="/api/v1" className="hover:text-zinc-300">Public API</Link>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-4 text-[11px] text-zinc-400">
          <p>Movie metadata courtesy of <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200">TMDb</a> — this product uses the TMDb API but is not endorsed or certified by TMDb.</p>
          <p>© {new Date().getFullYear()} CineCanon</p>
        </div>
      </div>
    </footer>
  );
}
