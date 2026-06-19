import { db, listManufacturers, listAllGearPaths } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { buildSitemap, xmlResponse, type SitemapEntry } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  // H6 fix (SEO audit 2026-06-18): omit lastmod rather than emit a fake "now"
  // timestamp. Google trusts lastmod when it's real; a dynamic timestamp
  // degrades that trust. Films sitemap already uses real per-entity lastmod
  // via listProductionLastmods — gear/vfx DB queries don't expose updated_at
  // yet, so omitting is more honest than lying.
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
      changefreq: 'monthly' as const,
      priority: 0.6,
    })),
    ...[...seriesPaths].map((path) => ({
      loc: `${base}/gear/${path}`,
      changefreq: 'monthly' as const,
      priority: 0.6,
    })),
    ...gearPaths.map((g) => ({
      loc: `${base}/gear/${g.manufacturer_slug}/${g.series_slug}/${g.item_slug}`,
      changefreq: 'monthly' as const,
      priority: 0.5,
    })),
  ];
  return xmlResponse(buildSitemap(entries));
}
