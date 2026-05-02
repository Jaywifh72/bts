/**
 * TMDb media fetcher — stub implementation.
 *
 * The full TMDb integration is recommendation #3 in the roadmap. For now this
 * returns null so existing pages that depend on it compile and render, just
 * without TMDb-sourced posters and backdrops.
 */

export type TmdbMedia = {
  poster: string | null;
  backdrops: string[];
};

export async function fetchTmdbMedia(_tmdbId: number | null): Promise<TmdbMedia | null> {
  // TODO: Implement when TMDb API key is wired up (recommendation #3).
  return null;
}
