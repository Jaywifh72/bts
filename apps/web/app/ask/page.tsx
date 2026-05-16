import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db, searchProductionsCombined } from '@bts/db';
import { extractFilters, MissingApiKeyError, type SearchFilters } from '@/lib/nl-extract';
import { posterUrl } from '@/lib/tmdb-image';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PageHero } from '@/components/ui/PageHero';

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

type Props = { searchParams: Promise<{ q?: string; omit?: string }> };

type FilterKey = 'director' | 'dp' | 'year' | 'aspect_ratio' | 'format_keyword' | 'themes';

function parseOmit(raw: string | undefined): Set<FilterKey> {
  if (!raw) return new Set();
  const allowed = new Set<FilterKey>(['director', 'dp', 'year', 'aspect_ratio', 'format_keyword', 'themes']);
  return new Set(
    raw.split(',').map((s) => s.trim()).filter((s): s is FilterKey => allowed.has(s as FilterKey)),
  );
}

function buildOmitHref(q: string, omit: Set<FilterKey>, add: FilterKey): string {
  const next = new Set(omit);
  next.add(add);
  const omitParam = [...next].join(',');
  return `/ask?q=${encodeURIComponent(q)}${omitParam ? `&omit=${omitParam}` : ''}`;
}

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
  const omit = parseOmit(searchParams.omit);
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
        // UX-audit E3: honor `omit=` so the user can refine the interpreted
        // filter set without rewriting their natural-language query.
        if (omit.has('director'))       filters = { ...filters, director: null };
        if (omit.has('dp'))             filters = { ...filters, dp: null };
        if (omit.has('year'))           filters = { ...filters, year_min: null, year_max: null };
        if (omit.has('aspect_ratio'))   filters = { ...filters, aspect_ratio: null };
        if (omit.has('format_keyword')) filters = { ...filters, format_keyword: null };
        if (omit.has('themes'))         filters = { ...filters, themes: '' };
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
      <PageHero
        eyebrow="Search"
        title="Ask anything"
        description={
          <>
            Natural-language query. GPT-4o-mini extracts structural filters
            (director, DP, year, aspect ratio, format), then{' '}
            <code className="text-zinc-300">text-embedding-3-small</code> ranks the
            filtered set by tonal similarity to your query.
          </>
        }
      />

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
        <div className="mb-4 rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-300">
            Interpreted as
            <span className="ml-2 text-[10px] normal-case tracking-normal text-zinc-400">
              (click × to drop a filter and re-query)
            </span>
          </p>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {filters.director && (
              <FilterChip
                label="Director"
                value={filters.director}
                href={buildOmitHref(query, omit, 'director')}
              />
            )}
            {filters.dp && (
              <FilterChip
                label="DP"
                value={filters.dp}
                href={buildOmitHref(query, omit, 'dp')}
              />
            )}
            {(filters.year_min || filters.year_max) && (
              <FilterChip
                label="Year"
                value={`${filters.year_min ?? '–'} → ${filters.year_max ?? '–'}`}
                href={buildOmitHref(query, omit, 'year')}
              />
            )}
            {filters.aspect_ratio && (
              <FilterChip
                label="Aspect"
                value={filters.aspect_ratio}
                href={buildOmitHref(query, omit, 'aspect_ratio')}
              />
            )}
            {filters.format_keyword && (
              <FilterChip
                label="Format"
                value={filters.format_keyword}
                href={buildOmitHref(query, omit, 'format_keyword')}
              />
            )}
            {filters.themes && (
              <FilterChip
                label="Themes"
                value={filters.themes}
                href={buildOmitHref(query, omit, 'themes')}
                italic
              />
            )}
          </ul>
          {omit.size > 0 && (
            <p className="mt-2 text-[10px] text-zinc-400">
              <Link href={`/ask?q=${encodeURIComponent(query)}`} className="text-amber-400 hover:underline">
                Restore all filters →
              </Link>
            </p>
          )}
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
                    <p className="mt-1 text-xs text-zinc-400">
                      {r.release_year ?? '—'}
                      {r.similarity != null && (
                        <span className="ml-1 font-mono text-zinc-500">
                          · {(r.similarity * 100).toFixed(0)}%
                        </span>
                      )}
                    </p>
                    <p className="mt-1">
                      {r.data_tier === 'curated' ? (
                        <span className="rounded border border-amber-700/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-400">
                          curated
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400">imported</span>
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
        <div className="mt-4 rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-400">
          <p>No films match these filters in the curated set.</p>
          <p className="mt-3 text-sm">
            For an exact-title lookup, try{' '}
            <a
              href={`/search?q=${encodeURIComponent(query)}`}
              className="text-amber-400 hover:underline"
            >
              /search with this same query <span aria-hidden="true">→</span>
            </a>
          </p>
        </div>
      )}
    </article>
  );
}

function FilterChip({
  label,
  value,
  href,
  italic = false,
}: {
  label: string;
  value: string;
  href: string;
  italic?: boolean;
}) {
  return (
    <li className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-400">{label}:</span>
      <span className={italic ? 'italic text-zinc-300' : 'text-zinc-200'}>{value}</span>
      <Link
        href={href}
        aria-label={`Drop ${label} filter and re-query`}
        className="ml-1 text-zinc-400 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 focus:ring-offset-zinc-950 rounded"
      >
        <span aria-hidden="true">×</span>
      </Link>
    </li>
  );
}
