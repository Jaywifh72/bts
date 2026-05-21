import { db, listProductions, listProductionLastmods } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { buildSitemap, xmlResponse } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  const [productions, lastmods] = await Promise.all([
    listProductions(db),
    listProductionLastmods(db),
  ]);
  const lastmodBySlug = new Map(lastmods.map((l) => [l.slug, new Date(l.updated_at).toISOString()]));
  // QA 2026-05-20: listProductions can return duplicate slugs when a row
  // exists in multiple data tiers or got soft-merged — dedupe before emit
  // so crawlers don't waste budget on the same canonical URL twice.
  const seen = new Set<string>();
  const unique = productions.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
  return xmlResponse(
    buildSitemap(
      unique.map((p) => ({
        loc: `${base}/films/${p.slug}`,
        lastmod: lastmodBySlug.get(p.slug) ?? now,
        changefreq: 'monthly',
        priority: 0.8,
      })),
    ),
  );
}
