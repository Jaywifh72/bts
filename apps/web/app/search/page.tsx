import type { Metadata } from 'next';
import { db, search } from '@bts/db';
import { ResultsByCategory } from '@/components/search/ResultsByCategory';

export const metadata: Metadata = {
  title: 'Search',
  // Search-result pages don't add long-term value to the index — keep
  // crawlers focused on entity pages.
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: { q?: string };
};

// Curated suggestions hit interesting cross-cuts in the data: a hand-curated
// film, a working DP, a flagship camera, a major studio, a famous lens line.
const SUGGESTIONS = ['Dune', 'Greig Fraser', 'ALEXA 65', 'A24', 'Cooke S4 i'];

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim();
  const results = q.length > 0 ? await search(db, q) : [];
  const isEmpty = q.length === 0;
  const noMatches = !isEmpty && results.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-zinc-100">
          {isEmpty ? 'Search' : `Results for "${q}"`}
        </h1>
        {!isEmpty && (
          <p className="mt-1 text-sm text-zinc-500">
            {results.length === 0
              ? 'No matches.'
              : `${results.length} match${results.length === 1 ? '' : 'es'} across films, crew, gear, scenes, videos, and VFX houses.`}
          </p>
        )}
      </header>

      {isEmpty && (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="mb-3 text-sm text-zinc-400">
            Search across films, crew, gear, and VFX houses. Try:
          </p>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <a
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="rounded border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm text-zinc-300 hover:border-amber-500 hover:text-amber-400"
                >
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {noMatches && (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No films, crew, gear, scenes, videos, or VFX houses matched <span className="text-zinc-200">"{q}"</span>.
          Try a shorter or different spelling — fuzzy match catches small typos
          but not entirely different terms.
        </div>
      )}

      {results.length > 0 && <ResultsByCategory results={results} />}
    </div>
  );
}
