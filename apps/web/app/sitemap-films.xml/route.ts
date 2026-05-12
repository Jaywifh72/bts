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
  return xmlResponse(
    buildSitemap(
      productions.map((p) => ({
        loc: `${base}/films/${p.slug}`,
        lastmod: lastmodBySlug.get(p.slug) ?? now,
        changefreq: 'monthly',
        priority: 0.8,
      })),
    ),
  );
}
