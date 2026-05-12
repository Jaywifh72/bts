import { siteUrl } from '@/lib/site';

/**
 * E-42 — sitemap-index. Points at five segment-scoped sitemaps so
 * search engines can crawl them in parallel and we have headroom past
 * the per-sitemap 50k-URL limit.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

const SEGMENTS = ['core', 'films', 'crew', 'gear', 'vfx'] as const;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SEGMENTS.map((seg) => `  <sitemap>
    <loc>${base}/sitemap-${seg}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
