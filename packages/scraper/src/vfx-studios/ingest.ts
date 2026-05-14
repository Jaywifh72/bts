import 'dotenv/config';
import Fuse from 'fuse.js';
import { db, sql } from '@bts/db';
import { fetchFeed, type FeedItem } from '../rss/parse.ts';

/**
 * E-02 — VFX studio filmography ingest.
 *
 * Pattern: each studio's "projects we worked on" page is the source.
 * Where the studio publishes a WordPress RSS for it (e.g. ILM's
 * `/vfx/feed/`), we use that. Where they don't (Wētā, DNEG, Framestore,
 * MPC), we'll plug in bespoke HTML scrapers via the same `StudioConfig`
 * shape — `fetcher` returns a list of `StudioProject`s and the rest of
 * the pipeline is shared.
 *
 * Each matched project becomes a `vfx_credits` row linking the
 * production to the VFX house. Idempotent — re-running upserts on the
 * `(production_id, vfx_house_id)` unique index.
 */

export type StudioProject = {
  /** The project's title as published by the studio. */
  title: string;
  /** Optional release year — set when the studio publishes it. */
  year?: number | null;
  /** Studio-specific URL for the project page (becomes a `source` row). */
  url: string;
  /** Free-text scope/role note from the studio's listing. */
  notes?: string | null;
};

export type StudioConfig = {
  /** Maps to `vfx_houses.slug`. */
  houseSlug: string;
  /** Display label for log lines. */
  label: string;
  /** How the projects get pulled in. */
  fetcher: () => Promise<StudioProject[]>;
  /** Default credit role for this studio's projects. */
  role: 'primary' | 'additional' | 'special_sequences' | 'miniatures' | 'previsualization';
};

export type StudioIngestStats = {
  studio: string;
  scanned: number;
  matched: number;
  inserted: number;
  skipped: number;
  errors: number;
};

type ProductionRow = { id: number; slug: string; title: string; release_year: number | null };

let _productionCache: ProductionRow[] | null = null;

async function loadProductions(): Promise<ProductionRow[]> {
  if (_productionCache) return _productionCache;
  const rows = await db.execute<ProductionRow>(sql`
    SELECT id, slug, title, release_year FROM productions
  `);
  _productionCache = [...rows];
  return _productionCache;
}

/**
 * VFX-studio matching is stricter than the RSS-article matcher because
 * studio listings publish bare titles ("The End of Oak Street") rather
 * than full sentences. We require an exact normalized-title match;
 * fall back to fuzzy with a tight threshold for minor punctuation
 * differences ("WALL·E" vs "WALL-E").
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function matchTitle(
  title: string,
  yearHint: number | null,
): Promise<ProductionRow | null> {
  const all = await loadProductions();
  const needle = normalize(title);

  // 1. Exact normalized match (preferring year-match if year known).
  const exact = all.filter((p) => normalize(p.title) === needle);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1 && yearHint !== null) {
    const yearHit = exact.find((p) => p.release_year === yearHint);
    if (yearHit) return yearHit;
  }
  if (exact.length >= 1) return exact[0]!;

  // 2. Fuse fuzzy with tight threshold (catches "WALL·E" / "WALL-E").
  const fuse = new Fuse(all, {
    keys: ['title'],
    threshold: 0.15,
    includeScore: true,
  });
  const results = fuse.search(title);
  if (results.length === 0) return null;
  const top = results[0]!;
  if (top.score === undefined || top.score > 0.15) return null;

  // If multiple close matches and we have a year hint, prefer it.
  if (yearHint !== null && results.length > 1) {
    const yearMatch = results.find((r) => r.item.release_year === yearHint);
    if (yearMatch) return yearMatch.item;
  }
  return top.item;
}

export async function ingestStudio(cfg: StudioConfig): Promise<StudioIngestStats> {
  const stats: StudioIngestStats = {
    studio: cfg.houseSlug,
    scanned: 0,
    matched: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  // Resolve the house id once.
  const [house] = await db.execute<{ id: number }>(sql`
    SELECT id FROM vfx_houses WHERE slug = ${cfg.houseSlug}
  `);
  if (!house) {
    console.error(`vfx-studios:${cfg.houseSlug} — house slug not in vfx_houses; aborting`);
    stats.errors++;
    return stats;
  }
  const houseId = house.id;

  let projects: StudioProject[];
  try {
    projects = await cfg.fetcher();
  } catch (e) {
    console.error(`vfx-studios:${cfg.houseSlug} fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    stats.errors++;
    return stats;
  }

  console.log(`vfx-studios:${cfg.houseSlug} — ${projects.length} projects from ${cfg.label}`);

  for (const project of projects) {
    stats.scanned++;
    let prod: ProductionRow | null;
    try {
      prod = await matchTitle(project.title, project.year ?? null);
    } catch (e) {
      stats.errors++;
      console.error(`  match error on "${project.title}": ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (!prod) {
      stats.skipped++;
      continue;
    }
    stats.matched++;

    try {
      // Upsert the credit. ON CONFLICT on the (production_id, vfx_house_id)
      // unique constraint refreshes notes if the studio updated them.
      await db.execute(sql`
        INSERT INTO vfx_credits (production_id, vfx_house_id, role, notes)
        VALUES (${prod.id}, ${houseId}, ${cfg.role}::vfx_credit_role_enum, ${project.notes ?? null})
        ON CONFLICT (production_id, vfx_house_id) DO UPDATE SET
          notes = COALESCE(EXCLUDED.notes, vfx_credits.notes),
          updated_at = NOW()
      `);
      stats.inserted++;
    } catch (e) {
      stats.errors++;
      console.error(`  insert error for "${project.title}" → ${prod.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `vfx-studios:${cfg.houseSlug} done — scanned=${stats.scanned} matched=${stats.matched} inserted=${stats.inserted} skipped=${stats.skipped} errors=${stats.errors}`,
  );
  return stats;
}

/**
 * Helper: build a StudioProject list by scraping a static HTML
 * listing page. The regex must capture exactly one group: the project
 * slug (e.g. `our-work/blade-runner-2099` → `blade-runner-2099`). The
 * slug is dehyphenated into a coarse title and passed to the matcher,
 * which handles normalization (so `dune-part-two` matches our
 * production "Dune: Part Two" without us having to scrape full titles).
 *
 * Best for SPA-style listing pages (DNEG / Framestore) where extracting
 * project titles from the rendered HTML is messy but link slugs are
 * stable.
 */
export function htmlListFetcher(
  listingUrl: string,
  slugRegex: RegExp,
  baseUrl: string,
): () => Promise<StudioProject[]> {
  return async () => {
    const res = await fetch(listingUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CineCanonBot/1.0; +https://cinecanon.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${listingUrl}`);
    const html = await res.text();

    const seen = new Set<string>();
    const projects: StudioProject[] = [];
    const re = new RegExp(slugRegex.source, slugRegex.flags.includes('g') ? slugRegex.flags : slugRegex.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const slug = m[1];
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const title = slug.replace(/-/g, ' ');
      projects.push({
        title,
        year: null,
        url: new URL(slug, baseUrl).toString(),
        notes: null,
      });
    }
    return projects;
  };
}

/**
 * Helper: build a StudioProject list from a hardcoded hand-curated
 * list. Use when the studio's own site is SPA-rendered AND TMDb's
 * `with_companies` index under-counts the studio's VFX work
 * (because TMDb credits the *production* studio, not the VFX house).
 * This mirrors CineCanon's editorial model: hand-curated where it
 * counts, rather than chasing a brittle scraper for thin coverage.
 */
export function curatedListFetcher(
  list: ReadonlyArray<{ title: string; year: number; notes?: string }>,
): () => Promise<StudioProject[]> {
  return async () =>
    list.map((p) => ({
      title: p.title,
      year: p.year,
      // Stable URL keyed off title — `sources` uses `url` as a unique
      // key in some places, so we want a deterministic value even
      // though there's no real outbound link.
      url: `studio-pro://curated/${encodeURIComponent(p.title)}-${p.year}`,
      notes: p.notes ?? null,
    }));
}

/**
 * Helper: build a StudioProject list from TMDb's discover endpoint
 * filtered by `with_companies={id}`. Use when the studio's own site
 * is SPA-rendered (Wētā, MPC) but TMDb knows the filmography.
 *
 * Note: TMDb's `with_companies` index credits the *production
 * company*, not the VFX house. Coverage for VFX studios is sparse
 * (Wētā FX = 1 film, MPC = ~9 films). Prefer `curatedListFetcher`
 * for VFX-house adapters.
 *
 * Pages through results; defaults to 5 pages = ~100 films, deep
 * enough for any active VFX house's recent decade. Min vote count
 * filters out tiny noise titles. Requires TMDB_READ_ACCESS_TOKEN.
 */
export function tmdbCompanyFetcher(
  companyId: number,
  opts: { pages?: number; minVoteCount?: number } = {},
): () => Promise<StudioProject[]> {
  const maxPages = opts.pages ?? 5;
  const minVotes = opts.minVoteCount ?? 50;
  return async () => {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    if (!token) throw new Error('TMDB_READ_ACCESS_TOKEN not set; tmdbCompanyFetcher unavailable');

    const collected: StudioProject[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({
        with_companies: String(companyId),
        page: String(page),
        'vote_count.gte': String(minVotes),
        sort_by: 'release_date.desc',
        include_adult: 'false',
        language: 'en-US',
      });
      const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`TMDb discover ${res.status} (company=${companyId} page=${page})`);
      const json = (await res.json()) as { results: Array<{ id: number; title: string; release_date: string | null }>; total_pages: number };
      if (!json.results || json.results.length === 0) break;
      for (const m of json.results) {
        const year = m.release_date && /^\d{4}/.test(m.release_date) ? Number(m.release_date.slice(0, 4)) : null;
        collected.push({
          title: m.title,
          year,
          url: `https://www.themoviedb.org/movie/${m.id}`,
          notes: null,
        });
      }
      if (page >= json.total_pages) break;
      // Polite spacing — TMDb client elsewhere uses 100ms; mirror it here.
      await new Promise((r) => setTimeout(r, 120));
    }
    return collected;
  };
}

/**
 * Helper: build a StudioProject list from a WordPress RSS feed.
 *
 * `pages` walks `?paged=N` for multiple pages — WordPress's pagination
 * convention. Defaults to 8 (covers ~80 recent projects, deep enough
 * for any current studio's historical filmography). Stops early on
 * empty page or all-duplicate results.
 */
export function rssFetcher(
  feedUrl: string,
  opts: { pages?: number } = {},
): () => Promise<StudioProject[]> {
  const maxPages = opts.pages ?? 8;
  return async () => {
    const collected: StudioProject[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1
        ? feedUrl
        : feedUrl.includes('?')
          ? `${feedUrl}&paged=${page}`
          : `${feedUrl}?paged=${page}`;
      let items: FeedItem[];
      try {
        items = await fetchFeed(url);
      } catch {
        break;
      }
      if (items.length === 0) break;

      let added = 0;
      for (const it of items) {
        if (seen.has(it.link)) continue;
        seen.add(it.link);
        added++;
        const yearMatch = /\/(\d{4})\//.exec(it.link);
        const year = yearMatch ? Number(yearMatch[1]) : it.pubDate?.getFullYear() ?? null;
        collected.push({
          title: it.title,
          year,
          url: it.link,
          notes: it.summary || null,
        });
      }
      if (added === 0) break;
    }
    return collected;
  };
}
