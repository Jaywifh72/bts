import 'dotenv/config';
import { db, sql } from '@bts/db';
import { fetchFeed, type FeedItem } from './parse.ts';
import { matchProductionByContext } from '../scrapers/matcher.ts';

/**
 * Generic RSS-to-citations pipeline. Feed config defines:
 *  - feed URL
 *  - publication name (display label on the citations list)
 *  - source kind (one of `source_kind_enum`)
 *  - default confidence (sometimes a publication is `primary` —
 *    DP interview transcripts — sometimes `secondary` — third-party
 *    coverage)
 *  - title-extraction hook: pull the production title out of the
 *    article title (e.g. fxguide titles are usually "Foo Movie: VFX
 *    Breakdown"; we want "Foo Movie")
 *
 * The pipeline walks each feed entry, tries to match it to a production
 * via `matchProduction(title, year)`. On match: upsert a `sources` row
 * keyed on URL, then upsert a `production_sources` row.
 *
 * Idempotent: rerunning consumes new entries only because of the URL
 * unique index on `sources` and the (production_id, source_id) unique
 * on `production_sources`.
 */

export type FeedConfig = {
  /** Stable identifier in CLI flags / log lines. */
  id: string;
  feedUrl: string;
  publication: string;
  /** Maps to `source_kind_enum`. Most magazine feeds are `magazine_article`. */
  sourceKind:
    | 'magazine_article'
    | 'press_release'
    | 'epk_document'
    | 'interview_transcript'
    | 'book'
    | 'podcast'
    | 'commentary_track'
    | 'documentary'
    | 'manufacturer_product_page'
    | 'social_media'
    | 'personal_communication'
    | 'forum_post'
    | 'wiki'
    | 'vfx_breakdown_article'
    | 'other';
  /** Default confidence for citations from this feed. */
  confidence: 'primary' | 'secondary' | 'manufacturer_marketing' | 'speculative';
  /**
   * Per-feed extractor that converts an article title into the bare
   * production title we'll fuzzy-match against. Default: the title
   * itself. Override when feeds prefix or suffix consistently.
   */
  extractProductionTitle?: (item: FeedItem) => string;
  /**
   * Optional: per-feed year hint extractor (e.g. parse from URL path
   * `/2024/03/...`). Returns null when unknown.
   */
  extractYearHint?: (item: FeedItem) => number | null;
};

export type IngestStats = {
  feed: string;
  scanned: number;
  matched: number;
  inserted: number;
  skipped: number;
  errors: number;
};

export async function ingestFeed(cfg: FeedConfig): Promise<IngestStats> {
  const stats: IngestStats = {
    feed: cfg.id,
    scanned: 0,
    matched: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
  };

  let items: FeedItem[];
  try {
    items = await fetchFeed(cfg.feedUrl);
  } catch (e) {
    stats.errors++;
    console.error(`rss:${cfg.id} fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    return stats;
  }

  console.log(`rss:${cfg.id} — ${items.length} items in feed`);

  for (const item of items) {
    stats.scanned++;
    const yearHint = cfg.extractYearHint ? cfg.extractYearHint(item) : null;

    // Substring-match the article title (and optionally summary) against
    // every production. Prefer matching the article title alone — summary
    // often mentions other films incidentally and would over-match.
    let slug: string | null;
    try {
      slug = await matchProductionByContext(item.title, yearHint);
    } catch (e) {
      stats.errors++;
      console.error(`  match error on "${item.title}": ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (!slug) {
      stats.skipped++;
      continue;
    }
    stats.matched++;

    try {
      // Upsert source by URL. Slugify the title for `sources.slug`.
      const slugified = `${cfg.id}-${slugifyTitle(item.title)}`.slice(0, 80);
      const publishedAt = item.pubDate?.toISOString().slice(0, 10) ?? null;

      const sourceRows = await db.execute<{ id: number }>(sql`
        INSERT INTO sources (slug, kind, title, publication, published_at, accessed_at, url, notes)
        VALUES (
          ${slugified},
          ${cfg.sourceKind}::source_kind_enum,
          ${item.title},
          ${cfg.publication},
          ${publishedAt}::date,
          NOW()::date,
          ${item.link},
          ${item.summary || null}
        )
        ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
          accessed_at = EXCLUDED.accessed_at,
          updated_at = NOW()
        RETURNING id
      `);

      const sourceId = sourceRows[0]?.id;
      if (!sourceId) {
        stats.skipped++;
        continue;
      }

      // Link to production via production_sources. PK is (production, source);
      // ON CONFLICT DO NOTHING is correct.
      await db.execute(sql`
        INSERT INTO production_sources (production_id, source_id, confidence)
        SELECT p.id, ${sourceId}, ${cfg.confidence}::source_confidence_enum
        FROM productions p WHERE p.slug = ${slug}
        ON CONFLICT DO NOTHING
      `);
      stats.inserted++;
    } catch (e) {
      stats.errors++;
      console.error(`  ingest error on "${item.title}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `rss:${cfg.id} done — scanned=${stats.scanned} matched=${stats.matched} inserted=${stats.inserted} skipped=${stats.skipped} errors=${stats.errors}`,
  );
  return stats;
}

function slugifyTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
