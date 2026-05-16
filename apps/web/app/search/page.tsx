import type { Metadata } from 'next';
import { db, search } from '@bts/db';
import { ResultsByCategory } from '@/components/search/ResultsByCategory';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Search',
  // Search-result pages don't add long-term value to the index — keep
  // crawlers focused on entity pages.
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

// Curated suggestions hit interesting cross-cuts in the data: a hand-curated
// film, a working DP, a flagship camera, a major studio, a famous lens line.
const SUGGESTIONS = ['Dune', 'Greig Fraser', 'ALEXA 65', 'A24', 'Cooke S4 i'];

export default async function SearchPage(props: Props) {
  const searchParams = await props.searchParams;
  const q = (searchParams.q ?? '').trim();
  const results = q.length > 0 ? await search(db, q) : [];
  const isEmpty = q.length === 0;
  const noMatches = !isEmpty && results.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHero
        eyebrow="Search"
        title={isEmpty ? 'Search' : `Results for "${q}"`}
        description={
          !isEmpty
            ? results.length === 0
              ? 'No matches.'
              : `${results.length} match${results.length === 1 ? '' : 'es'} across films, crew, gear, scenes, videos, and VFX houses.`
            : undefined
        }
      />

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
          <p className="mt-5 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Or ask a question in natural language —{' '}
            <a
              href="/ask?q=Lubezki+anamorphic+at+golden+hour+before+2015"
              className="text-amber-400 hover:underline"
            >
              try /ask
            </a>{' '}with prompts like
            &ldquo;Lubezki anamorphic at golden hour before 2015&rdquo; or
            &ldquo;magic-hour exterior lighting 2023.&rdquo;
          </p>
        </div>
      )}

      {noMatches && (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          <p>
            No films, crew, gear, scenes, videos, or VFX houses matched{' '}
            <span className="text-zinc-200">&ldquo;{q}&rdquo;</span>. Lexical
            search catches small typos but not paraphrases or descriptions.
          </p>
          <p className="mt-3">
            For descriptive queries (&ldquo;films with single-take long
            sequences,&rdquo; &ldquo;magic-hour exteriors with practical lighting only&rdquo;),
            try{' '}
            <a
              href={`/ask?q=${encodeURIComponent(q)}`}
              className="text-amber-400 hover:underline"
            >
              /ask with this same query →
            </a>
          </p>
        </div>
      )}

      {results.length > 0 && <ResultsByCategory results={results} />}

      {/* UX-audit E6: thin-result handoff to /ask. When lexical search matches
          only 1–2 rows, the descriptive-query path (embeddings) is often what
          the user actually wanted — surface it explicitly instead of forcing
          them to scroll past the meagre list and notice on their own. */}
      {results.length > 0 && results.length <= 2 && (
        <div className="mt-6 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
          Only {results.length} lexical match{results.length === 1 ? '' : 'es'}. For paraphrases
          and descriptive queries, try{' '}
          <a
            href={`/ask?q=${encodeURIComponent(q)}`}
            className="text-amber-400 hover:underline"
          >
            /ask with this same query <span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </div>
  );
}
