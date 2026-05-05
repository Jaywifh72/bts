import 'dotenv/config';
import { db, sql } from '@bts/db';
import { discoverMovies, fetchMovie, type TmdbMovie } from './client.ts';

/**
 * Bulk-import top-rated movies from TMDb into the productions table.
 *
 * Idempotent: rerunning upserts on the unique tmdb_id constraint, refreshing
 * mutable fields (title, synopsis, runtime, imdb_id) without touching the
 * stable slug or type.
 */

export type ImportOptions = {
  /** How many movies to ingest. Default 500. */
  limit?: number;
  /** Vote-count gate to discard obscure films. Default 200. */
  minVoteCount?: number;
  /** Page to start from. Default 1. */
  startPage?: number;
};

export type ImportStats = {
  attempted: number;
  inserted: number;
  updated: number;
  skipped: number;
};

/**
 * Slugify a string into the project's URL-safe convention. Lower, ASCII-only,
 * dashes for spaces, deduped dashes.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[''`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSlug(movie: TmdbMovie, year: number | null): string {
  const titlePart = slugify(movie.title);
  return year ? `${titlePart}-${year}` : titlePart;
}

function yearFromDate(date: string | null): number | null {
  if (!date || date.length < 4) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

async function upsertMovie(movie: TmdbMovie): Promise<'inserted' | 'updated' | 'skipped'> {
  const year = yearFromDate(movie.release_date);
  let slug = buildSlug(movie, year);

  // On slug collision with a DIFFERENT tmdb_id, suffix with the imdb_id tail.
  // We check separately because the unique constraint is on slug; a conflict
  // with the same tmdb_id is fine (it's our own row), but a conflict with a
  // different tmdb_id would mean two films share a title+year (rare but real,
  // e.g. remakes).
  const [existing] = await db.execute<{ id: number; tmdb_id: number | null }>(sql`
    SELECT id, tmdb_id FROM productions WHERE slug = ${slug}
  `);
  if (existing && existing.tmdb_id !== movie.id) {
    const tail = movie.imdb_id ? movie.imdb_id.slice(-4) : String(movie.id).slice(-4);
    slug = `${slug}-${tail}`;
  }

  // Derive the new TMDb-sourced fields. Genres reduced to a Postgres text
  // array literal — postgres-js's automatic array binding has corner cases
  // around single-element arrays so we hand-format to be safe.
  const genres = movie.genres?.map((g) => g.name) ?? [];
  const genresLiteral =
    genres.length > 0
      ? `{${genres.map((g) => `"${g.replace(/"/g, '\\"')}"`).join(',')}}`
      : null;
  const productionCountry =
    movie.production_countries && movie.production_countries.length > 0
      ? movie.production_countries[0]!.iso_3166_1
      : null;
  const collectionId = movie.belongs_to_collection?.id ?? null;
  const collectionName = movie.belongs_to_collection?.name ?? null;

  // Single-statement upsert keyed on tmdb_id. Slug collisions across distinct
  // tmdb_ids are pre-resolved above. data_tier is intentionally NOT touched
  // by this import — UPDATE preserves curated tier on existing rows; new rows
  // default to 'imported' per the schema default.
  const result = await db.execute<{ created: boolean }>(sql`
    INSERT INTO productions
      (slug, type, title, original_title, release_year, runtime_minutes, synopsis,
       tmdb_id, imdb_id,
       genres, original_language, production_country, popularity, vote_average, vote_count,
       poster_path, backdrop_path, tmdb_collection_id, tmdb_collection_name)
    VALUES
      (${slug}, 'feature',
       ${movie.title},
       ${movie.original_title && movie.original_title !== movie.title ? movie.original_title : null},
       ${year},
       ${movie.runtime},
       ${movie.overview},
       ${movie.id},
       ${movie.imdb_id},
       ${genresLiteral}::text[],
       ${movie.original_language},
       ${productionCountry},
       ${movie.popularity ?? null},
       ${movie.vote_average ?? null},
       ${movie.vote_count ?? null},
       ${movie.poster_path},
       ${movie.backdrop_path},
       ${collectionId},
       ${collectionName})
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
    RETURNING (xmax = 0) AS created
  `);

  if (!result[0]) return 'skipped';
  return result[0].created ? 'inserted' : 'updated';
}

/**
 * Levenshtein-style similarity ratio in [0, 1]. Used by enrich's safety
 * guard to detect when a stored title is wildly different from what TMDb
 * returns for the same tmdb_id (which means the row's tmdb_id is wrong).
 *
 * Returns 1.0 for identical strings (case- and punctuation-insensitive).
 */
function titleSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  // Cheap shortcut: shorter is contained in longer => high similarity
  if (x.includes(y) || y.includes(x)) return 0.9;
  // Token-set overlap (cheap; full edit distance would be overkill)
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / Math.max(setA.size, setB.size);
}

/**
 * Re-enriches existing productions with the new TMDb-sourced fields.
 *
 * Safety guard: if the title TMDb returns for the stored tmdb_id is
 * wildly different from the row's current title (similarity < 0.4), the
 * row is SKIPPED unless `--force` is passed. This prevents a typo in a
 * seed `tmdbId` from silently overwriting hand-curated data with an
 * unrelated movie (the bug that corrupted 22 curated rows in 2026-05-04).
 */
export async function enrichExistingMovies(opts: { force?: boolean } = {}): Promise<ImportStats> {
  const stats: ImportStats = { attempted: 0, inserted: 0, updated: 0, skipped: 0 };

  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    console.error('TMDB_READ_ACCESS_TOKEN not set; aborting.');
    return stats;
  }

  const targets = await db.execute<{ tmdb_id: number; title: string }>(sql`
    SELECT tmdb_id, title FROM productions
    WHERE tmdb_id IS NOT NULL AND poster_path IS NULL
    ORDER BY tmdb_id
  `);

  console.log(`tmdb:enrich — ${targets.length} rows to enrich (force=${!!opts.force})`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const full = await fetchMovie(row.tmdb_id);
      if (!full) {
        stats.skipped++;
        continue;
      }
      const sim = titleSimilarity(row.title, full.title);
      if (sim < 0.4 && !opts.force) {
        console.warn(
          `  ! tmdb_id=${row.tmdb_id} stored title "${row.title}" doesn't match TMDb "${full.title}" (sim=${sim.toFixed(2)}); skipping. Pass --force to override.`,
        );
        stats.skipped++;
        continue;
      }
      const verb = await upsertMovie(full);
      stats[verb]++;
    } catch (e) {
      stats.skipped++;
      console.error(
        `  ✗ tmdb_id=${row.tmdb_id} (${row.title}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (stats.attempted % 50 === 0) {
      console.log(`  ${stats.attempted}/${targets.length} — updated ${stats.updated}, skipped ${stats.skipped}`);
    }
  }

  console.log(`tmdb:enrich done — attempted ${stats.attempted}, updated ${stats.updated}, skipped ${stats.skipped}`);
  return stats;
}

export async function importTmdbMovies(opts: ImportOptions = {}): Promise<ImportStats> {
  const limit = opts.limit ?? 500;
  const minVoteCount = opts.minVoteCount ?? 200;
  const startPage = opts.startPage ?? 1;

  const stats: ImportStats = { attempted: 0, inserted: 0, updated: 0, skipped: 0 };

  console.log(`tmdb:import — target=${limit}, minVoteCount=${minVoteCount}, startPage=${startPage}`);

  if (!process.env.TMDB_READ_ACCESS_TOKEN) {
    console.error('TMDB_READ_ACCESS_TOKEN not set; aborting.');
    return stats;
  }

  // 20 results per page on /discover
  const totalPages = Math.ceil(limit / 20) + startPage - 1;

  for (let page = startPage; page <= totalPages && stats.attempted < limit; page++) {
    const res = await discoverMovies({ page, minVoteCount });
    if (res.results.length === 0) {
      console.log(`  page ${page}: empty, stopping`);
      break;
    }
    for (const summary of res.results) {
      if (stats.attempted >= limit) break;
      stats.attempted++;
      try {
        // Re-fetch full details so we get imdb_id and accurate runtime.
        const full = await fetchMovie(summary.id);
        if (!full) {
          stats.skipped++;
          continue;
        }
        const verb = await upsertMovie(full);
        stats[verb]++;
      } catch (e) {
        stats.skipped++;
        console.error(
          `  ✗ tmdb_id=${summary.id} (${summary.title}): ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      if (stats.attempted % 25 === 0) {
        console.log(
          `  ${stats.attempted}/${limit} — inserted ${stats.inserted}, updated ${stats.updated}, skipped ${stats.skipped}`,
        );
      }
    }
  }

  console.log(
    `tmdb:import done — attempted ${stats.attempted}, inserted ${stats.inserted}, updated ${stats.updated}, skipped ${stats.skipped}`,
  );
  return stats;
}
