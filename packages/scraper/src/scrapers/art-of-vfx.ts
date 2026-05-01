import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RawVfxBreakdown, RawVendor } from './types.ts';
import { matchProduction } from './matcher.ts';
import { db, sql } from '@bts/db';

const RAW_DIR = new URL('../../data/vfx-raw/', import.meta.url).pathname;
const UNMATCHED_DIR = path.join(RAW_DIR, 'unmatched');

/**
 * Discover the Art of VFX article URL for a given film title.
 * Uses the site's search: https://www.artofvfx.com/?s=<title>
 */
async function findArticleUrl(page: import('playwright').Page, title: string): Promise<string | null> {
  const searchUrl = `https://www.artofvfx.com/?s=${encodeURIComponent(title)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // First result link
  const link = await page.$('article a[href]');
  return link ? await link.getAttribute('href') : null;
}

/**
 * Parse vendor/shot data from an article page.
 * Art of VFX articles often have a structured table or bulleted list
 * of vendors with shot counts.
 */
async function parseArticle(page: import('playwright').Page, url: string): Promise<{
  total_shots: number | null;
  vendors: RawVendor[];
  techniques: string[];
  sequences: Array<{ name: string; vendor: string | null; notes: string | null }>;
}> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  const bodyText = await page.textContent('article') ?? await page.textContent('body') ?? '';

  // Extract total VFX shot count from patterns like "1,200 vfx shots" or "over 2000 shots"
  const totalMatch = bodyText.match(/(\d[\d,]*)\s+(?:vfx\s+)?shots?/i);
  const total_shots = totalMatch ? parseInt(totalMatch[1]!.replace(/,/g, ''), 10) : null;

  // Extract vendors: look for lines with company names and shot counts
  // Pattern: "Company Name: 450 shots" or "Company Name – 450 shots"
  const vendorMatches = [...bodyText.matchAll(
    /([A-Z][A-Za-z\s&]+?)(?:\s*[:\–\-]\s*)(\d[\d,]*)\s+shots?/g,
  )];

  const vendors: RawVendor[] = vendorMatches.slice(0, 20).map((m, i) => ({
    name: m[1]!.trim(),
    shots: parseInt(m[2]!.replace(/,/g, ''), 10),
    role: i === 0 ? 'primary' : 'additional',
  }));

  // Technique detection from article text
  const techniqueKeywords: Record<string, string> = {
    'de-aging': 'de-aging',
    'de-aged': 'de-aging',
    'motion capture': 'motion-capture',
    'mocap': 'motion-capture',
    'performance capture': 'performance-capture',
    'digital double': 'digital-double',
    'cg environment': 'cg-environment',
    'set extension': 'set-extension',
    'matte painting': 'matte-painting',
    'water simulation': 'water-simulation',
    'crowd replication': 'crowd-replication',
    'virtual production': 'virtual-production',
    'led volume': 'virtual-production',
  };
  const lowerBody = bodyText.toLowerCase();
  const techniques = [...new Set(
    Object.entries(techniqueKeywords)
      .filter(([kw]) => lowerBody.includes(kw))
      .map(([, slug]) => slug),
  )];

  // Extract sequence headings (h2/h3 elements often name sequences)
  const headings = await page.$$eval('article h2, article h3', (els) =>
    els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
  );
  const sequences = headings
    .filter((h) => !h.match(/^\d+$/) && h.length > 3)
    .slice(0, 20)
    .map((name) => ({ name, vendor: null, notes: null }));

  return { total_shots, vendors, techniques, sequences };
}

async function writeResult(breakdown: RawVfxBreakdown, matched: boolean) {
  const dir = matched ? RAW_DIR : UNMATCHED_DIR;
  await fs.mkdir(dir, { recursive: true });
  const filename = `${breakdown.production_slug || 'unknown'}--artofvfx.json`;
  await fs.writeFile(path.join(dir, filename), JSON.stringify(breakdown, null, 2));
  console.log(`  ${matched ? '✓' : '⚠ unmatched'} ${filename}`);
}

export async function scrapeArtOfVfx(slugFilter?: string) {
  const productions = slugFilter
    ? await db.execute<{ slug: string; title: string; release_year: number | null }>(sql`
        SELECT slug, title, release_year FROM productions WHERE slug = ${slugFilter}
      `)
    : await db.execute<{ slug: string; title: string; release_year: number | null }>(sql`
        SELECT slug, title, release_year FROM productions ORDER BY release_year DESC
      `);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const prod of productions) {
    console.log(`Scraping Art of VFX for: ${prod.title} (${prod.release_year ?? '?'})`);
    try {
      const articleUrl = await findArticleUrl(page, prod.title);
      if (!articleUrl) {
        console.log(`  No article found`);
        continue;
      }

      const { total_shots, vendors, techniques, sequences } = await parseArticle(page, articleUrl);

      const productionSlug = await matchProduction(prod.title, prod.release_year) ?? '';
      const matched = productionSlug !== '';

      const breakdown: RawVfxBreakdown = {
        source_url: articleUrl,
        source: 'artofvfx',
        production_slug: productionSlug || prod.slug,
        scraped_at: new Date().toISOString(),
        total_shots,
        vendors,
        techniques,
        sequences,
      };

      await writeResult(breakdown, matched);
      // Polite delay between requests
      await new Promise((r) => setTimeout(r, 2_000));
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await browser.close();
}
