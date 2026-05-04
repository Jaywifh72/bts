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

  // Single statement upsert keyed on tmdb_id. Slug collisions across
  // distinct tmdb_ids are pre-resolved above.
  const result = await db.execute<{ created: boolean }>(sql`
    INSERT INTO productions
      (slug, type, title, original_title, release_year, runtime_minutes, synopsis, tmdb_id, imdb_id)
    VALUES
      (${slug}, 'feature',
       ${movie.title},
       ${movie.original_title && movie.original_title !== movie.title ? movie.original_title : null},
       ${year},
       ${movie.runtime},
       ${movie.overview},
       ${movie.id},
       ${movie.imdb_id})
    ON CONFLICT (tmdb_id) DO UPDATE SET
      title = EXCLUDED.title,
      original_title = EXCLUDED.original_title,
      release_year = COALESCE(EXCLUDED.release_year, productions.release_year),
      runtime_minutes = COALESCE(EXCLUDED.runtime_minutes, productions.runtime_minutes),
      synopsis = COALESCE(EXCLUDED.synopsis, productions.synopsis),
      imdb_id = COALESCE(EXCLUDED.imdb_id, productions.imdb_id),
      updated_at = NOW()
    RETURNING (xmax = 0) AS created
  `);

  if (!result[0]) return 'skipped';
  return result[0].created ? 'inserted' : 'updated';
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
