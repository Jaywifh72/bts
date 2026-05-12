import { db, listPeople } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { buildSitemap, xmlResponse } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  const people = await listPeople(db);
  return xmlResponse(
    buildSitemap(
      people.map((p) => ({
        loc: `${base}/crew/${p.slug}`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7,
      })),
    ),
  );
}
