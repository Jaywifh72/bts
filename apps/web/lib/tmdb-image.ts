/**
 * Build full TMDb image CDN URLs from the relative paths we cache in
 * `productions.poster_path`, `productions.backdrop_path`, and
 * `people.profile_path`. Returns null for null input so callers can chain
 * on optional fields without extra null-guards.
 *
 * Image-base hardcoded for simplicity. TMDb publishes /configuration but
 * the base URL has been stable for 10+ years.
 */
const BASE = 'https://image.tmdb.org/t/p/';

export type PosterSize = 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original';

export function posterUrl(path: string | null | undefined, size: PosterSize = 'w342'): string | null {
  if (!path) return null;
  return `${BASE}${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size: BackdropSize = 'w1280'): string | null {
  if (!path) return null;
  return `${BASE}${size}${path}`;
}

export function profileUrl(path: string | null | undefined, size: ProfileSize = 'w185'): string | null {
  if (!path) return null;
  return `${BASE}${size}${path}`;
}
