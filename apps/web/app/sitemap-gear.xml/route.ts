import { db, listManufacturers, listAllGearPaths } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { buildSitemap, xmlResponse, type SitemapEntry } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  const [manufacturers, gearPaths] = await Promise.all([
    listManufacturers(db),
    listAllGearPaths(db),
  ]);
  const seriesPaths = new Set<string>();
  for (const g of gearPaths) {
    seriesPaths.add(`${g.manufacturer_slug}/${g.series_slug}`);
  }
  const entries: SitemapEntry[] = [
    ...manufacturers.map((m) => ({
      loc: `${base}/gear/${m.slug}`,
      lastmod: now,
      changefreq: 'monthly' as const,
      priority: 0.6,
    })),
    ...[...seriesPaths].map((path) => ({
      loc: `${base}/gear/${path}`,
      lastmod: now,
      changefreq: 'monthly' as const,
      priority: 0.6,
    })),
    ...gearPaths.map((g) => ({
      loc: `${base}/gear/${g.manufacturer_slug}/${g.series_slug}/${g.item_slug}`,
      lastmod: now,
      changefreq: 'monthly' as const,
      priority: 0.5,
    })),
  ];
  return xmlResponse(buildSitemap(entries));
}
