import { unstable_cache } from 'next/cache';

/**
 * TMDb media fetcher for the web app.
 *
 * Fetches poster + backdrops from TMDb's /movie/{id}/images endpoint and
 * caches the result for 24 hours per tmdb_id via Next.js's data cache. The
 * actual image bytes are served from TMDb's CDN with their own caching, so
 * we only cache the thin URL list.
 *
 * Returns null when:
 *   - TMDB_READ_ACCESS_TOKEN is unset (graceful local-dev fallback)
 *   - tmdbId is null/undefined (production has no TMDb mapping)
 *   - the TMDb id is unknown (404)
 */

const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w342';
const BACKDROP_SIZE = 'w1280';
const MAX_BACKDROPS = 8;

export type TmdbMedia = {
  poster: string | null;
  backdrops: string[];
};

async function fetchImagesUncached(tmdbId: number): Promise<TmdbMedia | null> {
  if (!TOKEN) return null;

  type Resp = {
    posters: { file_path: string }[];
    backdrops: { file_path: string }[];
  };

  const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    // Don't throw — image-fetch failure should degrade silently, not break
    // the whole page render.
    console.warn(`TMDb images ${res.status} for tmdb_id=${tmdbId}`);
    return null;
  }

  const data = (await res.json()) as Resp;
  return {
    poster: data.posters[0]?.file_path
      ? `${IMAGE_BASE}${POSTER_SIZE}${data.posters[0].file_path}`
      : null,
    backdrops: data.backdrops
      .slice(0, MAX_BACKDROPS)
      .map((b) => `${IMAGE_BASE}${BACKDROP_SIZE}${b.file_path}`),
  };
}

const fetchImagesCached = unstable_cache(fetchImagesUncached, ['tmdb-images'], {
  revalidate: 86400, // 24 hours — TMDb image sets change rarely
  tags: ['tmdb'],
});

export async function fetchTmdbMedia(tmdbId: number | null | undefined): Promise<TmdbMedia | null> {
  if (tmdbId == null) return null;
  return fetchImagesCached(tmdbId);
}
