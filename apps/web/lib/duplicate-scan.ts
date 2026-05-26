// Duplicate-content / duplicate-meta detection.
//
// Crawls a configurable set of URLs, extracts <title> and <meta description>,
// groups by value, and surfaces any value shared by ≥2 URLs. Google penalizes
// duplicate titles/descriptions because they signal duplicate content.
//
// Uses the same parsing functions as the on-page audit. Pulls a larger URL
// set than the audit (films + crew + key index pages) because duplicates are
// most likely to appear at scale.

import { siteUrl } from './site';
import { db, sql } from '@bts/db';

export type DuplicateGroup = {
  value: string;
  urls: string[];
};

export type DuplicateReport = {
  ranAt: string;
  urlsScanned: number;
  titleDuplicates: DuplicateGroup[];
  descriptionDuplicates: DuplicateGroup[];
  missingTitleUrls: string[];
  missingDescriptionUrls: string[];
  errors: Array<{ url: string; error: string }>;
};

const SCAN_PATHS_BUDGET = 80;
const CONCURRENCY = 8;

export async function scanForDuplicates(opts: {
  paths?: ReadonlyArray<string>;
} = {}): Promise<DuplicateReport> {
  const base = siteUrl();
  const paths = opts.paths ?? await defaultScanPaths();
  const urls = paths.slice(0, SCAN_PATHS_BUDGET).map((p) => `${base}${p}`);

  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();
  const missingTitle: string[] = [];
  const missingDesc: string[] = [];
  const errors: DuplicateReport['errors'] = [];

  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const i = cursor++;
      const u = urls[i]!;
      try {
        const res = await fetch(u, {
          headers: { 'User-Agent': 'CineCanonDupScan/1.0' },
          cache: 'no-store',
        });
        if (!res.ok) {
          errors.push({ url: u, error: `HTTP ${res.status}` });
          continue;
        }
        const html = await res.text();
        const title = extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
        const desc = extractAttr(html, /<meta\s+[^>]*?name=["']description["'][^>]*?content=["']([^"']*)["']/i)
                  ?? extractAttr(html, /<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?name=["']description["']/i);

        if (!title) missingTitle.push(u);
        else {
          if (!titleMap.has(title)) titleMap.set(title, []);
          titleMap.get(title)!.push(u);
        }

        if (!desc) missingDesc.push(u);
        else {
          if (!descMap.has(desc)) descMap.set(desc, []);
          descMap.get(desc)!.push(u);
        }
      } catch (err) {
        errors.push({ url: u, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const titleDuplicates: DuplicateGroup[] = [...titleMap.entries()]
    .filter(([, urls]) => urls.length >= 2)
    .map(([value, urls]) => ({ value, urls }))
    .sort((a, b) => b.urls.length - a.urls.length);
  const descriptionDuplicates: DuplicateGroup[] = [...descMap.entries()]
    .filter(([, urls]) => urls.length >= 2)
    .map(([value, urls]) => ({ value, urls }))
    .sort((a, b) => b.urls.length - a.urls.length);

  return {
    ranAt: new Date().toISOString(),
    urlsScanned: urls.length,
    titleDuplicates,
    descriptionDuplicates,
    missingTitleUrls: missingTitle,
    missingDescriptionUrls: missingDesc,
    errors,
  };
}

/** Default scan set: top index pages + 60 curated film URLs from the DB. */
async function defaultScanPaths(): Promise<string[]> {
  const paths: string[] = [
    '/', '/films', '/crew', '/gear', '/vfx',
    '/sound', '/music', '/stunts', '/awards',
    '/references', '/methodology', '/about',
    '/queries', '/ask', '/tools', '/dossiers',
    '/walkthroughs', '/decisions', '/partnerships',
  ];
  try {
    const rows = await db.execute<{ slug: string }>(sql`
      SELECT slug FROM productions
      WHERE data_tier = 'curated'
      ORDER BY release_year DESC NULLS LAST
      LIMIT 60
    `);
    paths.push(...rows.map((r) => `/films/${r.slug}`));
  } catch {
    // DB unavailable — fall back to index pages only
  }
  return paths;
}

function extractTag(html: string, re: RegExp): string | null {
  const m = html.match(re);
  if (!m) return null;
  return m[1]!.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null;
}

function extractAttr(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m?.[1]?.trim() || null;
}
