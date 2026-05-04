# TMDb Ingestion — Implementation Plan

> Sub-project of the data-layer family. Wires TMDb's public movie metadata into two surfaces: (1) per-page poster/backdrop fetch on /films/[slug] (already half-built; finish), and (2) a bulk one-shot importer that scales the corpus from 55 hand-seeded productions to ~1000.

**Goal:** Films pages render real TMDb posters; a `tmdb:import` CLI command ingests N hundred top-rated/popular movies into `productions`, idempotently upsertable on `tmdb_id`.

**Architecture:** A small typed TMDb client in the scraper package; a backfill job that paginates through TMDb endpoints, transforms to our schema, and upserts. The web app's existing `fetchTmdbMedia()` stub becomes a thin call into the same client (read-only) plus per-request caching.

**Tech Stack:** Bearer-token auth, native `fetch`, no new runtime deps. Uses Next.js `unstable_cache` for the web-side fetch.

---

## Decisions (compact)

| # | Question | Decision |
|---|---|---|
| D1 | Auth | v4 Bearer token (`TMDB_READ_ACCESS_TOKEN`). v3 API key is the alternative; Bearer is the modern preferred way and our token grants `api_read` scope. |
| D2 | Discovery endpoint for bulk import | `/discover/movie` with `vote_count.gte=200`, `sort_by=vote_average.desc`. Top-rated returns the same first 500 films forever; discover lets us tune. |
| D3 | Import target size | 500 films by default, configurable via `--limit`. TMDb pages are 20 results each → 25 pages. |
| D4 | Slug strategy | `slugify(title)-{release_year}`. On collision (rare), suffix the imdb_id last 6 chars. |
| D5 | Production type | All discover-imported rows get `type='feature'`. (TV is a future expansion.) |
| D6 | Conflict policy | `ON CONFLICT (tmdb_id) DO UPDATE` — refresh title/synopsis/runtime/imdb_id but never overwrite slug (URL stability) or type. |
| D7 | Image base URL | Hardcode `https://image.tmdb.org/t/p/`. TMDb publishes the configuration endpoint but the base hasn't changed in 10+ years. |
| D8 | Image sizes | Poster: `w342` (poster card use). Backdrop: `w1280` (hero strips). Document the choice in the client. |
| D9 | Web-side caching | Wrap `fetchTmdbMedia` with `unstable_cache(...)` keyed on tmdb_id, revalidate every 24h. Per-image URLs are CDN-served by TMDb so no further caching needed. |
| D10 | Rate limit | TMDb advertises ~50 req/sec, no enforced limit on read endpoints. Throttle to 10 req/sec defensively. |

---

## Task 1: Shared TMDb client

**Files:**
- Create: `packages/scraper/src/tmdb/client.ts`
- Modify: `packages/scraper/.env.example` and `.env` (add `TMDB_READ_ACCESS_TOKEN`)
- Modify: `.env.example` (add `TMDB_READ_ACCESS_TOKEN` documented)

The client exposes:

```typescript
export type TmdbMovie = {
  id: number;
  title: string;
  original_title: string | null;
  overview: string | null;        // synopsis
  release_date: string | null;    // 'YYYY-MM-DD'
  runtime: number | null;         // minutes
  poster_path: string | null;     // '/abc123.jpg'
  backdrop_path: string | null;
  imdb_id: string | null;
};

export async function fetchMovie(id: number): Promise<TmdbMovie | null>;
export async function discoverMovies(opts: { page: number; minVoteCount?: number; sortBy?: string }): Promise<{ results: TmdbMovie[]; total_pages: number }>;
export function imageUrl(path: string | null, size: 'w342' | 'w780' | 'w1280' | 'original'): string | null;
```

`fetchMovie` calls `/movie/{id}?append_to_response=external_ids` so we get imdb_id without a second roundtrip.

Throttling: a simple in-module mutex limiting concurrent in-flight requests to 5 plus a 100ms minimum delay between starts. Returns `null` on 404; throws on other errors.

Returns `null` when `TMDB_READ_ACCESS_TOKEN` is unset (mirrors how YouTube/Vimeo clients handle missing creds), so non-prod environments degrade gracefully.

Commit: `feat(scraper): add typed TMDb v4 API client`

---

## Task 2: Bulk import command

**Files:**
- Create: `packages/scraper/src/tmdb/import.ts` (the actual import job)
- Modify: `packages/scraper/src/cli.ts` — add `tmdb:import` command

Algorithm:

```
for page = 1..ceil(limit/20):
  res = discoverMovies({ page, minVoteCount: 200, sortBy: 'vote_average.desc' })
  for movie in res.results:
    if seen >= limit: break
    full = await fetchMovie(movie.id)        // get imdb_id
    upsert into productions:
      slug = slugify(`${full.title}-${year(full.release_date)}`)
      type = 'feature'
      tmdb_id = full.id
      title = full.title
      original_title = full.original_title (if differs)
      release_year = year(full.release_date)
      runtime_minutes = full.runtime
      synopsis = full.overview
      imdb_id = full.imdb_id
    log every 25 imports
```

CLI: `pnpm tsx src/cli.ts tmdb:import [--limit N] [--min-votes N] [--start-page N]`. Default limit 500, min-votes 200, start-page 1.

Idempotent: rerunning the same command upserts in place. The slug derives from title+year so it's stable.

Commit: `feat(scraper): add tmdb:import bulk movie ingestion command`

---

## Task 3: Web-side fetchTmdbMedia

**Files:**
- Modify: `apps/web/lib/tmdb.ts`
- Modify: `apps/web/.env.local` (add `TMDB_READ_ACCESS_TOKEN`)
- Modify: `.env.example`

Replace the stub with a real implementation that:
1. Returns `null` if no `tmdb_id` or no token.
2. Calls `/movie/{id}/images` to get poster + backdrop paths.
3. Wrapped in `unstable_cache(... { revalidate: 86400 })` keyed on tmdb_id.
4. Returns `{ poster: <full url> | null, backdrops: <full url>[] }`.

Use the same image base + size choices from the scraper client (export `imageUrl` helper from there if practical, or duplicate the constant — prefer duplication to avoid coupling apps/web to packages/scraper).

Better: extract a tiny `lib/tmdb-image.ts` helper into both. For now, just inline.

Commit: `feat(web): wire fetchTmdbMedia to real TMDb image API with 24h cache`

---

## Task 4: Verification

1. `pnpm --filter @bts/db test` — still 55 passing (no schema changes)
2. `pnpm --filter @bts/web typecheck` — clean
3. `pnpm --filter @bts/web build` — clean
4. CLI smoke: `cd packages/scraper && pnpm tsx src/cli.ts tmdb:import --limit 50` — should add ~50 new productions, idempotent on rerun
5. Browser smoke: visit `/films/dune-part-two-2024`, see real TMDb backdrop hero + poster
6. `/films` index — much longer list now
7. Sitemap auto-grows: `/sitemap.xml` should include all the newly-imported slugs (no code change needed; sitemap pulls from DB)

---

## Out of scope for this round (future tasks)

- Cast/crew ingestion (TMDb's `/movie/{id}/credits`) — would multiply request count and require role-mapping decisions
- TV show ingestion — different schema fields, deferred to its own brainstorm
- Image vendoring / S3 mirror — TMDb's CDN is reliable, defer until a real perf complaint
- Periodic refresh job — manual rerun is fine until corpus is large enough that drift matters
