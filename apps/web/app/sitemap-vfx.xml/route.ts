import { db, listVfxHouses } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { buildSitemap, xmlResponse } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  const vfxHouses = await listVfxHouses(db);
  return xmlResponse(
    buildSitemap(
      vfxHouses.map((h) => ({
        loc: `${base}/vfx/${h.slug}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7,
      })),
    ),
  );
}
