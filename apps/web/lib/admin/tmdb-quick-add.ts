import 'server-only';
import { db, sql } from '@bts/db';

const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;

export type TmdbMoviePreview = {
  tmdb_id: number;
  imdb_id: string | null;
  title: string;
  original_title: string | null;
  release_date: string | null;
  release_year: number | null;
  runtime: number | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: string[];
  original_language: string | null;
  production_country: string | null;
  popularity: number | null;
  vote_average: number | null;
  vote_count: number | null;
  collection_id: number | null;
  collection_name: string | null;
  /** Already-existing slug if this tmdb_id is already in the database. */
  existing_slug: string | null;
  proposed_slug: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yearOf(date: string | null): number | null {
  if (!date || date.length < 4) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

/**
 * Fetch a movie by TMDb id and return both the metadata + the slug
 * we'd assign on insert. Doesn't write anything — for the preview step.
 */
export async function previewTmdbMovie(tmdbId: number): Promise<TmdbMoviePreview | { error: string }> {
  if (!TOKEN) return { error: 'TMDB_READ_ACCESS_TOKEN is not set on the server.' };
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return { error: 'Invalid TMDb id.' };

  const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (res.status === 404) return { error: `TMDb id ${tmdbId} not found.` };
  if (!res.ok) return { error: `TMDb returned ${res.status} for id ${tmdbId}.` };

  type TmdbResp = {
    id: number;
    imdb_id: string | null;
    title: string;
    original_title: string | null;
    release_date: string | null;
    runtime: number | null;
    overview: string | null;
    poster_path: string | null;
    backdrop_path: string | null;
    genres: { id: number; name: string }[];
    original_language: string | null;
    production_countries: { iso_3166_1: string }[] | null;
    popularity: number | null;
    vote_average: number | null;
    vote_count: number | null;
    belongs_to_collection: { id: number; name: string } | null;
  };
  const movie = (await res.json()) as TmdbResp;

  const year = yearOf(movie.release_date);
  const proposedSlug = year ? `${slugify(movie.title)}-${year}` : slugify(movie.title);

  const [existing] = await db.execute<{ slug: string }>(sql`
    SELECT slug FROM productions WHERE tmdb_id = ${movie.id}
  `);

  return {
    tmdb_id: movie.id,
    imdb_id: movie.imdb_id,
    title: movie.title,
    original_title:
      movie.original_title && movie.original_title !== movie.title ? movie.original_title : null,
    release_date: movie.release_date,
    release_year: year,
    runtime: movie.runtime,
    overview: movie.overview,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    genres: movie.genres?.map((g) => g.name) ?? [],
    original_language: movie.original_language,
    production_country: movie.production_countries?.[0]?.iso_3166_1 ?? null,
    popularity: movie.popularity,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    collection_id: movie.belongs_to_collection?.id ?? null,
    collection_name: movie.belongs_to_collection?.name ?? null,
    existing_slug: existing?.slug ?? null,
    proposed_slug: proposedSlug,
  };
}

/**
 * Upsert a movie from TMDb preview data. Mirrors the upsertMovie
 * logic in @bts/scraper but runs inline so the admin path doesn't
 * need a child-process spawn for a single id.
 *
 * Returns the slug of the upserted production so the caller can
 * navigate to the public film page.
 */
export async function insertTmdbMovie(
  preview: TmdbMoviePreview,
): Promise<{ slug: string; outcome: 'inserted' | 'updated' }> {
  let slug = preview.proposed_slug;

  // Slug collision with a different tmdb_id → suffix with imdb tail.
  const [collision] = await db.execute<{ id: number; tmdb_id: number | null }>(sql`
    SELECT id, tmdb_id FROM productions WHERE slug = ${slug}
  `);
  if (collision && collision.tmdb_id !== preview.tmdb_id) {
    const tail = preview.imdb_id ? preview.imdb_id.slice(-4) : String(preview.tmdb_id).slice(-4);
    slug = `${slug}-${tail}`;
  }

  const genresLiteral =
    preview.genres.length > 0
      ? `{${preview.genres.map((g) => `"${g.replace(/"/g, '\\"')}"`).join(',')}}`
      : null;

  const result = await db.execute<{ slug: string; created: boolean }>(sql`
    INSERT INTO productions
      (slug, type, title, original_title, release_year, runtime_minutes, synopsis,
       tmdb_id, imdb_id,
       genres, original_language, production_country, popularity, vote_average, vote_count,
       poster_path, backdrop_path, tmdb_collection_id, tmdb_collection_name)
    VALUES
      (${slug}, 'feature',
       ${preview.title},
       ${preview.original_title},
       ${preview.release_year},
       ${preview.runtime},
       ${preview.overview},
       ${preview.tmdb_id},
       ${preview.imdb_id},
       ${genresLiteral}::text[],
       ${preview.original_language},
       ${preview.production_country},
       ${preview.popularity},
       ${preview.vote_average},
       ${preview.vote_count},
       ${preview.poster_path},
       ${preview.backdrop_path},
       ${preview.collection_id},
       ${preview.collection_name})
    ON CONFLICT (tmdb_id) DO UPDATE SET
      title = EXCLUDED.title,
      original_title = EXCLUDED.original_title,
      release_year = COALESCE(EXCLUDED.release_year, productions.release_year),
      runtime_minutes = COALESCE(EXCLUDED.runtime_minutes, productions.runtime_minutes),
      synopsis = COALESCE(EXCLUDED.synopsis, productions.synopsis),
      imdb_id = COALESCE(EXCLUDED.imdb_id, productions.imdb_id),
      genres = EXCLUDED.genres,
      original_language = EXCLUDED.original_language,
      production_country = EXCLUDED.production_country,
      popularity = EXCLUDED.popularity,
      vote_average = EXCLUDED.vote_average,
      vote_count = EXCLUDED.vote_count,
      poster_path = EXCLUDED.poster_path,
      backdrop_path = EXCLUDED.backdrop_path,
      tmdb_collection_id = EXCLUDED.tmdb_collection_id,
      tmdb_collection_name = EXCLUDED.tmdb_collection_name,
      updated_at = NOW()
    RETURNING slug, (xmax = 0) AS created
  `);

  const row = result[0]!;
  return { slug: row.slug, outcome: row.created ? 'inserted' : 'updated' };
}
