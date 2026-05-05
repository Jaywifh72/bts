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

export type TmdbGenre = { id: number; name: string };
export type TmdbCollection = {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
};
export type TmdbProductionCompany = {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
};
export type TmdbProductionCountry = { iso_3166_1: string; name: string };
export type TmdbSpokenLanguage = { iso_639_1: string; name: string; english_name?: string };

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
  popularity?: number;
  original_language?: string | null;
  genres?: TmdbGenre[];
  belongs_to_collection?: TmdbCollection | null;
  production_companies?: TmdbProductionCompany[];
  production_countries?: TmdbProductionCountry[];
  spoken_languages?: TmdbSpokenLanguage[];
};

export type TmdbCrewMember = {
  id: number;
  name: string;
  job: string;
  department: string;
  credit_id: string;
  profile_path: string | null;
};

export type TmdbCastMember = {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
};

export type TmdbCredits = {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
};

export type ImageSize = 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original';

let _inflight = 0;
let _lastStartedAt = 0;
const _waitQueue: Array<() => void> = [];

async function acquire(): Promise<void> {
  while (_inflight >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => _waitQueue.push(resolve));
  }
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
 * Fetches a single movie with external_ids appended in one call so we get
 * imdb_id without a second round trip. Returns null when token is unset or
 * the id is unknown. The full TMDb response is returned (including genres,
 * collection, production_companies/countries/languages, popularity).
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
    imdb_id: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    vote_count: raw.vote_count,
    vote_average: raw.vote_average,
    popularity: raw.popularity,
    original_language: raw.original_language ?? null,
    genres: raw.genres ?? [],
    belongs_to_collection: raw.belongs_to_collection ?? null,
    production_companies: raw.production_companies ?? [],
    production_countries: raw.production_countries ?? [],
    spoken_languages: raw.spoken_languages ?? [],
  };
}

/**
 * Fetches cast + crew for a movie. We only consume crew today (cast support
 * isn't in our schema yet) but return both so future callers can use it.
 */
export async function fetchMovieCredits(id: number): Promise<TmdbCredits | null> {
  return tmdbFetch<TmdbCredits>(`/movie/${id}/credits`);
}

/**
 * Fetches the images endpoint. Filters backdrops by aspect ratio so we don't
 * end up with portrait poster art in the "backdrops" array (a TMDb quirk on
 * older films like The Godfather).
 */
export async function fetchMovieImages(
  id: number,
): Promise<{ poster: string | null; backdrops: string[] } | null> {
  type ImagesResponse = {
    backdrops: { file_path: string; aspect_ratio: number }[];
    posters: { file_path: string }[];
  };
  const raw = await tmdbFetch<ImagesResponse>(`/movie/${id}/images`);
  if (!raw) return null;
  const landscapeBackdrops = raw.backdrops
    .filter((b) => b.aspect_ratio >= 1.6) // Discard square / portrait "backdrops"
    .slice(0, 8);
  return {
    poster: imageUrl(raw.posters[0]?.file_path ?? null, 'w342'),
    backdrops: landscapeBackdrops.flatMap((b) => {
      const url = imageUrl(b.file_path, 'w1280');
      return url ? [url] : [];
    }),
  };
}

export type DiscoverOptions = {
  page: number;
  minVoteCount?: number;
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

export function imageUrl(path: string | null, size: ImageSize): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}${size}${path}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Person endpoints (T3-1, T2-5)
// ─────────────────────────────────────────────────────────────────────────────

export type TmdbPerson = {
  id: number;
  name: string;
  biography: string | null;
  birthday: string | null;          // 'YYYY-MM-DD'
  deathday: string | null;
  place_of_birth: string | null;
  also_known_as: string[];
  imdb_id: string | null;
  /** Wikidata Q-number, e.g. "Q7325". Often null. */
  wikidata_id?: string | null;
  profile_path: string | null;
  known_for_department: string | null;
};

/**
 * Fetches /person/{id} with external_ids appended so we get imdb_id and
 * (when available) wikidata_id without a second round trip. Returns null
 * for unknown ids or when the API token is unset.
 */
export async function fetchPerson(id: number): Promise<TmdbPerson | null> {
  type Resp = TmdbPerson & {
    external_ids?: { imdb_id: string | null; wikidata_id: string | null };
  };
  const raw = await tmdbFetch<Resp>(`/person/${id}?append_to_response=external_ids`);
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    biography: raw.biography ?? null,
    birthday: raw.birthday ?? null,
    deathday: raw.deathday ?? null,
    place_of_birth: raw.place_of_birth ?? null,
    also_known_as: raw.also_known_as ?? [],
    imdb_id: raw.imdb_id ?? raw.external_ids?.imdb_id ?? null,
    wikidata_id: raw.external_ids?.wikidata_id ?? null,
    profile_path: raw.profile_path ?? null,
    known_for_department: raw.known_for_department ?? null,
  };
}
