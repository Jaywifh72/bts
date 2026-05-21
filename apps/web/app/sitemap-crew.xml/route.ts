import { db, listPeople } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { buildSitemap, xmlResponse } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  // QA P2-3 2026-05-20: listPeople's default limit is 1000, which capped
  // the sitemap to 1k of ~12k indexed crew. Pass a generous explicit
  // ceiling so every crew detail page is discoverable. Bump if the
  // roster ever exceeds this.
  const people = await listPeople(db, { limit: 50000 });
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
