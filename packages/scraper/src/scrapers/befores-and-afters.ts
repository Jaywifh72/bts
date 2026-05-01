import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RawVfxBreakdown, RawVendor } from './types.ts';
import { matchProduction } from './matcher.ts';
import { db, sql } from '@bts/db';

const RAW_DIR = new URL('../../data/vfx-raw/', import.meta.url).pathname;
const UNMATCHED_DIR = path.join(RAW_DIR, 'unmatched');

async function findArticleUrl(page: import('playwright').Page, title: string): Promise<string | null> {
  const searchUrl = `https://beforesandafters.com/?s=${encodeURIComponent(title)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const link = await page.$('h2.entry-title a, article a[href]');
  return link ? await link.getAttribute('href') : null;
}

async function parseArticle(page: import('playwright').Page, url: string): Promise<{
  total_shots: number | null;
  vendors: RawVendor[];
  techniques: string[];
  sequences: Array<{ name: string; vendor: string | null; notes: string | null }>;
}> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const bodyText = await page.textContent('.entry-content, article, body') ?? '';

  const totalMatch = bodyText.match(/(\d[\d,]*)\s+(?:vfx\s+)?shots?/i);
  const total_shots = totalMatch ? parseInt(totalMatch[1]!.replace(/,/g, ''), 10) : null;

  // B&A articles mention vendors more narratively — extract company names near shot counts
  const vendorMatches = [...bodyText.matchAll(
    /([A-Z][A-Za-z\s&]+?)\s+(?:handled|delivered|created|provided|worked on)\s+(?:approximately\s+)?(\d[\d,]*)\s+shots?/gi,
  )];

  const vendors: RawVendor[] = vendorMatches.slice(0, 20).map((m, i) => ({
    name: m[1]!.trim(),
    shots: parseInt(m[2]!.replace(/,/g, ''), 10),
    role: i === 0 ? 'primary' : 'additional',
  }));

  const techniqueKeywords: Record<string, string> = {
    'de-aging': 'de-aging', 'de-aged': 'de-aging',
    'motion capture': 'motion-capture', 'mocap': 'motion-capture',
    'digital double': 'digital-double',
    'cg environment': 'cg-environment', 'set extension': 'set-extension',
    'matte painting': 'matte-painting', 'water simulation': 'water-simulation',
    'crowd replication': 'crowd-replication',
    'virtual production': 'virtual-production', 'led volume': 'virtual-production',
    'performance capture': 'performance-capture',
  };
  const lowerBody = bodyText.toLowerCase();
  const techniques = [...new Set(
    Object.entries(techniqueKeywords)
      .filter(([kw]) => lowerBody.includes(kw))
      .map(([, slug]) => slug),
  )];

  const headings = await page.$$eval('.entry-content h2, .entry-content h3', (els) =>
    els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
  );
  const sequences = headings.slice(0, 20).map((name) => ({ name, vendor: null, notes: null }));

  return { total_shots, vendors, techniques, sequences };
}

async function writeResult(breakdown: RawVfxBreakdown, matched: boolean) {
  const dir = matched ? RAW_DIR : UNMATCHED_DIR;
  await fs.mkdir(dir, { recursive: true });
  const filename = `${breakdown.production_slug || 'unknown'}--beforesandafters.json`;
  await fs.writeFile(path.join(dir, filename), JSON.stringify(breakdown, null, 2));
  console.log(`  ${matched ? '✓' : '⚠ unmatched'} ${filename}`);
}

export async function scrapeBeforesAndAfters(slugFilter?: string) {
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
    console.log(`Scraping Befores & Afters for: ${prod.title}`);
    try {
      const articleUrl = await findArticleUrl(page, prod.title);
      if (!articleUrl) { console.log(`  No article found`); continue; }

      const { total_shots, vendors, techniques, sequences } = await parseArticle(page, articleUrl);
      const productionSlug = await matchProduction(prod.title, prod.release_year) ?? '';
      const matched = productionSlug !== '';

      const breakdown: RawVfxBreakdown = {
        source_url: articleUrl,
        source: 'beforesandafters',
        production_slug: productionSlug || prod.slug,
        scraped_at: new Date().toISOString(),
        total_shots,
        vendors,
        techniques,
        sequences,
      };

      await writeResult(breakdown, matched);
      await new Promise((r) => setTimeout(r, 2_000));
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await browser.close();
}
