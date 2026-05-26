// Robots / meta-noindex scan at scale.
//
// Whereas seo-audit.ts does deep per-page checks on ~12 priority URLs, this
// scanner does a single-purpose, much lighter sweep across hundreds of URLs
// to surface any page accidentally set to noindex (the silent ranking killer).
//
// Two checks per URL:
//   1. <meta name="robots" content="...noindex..."> in the rendered HTML
//   2. X-Robots-Tag response header containing noindex
//
// Also fetches /robots.txt once and surfaces its Disallow rules so the user
// can confirm nothing important is blocked at the crawler level.

import { siteUrl } from './site';
import { db, sql } from '@bts/db';

export type NoindexHit = {
  url: string;
  source: 'meta_robots' | 'x_robots_tag' | 'both';
  value: string;
};

export type NoindexScanReport = {
  ranAt: string;
  urlsScanned: number;
  hits: NoindexHit[];
  robotsTxt: {
    fetched: boolean;
    status: number;
    disallows: string[];
    raw: string;
  };
  errors: Array<{ url: string; error: string }>;
};

const SCAN_BUDGET = 400;
const CONCURRENCY = 12;

export async function scanForNoindex(opts: {
  paths?: ReadonlyArray<string>;
} = {}): Promise<NoindexScanReport> {
  const base = siteUrl();
  const paths = opts.paths ?? await defaultScanPaths();
  const urls = paths.slice(0, SCAN_BUDGET).map((p) => `${base}${p}`);

  const hits: NoindexHit[] = [];
  const errors: NoindexScanReport['errors'] = [];

  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const i = cursor++;
      const u = urls[i]!;
      try {
        const res = await fetch(u, {
          headers: { 'User-Agent': 'CineCanonNoindexScan/1.0' },
          cache: 'no-store',
          redirect: 'follow',
        });
        if (!res.ok) {
          errors.push({ url: u, error: `HTTP ${res.status}` });
          continue;
        }
        const xrt = res.headers.get('x-robots-tag') ?? '';
        const html = await res.text();
        const metaMatch = html.match(/<meta\s+[^>]*?name=["']robots["'][^>]*?content=["']([^"']*)["']/i);
        const metaContent = metaMatch?.[1] ?? '';
        const metaHasNoindex = /noindex/i.test(metaContent);
        const xrtHasNoindex = /noindex/i.test(xrt);
        if (metaHasNoindex && xrtHasNoindex) {
          hits.push({ url: u, source: 'both', value: `meta=${metaContent}; x-robots-tag=${xrt}` });
        } else if (metaHasNoindex) {
          hits.push({ url: u, source: 'meta_robots', value: metaContent });
        } else if (xrtHasNoindex) {
          hits.push({ url: u, source: 'x_robots_tag', value: xrt });
        }
      } catch (err) {
        errors.push({ url: u, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const robotsTxt = await fetchRobotsTxt(base);

  return {
    ranAt: new Date().toISOString(),
    urlsScanned: urls.length,
    hits,
    robotsTxt,
    errors,
  };
}

async function fetchRobotsTxt(base: string): Promise<NoindexScanReport['robotsTxt']> {
  try {
    const res = await fetch(`${base}/robots.txt`, {
      headers: { 'User-Agent': 'CineCanonNoindexScan/1.0' },
      cache: 'no-store',
    });
    const raw = await res.text();
    const disallows = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^disallow:/i.test(l))
      .map((l) => l.replace(/^disallow:\s*/i, ''));
    return { fetched: res.ok, status: res.status, disallows, raw: raw.slice(0, 4000) };
  } catch {
    return { fetched: false, status: 0, disallows: [], raw: '' };
  }
}

/**
 * Default scan set: top index pages + a wider net of curated films + crew.
 * Capped at SCAN_BUDGET. Targets URLs that should be indexable; the whole
 * point is to catch any of them that got noindex'd by mistake.
 */
async function defaultScanPaths(): Promise<string[]> {
  const paths: string[] = [
    '/', '/films', '/crew', '/gear', '/vfx',
    '/sound', '/music', '/stunts', '/awards',
    '/references', '/methodology', '/about',
    '/queries', '/ask', '/tools', '/dossiers',
    '/walkthroughs', '/decisions', '/partnerships',
  ];
  try {
    const films = await db.execute<{ slug: string }>(sql`
      SELECT slug FROM productions
      WHERE data_tier = 'curated'
      ORDER BY release_year DESC NULLS LAST
      LIMIT 200
    `);
    paths.push(...films.map((r) => `/films/${r.slug}`));
  } catch { /* DB unavailable — index pages only */ }
  try {
    const people = await db.execute<{ slug: string }>(sql`
      SELECT slug FROM people
      WHERE EXISTS (SELECT 1 FROM crew_assignments WHERE person_id = people.id)
      ORDER BY slug ASC
      LIMIT 100
    `);
    paths.push(...people.map((r) => `/crew/${r.slug}`));
  } catch { /* ignore */ }
  return paths;
}
