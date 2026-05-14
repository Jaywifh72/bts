import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db, searchProductionsCombined } from '@bts/db';
import { extractFilters, MissingApiKeyError, type SearchFilters } from '@/lib/nl-extract';
import { posterUrl } from '@/lib/tmdb-image';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'Ask anything',
  description:
    'Natural-language search over CineCanon\'s curated cinematography database. Ask questions like "Roger Deakins shot in 2.39:1 anamorphic before 2010" and get filtered, semantically-ranked results.',
};

const EMBED_ENDPOINT = 'https://api.openai.com/v1/embeddings';

async function embedThemes(text: string, key: string): Promise<number[] | null> {
  if (!text.trim()) return null;
  const res = await fetch(EMBED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text, encoding_format: 'float' }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0]?.embedding ?? null;
}

type Props = { searchParams: Promise<{ q?: string }> };

const EXAMPLES = [
  'Films Roger Deakins shot in 2.39:1 anamorphic',
  'IMAX 65mm before 2020',
  'Magic-hour-heavy cinematography in the 2010s',
  'Christopher Nolan films shot on 65mm',
  'Dystopian sci-fi with practical effects',
];

export default async function AskPage(props: Props) {
  const searchParams = await props.searchParams;
  const query = searchParams.q?.trim() ?? '';
  const key = process.env.OPENAI_API_KEY;

  let filters: SearchFilters | null = null;
  let results: Awaited<ReturnType<typeof searchProductionsCombined>> = [];
  let errorMsg: string | null = null;

  if (query) {
    if (!key) {
      errorMsg = 'OPENAI_API_KEY not set on the server.';
    } else {
      try {
        filters = await extractFilters(query);
        let queryEmbedding: number[] | null = null;
        if (filters.themes.trim()) {
          queryEmbedding = await embedThemes(filters.themes, key);
        }
        results = await searchProductionsCombined(db, filters, queryEmbedding, filters.limit);
      } catch (e) {
        errorMsg =
          e instanceof MissingApiKeyError
            ? 'OpenAI key not set.'
            : e instanceof Error
              ? e.message
              : String(e);
      }
    }
  }

  return (
    <article>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Search</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Ask anything</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Natural-language query. GPT-4o-mini extracts structural filters
          (director, DP, year, aspect ratio, format), then{' '}
          <code className="text-zinc-300">text-embedding-3-small</code> ranks the
          filtered set by tonal similarity to your query.
        </p>
      </header>

      <form method="get" className="mb-4 flex flex-wrap gap-2" role="search" aria-label="Natural language search">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder='e.g. "Roger Deakins in 2.39:1 anamorphic before 2010"'
          autoFocus={!query}
          maxLength={500}
          className="flex-1 min-w-0 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500"
        >
          Search
        </button>
      </form>

      {!query && (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Try one of these</p>
          <ul className="space-y-1 text-sm">
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <Link
                  href={`/ask?q=${encodeURIComponent(ex)}`}
                  className="text-zinc-300 hover:text-amber-400"
                >
                  &rarr; {ex}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorMsg && (
        <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {filters && !errorMsg && (
        <div className="mb-4 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs">
          <p className="mb-1 uppercase tracking-wide text-zinc-500">Interpreted as</p>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-zinc-400">
            {filters.director && (<><dt className="text-zinc-500">Director</dt><dd>{filters.director}</dd></>)}
            {filters.dp && (<><dt className="text-zinc-500">DP</dt><dd>{filters.dp}</dd></>)}
            {(filters.year_min || filters.year_max) && (
              <>
                <dt className="text-zinc-500">Year</dt>
                <dd>{filters.year_min ?? '–'} → {filters.year_max ?? '–'}</dd>
              </>
            )}
            {filters.aspect_ratio && (<><dt className="text-zinc-500">Aspect</dt><dd>{filters.aspect_ratio}</dd></>)}
            {filters.format_keyword && (<><dt className="text-zinc-500">Format</dt><dd>{filters.format_keyword}</dd></>)}
            {filters.themes && (<><dt className="text-zinc-500">Themes</dt><dd className="italic">{filters.themes}</dd></>)}
          </dl>
        </div>
      )}

      {query && !errorMsg && (
        <SectionHeader
          label="Results"
          heading={`${results.length} ${results.length === 1 ? 'film' : 'films'}`}
        />
      )}

      {results.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((r) => {
            const poster = posterUrl(r.poster_path, 'w342');
            return (
              <li key={r.slug}>
                <Link
                  href={`/films/${r.slug}`}
                  className="group block overflow-hidden rounded border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600"
                >
                  <div className="relative aspect-[2/3] bg-zinc-950">
                    {poster && (
                      <Image
                        src={poster}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 25vw, 50vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="border-t border-zinc-800 p-3">
                    <h2 className="line-clamp-2 text-sm font-medium text-zinc-100 group-hover:text-amber-400">
                      {r.title}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {r.release_year ?? '—'}
                      {r.similarity != null && (
                        <span className="ml-1 font-mono text-zinc-600">
                          · {(r.similarity * 100).toFixed(0)}%
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {query && !errorMsg && results.length === 0 && (
        <div className="mt-4 rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No films match these filters in the curated set.
        </div>
      )}
    </article>
  );
}
