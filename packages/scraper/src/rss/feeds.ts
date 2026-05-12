import type { FeedConfig } from './ingest.ts';
import type { FeedItem } from './parse.ts';

/**
 * Strip the "Foo Movie: VFX breakdown" / " — Production Designer Q&A"
 * suffixes that magazine feeds attach so the matcher only sees the
 * bare production title.
 *
 * Heuristic: take the first phrase before a colon or em-dash. If the
 * title is "Foo Bar: VFX of the Year", we want "Foo Bar". If it's
 * "Cinematographer X on shooting Foo Bar", we fall back to the full
 * title because no separator gives a clean cut.
 */
function stripCommonSuffixes(title: string): string {
  const sep = title.search(/[:—–-]/);
  if (sep === -1) return title.trim();
  const head = title.slice(0, sep).trim();
  // Don't bite off a leading verb-y phrase. If `head` is a single short
  // word ("Cinematographer"), return the full title.
  if (head.split(/\s+/).length < 2) return title.trim();
  return head;
}

/**
 * Pull a 4-digit year from common URL patterns like
 * `https://example.com/2024/03/title/`.
 */
function yearFromUrl(item: FeedItem): number | null {
  const m = /\/(\d{4})\//.exec(item.link);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2100 ? y : null;
}

export const FEEDS: Record<string, FeedConfig> = {
  fxguide: {
    id: 'fxguide',
    feedUrl: 'https://www.fxguide.com/feed/',
    publication: 'fxguide',
    sourceKind: 'vfx_breakdown_article',
    confidence: 'secondary',
    extractProductionTitle: (it) => stripCommonSuffixes(it.title),
    extractYearHint: yearFromUrl,
  },
  vfxvoice: {
    id: 'vfxvoice',
    feedUrl: 'https://www.vfxvoice.com/feed/',
    publication: 'VFX Voice (Visual Effects Society)',
    sourceKind: 'magazine_article',
    confidence: 'secondary',
    extractProductionTitle: (it) => stripCommonSuffixes(it.title),
    extractYearHint: yearFromUrl,
  },
  britishcinematographer: {
    id: 'britishcinematographer',
    feedUrl: 'https://britishcinematographer.co.uk/feed/',
    publication: 'British Cinematographer',
    sourceKind: 'magazine_article',
    confidence: 'secondary',
    extractProductionTitle: (it) => stripCommonSuffixes(it.title),
    extractYearHint: yearFromUrl,
  },
  // ASC: theasc.com/feed/ returns HTML (no public RSS as of 2026-05-05).
  // Re-add when they publish one. theasc.com pre-paywall content is still
  // citation-grade — just have to scrape the article index instead.
  indiewire_craft: {
    id: 'indiewire_craft',
    feedUrl: 'https://www.indiewire.com/category/craft/feed/',
    publication: 'IndieWire (Craft)',
    sourceKind: 'magazine_article',
    confidence: 'secondary',
    extractProductionTitle: (it) => stripCommonSuffixes(it.title),
    extractYearHint: yearFromUrl,
  },
  definition: {
    id: 'definition',
    feedUrl: 'https://definitionmagazine.com/feed/',
    publication: 'Definition Magazine',
    sourceKind: 'magazine_article',
    confidence: 'secondary',
    extractProductionTitle: (it) => stripCommonSuffixes(it.title),
    extractYearHint: yearFromUrl,
  },
  // Filmmaker Magazine: 403s under default fetch UA (Cloudflare-protected).
  // Re-enable once the parser sets a more browser-like UA, or after we
  // establish a working contact with their team for an allowed bot UA.
  // filmmaker: { ... },
  lensrentals: {
    id: 'lensrentals',
    feedUrl: 'https://www.lensrentals.com/blog/feed/',
    publication: 'LensRentals (Roger Cicala)',
    sourceKind: 'magazine_article',
    confidence: 'secondary',
    extractProductionTitle: (it) => stripCommonSuffixes(it.title),
    extractYearHint: yearFromUrl,
  },
  // E-15 — CineD camera/sensor reviews. Most articles are gear-centric
  // (no production title), but the matcher ignores those gracefully.
  // Articles that DO cite a film (e.g. "Shot on the ALEXA 35: Civil War")
  // get picked up. Camera-specific lab numbers are curated manually
  // into `equipment_items.specs.dynamic_range_stops` etc.
  cined: {
    id: 'cined',
    feedUrl: 'https://www.cined.com/feed/',
    publication: 'CineD',
    sourceKind: 'magazine_article',
    confidence: 'secondary',
    extractProductionTitle: (it) => stripCommonSuffixes(it.title),
    extractYearHint: yearFromUrl,
  },

  // E-18 — podcast feeds. Episode metadata (title + guest names) is
  // citable; transcripts are not (most are not permissively licensed).
  // We tag as kind='podcast' so the bibliography surfaces the right
  // affordance (no "read article" link — instead "listen to episode").
  team_deakins: {
    id: 'team_deakins',
    feedUrl: 'https://teamdeakins.libsyn.com/rss',
    publication: 'Team Deakins Podcast',
    sourceKind: 'podcast',
    // Roger Deakins reading his own work + guest interviews — closer
    // to primary than secondary.
    confidence: 'primary',
  },
  // The Cinematography Podcast (camnoir.com) and fxpodcast (libsyn) URLs
  // both 404'd or were unreachable on 2026-05-05. Re-enable when we have
  // working feed URLs — Apple Podcasts directory + iTunes Search API
  // would be the canonical resolver.

  // E-18 expansion — added 2026-05-07.
  wandering_dp: {
    id: 'wandering_dp',
    feedUrl: 'https://wanderingdp.com/feed/podcast/',
    publication: 'Wandering DP Podcast',
    sourceKind: 'podcast',
    // Long-form interviews with working DPs; close-to-primary when the
    // guest is the production's actual cinematographer.
    confidence: 'secondary',
  },
  indie_film_hustle: {
    id: 'indie_film_hustle',
    feedUrl: 'https://www.indiefilmhustle.com/feed/podcast/',
    publication: 'Indie Film Hustle',
    sourceKind: 'podcast',
    confidence: 'secondary',
  },
};
