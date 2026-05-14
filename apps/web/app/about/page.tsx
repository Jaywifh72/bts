import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'How CineCanon sources its data, what is hand-curated, what comes from TMDb, and how to read the technical metadata.',
};

export default function AboutPage() {
  return (
    <article className="prose-zinc max-w-2xl">
      <p className="text-xs uppercase tracking-widest text-zinc-500">About</p>
      <h1 className="mt-1 font-serif text-4xl text-zinc-50">CineCanon</h1>
      <p className="mt-4 text-zinc-300">
        CineCanon is a technical reference for working film professionals — DPs, gaffers,
        ACs, colorists, and VFX supervisors — who arrive knowing a production title, a person&apos;s
        name, or a piece of gear, and expect to find dense, cited, accurate data immediately.
      </p>

      <h2 id="sources" className="mt-10 font-serif text-2xl text-zinc-100">Data sources</h2>
      <p className="mt-3 text-zinc-300">
        The site combines two tiers of data:
      </p>
      <ul className="mt-3 space-y-3 text-zinc-300">
        <li>
          <strong className="text-amber-400">Curated.</strong> A hand-seeded set of films
          with full crew, scene-level equipment loadouts, primary-source citations, and
          format breakdowns. These are the productions where CineCanon adds value
          beyond what you can find elsewhere. They&apos;re marked with a{' '}
          <span className="rounded bg-amber-900/50 px-1 py-px text-[9px] text-amber-300 align-middle">CURATED</span>{' '}
          badge throughout the site.
        </li>
        <li>
          <strong className="text-zinc-100">Imported metadata.</strong> Title, year,
          synopsis, poster, backdrop, genres, country, language, director, key crew, and
          collection / franchise membership are imported from{' '}
          <a href="https://www.themoviedb.org/" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">TMDb</a>{' '}
          for breadth. Productions in this tier show a{' '}
          <span className="rounded bg-zinc-800 px-1 py-px text-[10px] uppercase tracking-wide text-zinc-300 align-middle">metadata only</span>{' '}
          disclosure on their detail page.
        </li>
      </ul>

      <h2 id="methodology" className="mt-10 font-serif text-2xl text-zinc-100">Methodology</h2>
      <p className="mt-3 text-zinc-300">
        For curated films, every claim about gear or crew is anchored to a primary source:
        ASC Magazine, ICG Magazine, the cinematographer&apos;s own interview, the official
        EPK, or the rental house&apos;s shot list. Each claim has a confidence rating
        (<em>primary</em>, <em>secondary</em>, <em>manufacturer marketing</em>,
        or <em>speculative</em>) so you can decide what to trust.
      </p>
      <p className="mt-3 text-zinc-300">
        Behind-the-scenes videos surfaced on production pages are discovered automatically
        from YouTube and Vimeo, then reviewed by an editor before publication. Every
        published video has been seen by a human and assigned a category (VFX breakdown,
        making of, DP interview, and so on).
      </p>

      <h2 id="sub-projects" className="mt-10 font-serif text-2xl text-zinc-100">What&apos;s shipped, what&apos;s next</h2>
      <p className="mt-3 text-zinc-300">
        CineCanon is built incrementally as a series of focused sub-projects: the data
        layer, the public web app, search, video discovery, cross-references, an admin
        review UI, and richer entity ingestion. The roadmap is open and accepts contributions.
      </p>

      <p className="mt-10 text-sm text-zinc-500">
        Looking for a specific film, person, or piece of gear?{' '}
        <Link href="/" className="text-amber-400 hover:underline">Start with the search bar</Link>.
      </p>
    </article>
  );
}
