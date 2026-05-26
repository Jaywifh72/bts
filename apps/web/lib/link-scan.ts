// Broken-link scan: crawl priority pages, extract internal <a href>, HEAD-check each.
//
// Server-side only. Used by /admin/seo/links to surface 404s and other non-200
// destinations before Googlebot trips over them. Limits external requests via
// a fixed concurrency cap and a known-internal-only filter.

import { siteUrl } from './site';
import { PRIORITY_PATHS } from './seo-audit';
import { db, sql } from '@bts/db';

export type LinkCheck = {
  href: string;
  status: number;
  /** Page(s) where this link was found, deduped */
  foundOn: string[];
  ok: boolean;
  /** Net redirect target if any */
  finalUrl?: string;
};

export type LinkScanReport = {
  ranAt: string;
  pagesCrawled: number;
  linksDiscovered: number;
  linksChecked: number;
  broken: LinkCheck[];
  redirects: LinkCheck[];
  /** First 50 OK links (just for the "sample of the crawl" UI) */
  okSample: LinkCheck[];
  errors: Array<{ url: string; error: string }>;
};

const CONCURRENCY = 10;
const MAX_LINKS = 1500;

export async function scanInternalLinks(opts: {
  paths?: ReadonlyArray<string>;
} = {}): Promise<LinkScanReport> {
  const base = siteUrl();
  const baseOrigin = new URL(base).origin;
  const paths = opts.paths ?? PRIORITY_PATHS;
  const pages = paths.map((p) => `${base}${p}`);

  const errors: LinkScanReport['errors'] = [];
  const linkMap = new Map<string, Set<string>>(); // href → set of source pages

  // 1. Fetch each page and extract internal <a href=...>
  for (const pageUrl of pages) {
    try {
      const res = await fetch(pageUrl, {
        headers: { 'User-Agent': 'CineCanonLinkScan/1.0' },
        cache: 'no-store',
      });
      if (!res.ok) {
        errors.push({ url: pageUrl, error: `Page fetch returned ${res.status}` });
        continue;
      }
      const html = await res.text();
      for (const href of extractHrefs(html, pageUrl, baseOrigin)) {
        if (!linkMap.has(href)) linkMap.set(href, new Set());
        linkMap.get(href)!.add(pageUrl);
        if (linkMap.size >= MAX_LINKS) break;
      }
      if (linkMap.size >= MAX_LINKS) break;
    } catch (err) {
      errors.push({ url: pageUrl, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const allLinks = [...linkMap.entries()].map(([href, sources]) => ({
    href,
    foundOn: [...sources],
  }));

  // 2. HEAD-check each link with bounded concurrency
  const results: LinkCheck[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < allLinks.length) {
      const i = cursor++;
      const link = allLinks[i]!;
      try {
        const res = await fetch(link.href, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'CineCanonLinkScan/1.0' },
        });
        results.push({
          href: link.href,
          status: res.status,
          foundOn: link.foundOn,
          ok: res.status >= 200 && res.status < 300,
          finalUrl: res.url !== link.href ? res.url : undefined,
        });
      } catch (err) {
        results.push({
          href: link.href,
          status: 0,
          foundOn: link.foundOn,
          ok: false,
        });
        errors.push({ url: link.href, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const broken = results.filter((r) => !r.ok);
  const redirects = results.filter((r) => r.ok && r.finalUrl && r.finalUrl !== r.href);
  const okSample = results.filter((r) => r.ok && !r.finalUrl).slice(0, 50);

  return {
    ranAt: new Date().toISOString(),
    pagesCrawled: pages.length,
    linksDiscovered: linkMap.size,
    linksChecked: results.length,
    broken,
    redirects,
    okSample,
    errors,
  };
}

export type LinkScanRunRow = {
  id: string;
  ran_at: string;
  runtime_ms: number;
  pages_crawled: number;
  links_discovered: number;
  links_checked: number;
  ok_count: number;
  redirect_count: number;
  broken_count: number;
  hit_cap: boolean;
};

export async function persistLinkScan(
  report: LinkScanReport,
  runtimeMs: number,
): Promise<void> {
  const okCount = report.linksChecked - report.broken.length - report.redirects.length;
  const hitCap = report.linksDiscovered >= MAX_LINKS;
  try {
    await db.execute(sql`
      INSERT INTO seo_link_scan_runs
        (runtime_ms, pages_crawled, links_discovered, links_checked,
         ok_count, redirect_count, broken_count, hit_cap, report)
      VALUES (
        ${runtimeMs}, ${report.pagesCrawled}, ${report.linksDiscovered},
        ${report.linksChecked}, ${okCount}, ${report.redirects.length},
        ${report.broken.length}, ${hitCap}, ${JSON.stringify(report)}::jsonb
      )
    `);
  } catch {
    // Persistence is best-effort — never break the live scan UI on a DB hiccup.
  }
}

export async function listLinkScanRuns(limit = 20): Promise<LinkScanRunRow[]> {
  try {
    return await db.execute<LinkScanRunRow>(sql`
      SELECT id, ran_at::text AS ran_at, runtime_ms, pages_crawled,
             links_discovered, links_checked, ok_count, redirect_count,
             broken_count, hit_cap
      FROM seo_link_scan_runs
      ORDER BY ran_at DESC
      LIMIT ${limit}
    `);
  } catch {
    return [];
  }
}

/**
 * Pull internal-href attributes out of an HTML page.
 * - Resolves relative paths against the page URL
 * - Keeps only same-origin links
 * - Strips fragments (#claim-N etc.) so we don't HEAD-check anchor links
 * - Excludes /admin and known-noisy paths
 */
function extractHrefs(html: string, pageUrl: string, baseOrigin: string): Set<string> {
  const found = new Set<string>();
  const re = /<a\b[^>]*?href=["']([^"'#]+)(?:#[^"']*)?["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]!.trim();
    if (!raw) continue;
    if (raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
    let absolute: string;
    try {
      absolute = new URL(raw, pageUrl).href;
    } catch {
      continue;
    }
    if (!absolute.startsWith(baseOrigin)) continue;
    if (absolute.includes('/admin/')) continue;
    // strip trailing slash inconsistency
    if (absolute.endsWith('/') && absolute.length > baseOrigin.length + 1) {
      absolute = absolute.slice(0, -1);
    }
    found.add(absolute);
  }
  return found;
}
