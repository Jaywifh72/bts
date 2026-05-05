/**
 * One-shot repair: the original hand-seeded curated films had a few
 * incorrect tmdb_id values (some pointed at completely unrelated movies).
 * The tmdb:enrich step then dutifully overwrote the title/synopsis/poster
 * to match the wrong tmdb_id, corrupting the row.
 *
 * This script:
 *   1. Walks every curated production whose slug doesn't match its title.
 *   2. Searches TMDb by the title parsed from the slug.
 *   3. Picks the best match by year proximity.
 *   4. Updates tmdb_id and re-pulls the canonical metadata.
 *
 * Usage: pnpm tsx scripts/fix-curated-tmdb-ids.ts
 */
import 'dotenv/config';
import { db, sql } from '@bts/db';
import { fetchMovie } from '../packages/scraper/src/tmdb/client.ts';

const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
if (!TOKEN) { console.error('TMDB_READ_ACCESS_TOKEN required'); process.exit(1); }

type SearchHit = {
  id: number;
  title: string;
  release_date: string | null;
};

async function searchByTitleYear(title: string, year: number | null): Promise<SearchHit | null> {
  const params = new URLSearchParams({ query: title, include_adult: 'false', language: 'en-US' });
  if (year) params.set('year', String(year));
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results: SearchHit[] };
  if (data.results.length === 0) return null;
  // Prefer exact year match
  if (year) {
    const exact = data.results.find((r) => r.release_date?.slice(0, 4) === String(year));
    if (exact) return exact;
  }
  return data.results[0]!;
}

function slugToTitleYear(slug: string): { title: string; year: number | null } {
  // Conventions used in our seed: 'killers-of-the-flower-moon-2023', 'tar-2022', etc.
  const m = slug.match(/^(.+)-(\d{4})$/);
  if (!m) return { title: slug.replace(/-/g, ' '), year: null };
  return {
    title: m[1]!.replace(/-/g, ' ').replace(/\bla\b/g, 'La').replace(/\bof\b/g, 'of'),
    year: parseInt(m[2]!, 10),
  };
}

async function main() {
  const rows = await db.execute<{ slug: string; title: string; tmdb_id: number | null }>(sql`
    SELECT slug, title, tmdb_id FROM productions
    WHERE data_tier = 'curated'
    ORDER BY slug
  `);

  let fixed = 0, ok = 0, notfound = 0;
  for (const row of rows) {
    const { title: expected, year } = slugToTitleYear(row.slug);
    // Heuristic: if the row's current title roughly matches the slug-derived title, skip.
    const currentTitleNorm = row.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const expectedNorm = expected.toLowerCase().replace(/[^a-z0-9]/g, '');
    // If first 6 chars match, assume the slug→title path is consistent.
    if (currentTitleNorm.startsWith(expectedNorm.slice(0, 6)) ||
        expectedNorm.startsWith(currentTitleNorm.slice(0, 6))) {
      ok++;
      continue;
    }

    console.log(`✗ ${row.slug} — current title "${row.title}" doesn't match slug; searching...`);
    const hit = await searchByTitleYear(expected, year);
    if (!hit) {
      console.log(`  no TMDb result for "${expected}" (${year})`);
      notfound++;
      continue;
    }

    const full = await fetchMovie(hit.id);
    if (!full) { notfound++; continue; }

    const genres = (full.genres ?? []).map((g) => g.name);
    const genresLiteral = genres.length > 0
      ? `{${genres.map((g) => `"${g.replace(/"/g, '\\"')}"`).join(',')}}`
      : null;
    const country = full.production_countries?.[0]?.iso_3166_1 ?? null;

    await db.execute(sql`
      UPDATE productions SET
        tmdb_id = ${full.id},
        title = ${full.title},
        original_title = ${full.original_title && full.original_title !== full.title ? full.original_title : null},
        release_year = ${full.release_date ? parseInt(full.release_date.slice(0, 4), 10) : year},
        runtime_minutes = ${full.runtime},
        synopsis = ${full.overview},
        imdb_id = ${full.imdb_id},
        genres = ${genresLiteral}::text[],
        original_language = ${full.original_language},
        production_country = ${country},
        popularity = ${full.popularity ?? null},
        vote_average = ${full.vote_average ?? null},
        vote_count = ${full.vote_count ?? null},
        poster_path = ${full.poster_path},
        backdrop_path = ${full.backdrop_path},
        tmdb_collection_id = ${full.belongs_to_collection?.id ?? null},
        tmdb_collection_name = ${full.belongs_to_collection?.name ?? null},
        updated_at = NOW()
      WHERE slug = ${row.slug}
    `);
    console.log(`  → ${full.title} (tmdb_id=${full.id})`);
    fixed++;
  }

  console.log(`\nDone. ok=${ok}, fixed=${fixed}, notfound=${notfound}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
