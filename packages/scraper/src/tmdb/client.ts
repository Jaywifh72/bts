import 'dotenv/config';

/**
 * Minimal typed TMDb v4 API client.
 *
 * Uses Bearer-token auth (the modern preferred way; v3 query-param API key
 * is the alternative). Returns `null` from `fetchMovie` when the token is
 * unset so non-prod environments degrade gracefully — mirrors how the
 * YouTube and Vimeo discovery clients behave.
 *
 * Throttling: a soft 5-concurrent + 100ms-min-spacing semaphore. TMDb
 * advertises ~50 req/sec on read endpoints; this is well below.
 */

const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
const MIN_SPACING_MS = 100;
const MAX_CONCURRENT = 5;

export type TmdbMovie = {
  id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  /** 'YYYY-MM-DD' or '' */
  release_date: string | null;
  /** minutes */
  runtime: number | null;
  /** Relative path like '/abc.jpg'; pass through `imageUrl()` for a full URL. */
  poster_path: string | null;
  backdrop_path: string | null;
  imdb_id: string | null;
  vote_count?: number;
  vote_average?: number;
};

export type ImageSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original';

let _inflight = 0;
let _lastStartedAt = 0;
const _waitQueue: Array<() => void> = [];

async function acquire(): Promise<void> {
  // Concurrency gate
  while (_inflight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => _waitQueue.push(resolve));
  }
  // Spacing gate
  const now = Date.now();
  const elapsed = now - _lastStartedAt;
  if (elapsed < MIN_SPACING_MS) {
    _lastStartedAt = now + (MIN_SPACING_MS - elapsed);
    await new Promise((r) => setTimeout(r, MIN_SPACING_MS - elapsed));
  } else {
    _lastStartedAt = now;
  }
  _inflight++;
}

function release() {
  _inflight--;
  const next = _waitQueue.shift();
  if (next) next();
}

async function tmdbFetch<T>(path: string): Promise<T | null> {
  if (!TOKEN) return null;
  await acquire();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`TMDb ${res.status}: ${path}`);
    }
    return (await res.json()) as T;
  } finally {
    release();
  }
}

/**
 * Fetches a single movie by TMDb id with imdb_id appended in one call.
 * Returns null if the token is unset or the id is unknown.
 */
export async function fetchMovie(id: number): Promise<TmdbMovie | null> {
  type WithExternals = TmdbMovie & {
    external_ids?: { imdb_id: string | null };
  };
  const raw = await tmdbFetch<WithExternals>(`/movie/${id}?append_to_response=external_ids`);
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title,
    original_title: raw.original_title ?? null,
    overview: raw.overview ?? null,
    release_date: raw.release_date ?? null,
    runtime: raw.runtime ?? null,
    poster_path: raw.poster_path ?? null,
    backdrop_path: raw.backdrop_path ?? null,
    // imdb_id can come from either the top-level (some endpoints) or external_ids
    imdb_id: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    vote_count: raw.vote_count,
    vote_average: raw.vote_average,
  };
}

/**
 * Fetches the images endpoint for a movie. Returns full image URLs at the
 * standard sizes used across the app — w342 posters and w1280 backdrops.
 */
export async function fetchMovieImages(
  id: number,
): Promise<{ poster: string | null; backdrops: string[] } | null> {
  type ImagesResponse = {
    backdrops: { file_path: string }[];
    posters: { file_path: string }[];
  };
  const raw = await tmdbFetch<ImagesResponse>(`/movie/${id}/images`);
  if (!raw) return null;
  return {
    poster: imageUrl(raw.posters[0]?.file_path ?? null, 'w342'),
    backdrops: raw.backdrops.slice(0, 8).flatMap((b) => {
      const url = imageUrl(b.file_path, 'w1280');
      return url ? [url] : [];
    }),
  };
}

export type DiscoverOptions = {
  page: number;
  /** Minimum vote count gate to discard obscure or low-confidence rows. */
  minVoteCount?: number;
  /** TMDb sort key, e.g. 'vote_average.desc', 'popularity.desc'. */
  sortBy?: string;
};

export async function discoverMovies(
  opts: DiscoverOptions,
): Promise<{ results: TmdbMovie[]; total_pages: number; total_results: number }> {
  type DiscoverResponse = {
    page: number;
    results: TmdbMovie[];
    total_pages: number;
    total_results: number;
  };
  const params = new URLSearchParams({
    page: String(opts.page),
    'vote_count.gte': String(opts.minVoteCount ?? 200),
    sort_by: opts.sortBy ?? 'vote_average.desc',
    include_adult: 'false',
    language: 'en-US',
  });
  const raw = await tmdbFetch<DiscoverResponse>(`/discover/movie?${params.toString()}`);
  if (!raw) return { results: [], total_pages: 0, total_results: 0 };
  return {
    results: raw.results,
    total_pages: raw.total_pages,
    total_results: raw.total_results,
  };
}

/**
 * Builds a full CDN URL from a relative path returned by TMDb. Returns null
 * for null input so callers can chain it on optional fields.
 *
 * Image-base hardcoded for simplicity. TMDb publishes a /configuration endpoint
 * but the base URL has been stable for 10+ years.
 */
export function imageUrl(path: string | null, size: ImageSize): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}${size}${path}`;
}
