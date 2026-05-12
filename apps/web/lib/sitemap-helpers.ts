/**
 * Shared helper for the sitemap-* route handlers — converts a list of
 * `<url>` entries to an XML body. Kept tiny and dep-free.
 */
export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: 'weekly' | 'monthly' | 'yearly';
  priority?: number;
};

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildSitemap(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((e) => {
    const parts = [`    <loc>${escape(e.loc)}</loc>`];
    if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
    if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
    if (e.priority !== undefined) parts.push(`    <priority>${e.priority}</priority>`);
    return `  <url>\n${parts.join('\n')}\n  </url>`;
  })
  .join('\n')}
</urlset>
`;
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
