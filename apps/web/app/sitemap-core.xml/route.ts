import { siteUrl } from '@/lib/site';
import { FORMAT_TAXONOMY } from '@/lib/formats';
import { buildSitemap, xmlResponse, type SitemapEntry } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  const entries: SitemapEntry[] = [
    { loc: base, lastmod: now, changefreq: 'weekly', priority: 1.0 },
    { loc: `${base}/films`, lastmod: now, changefreq: 'weekly', priority: 0.9 },
    { loc: `${base}/crew`, lastmod: now, changefreq: 'weekly', priority: 0.9 },
    { loc: `${base}/gear`, lastmod: now, changefreq: 'weekly', priority: 0.9 },
    { loc: `${base}/vfx`, lastmod: now, changefreq: 'weekly', priority: 0.9 },
    { loc: `${base}/stunts`, lastmod: now, changefreq: 'weekly', priority: 0.9 },
    { loc: `${base}/stunts/people`, lastmod: now, changefreq: 'weekly', priority: 0.85 },
    { loc: `${base}/stunts/sequences`, lastmod: now, changefreq: 'weekly', priority: 0.85 },
    { loc: `${base}/stunts/lineage`, lastmod: now, changefreq: 'weekly', priority: 0.8 },
    { loc: `${base}/stunts/rigging`, lastmod: now, changefreq: 'weekly', priority: 0.85 },
    { loc: `${base}/stunts/safety`, lastmod: now, changefreq: 'weekly', priority: 0.85 },
    { loc: `${base}/format`, lastmod: now, changefreq: 'monthly', priority: 0.8 },
    { loc: `${base}/ask`, lastmod: now, changefreq: 'monthly', priority: 0.7 },
    { loc: `${base}/tools`, lastmod: now, changefreq: 'monthly', priority: 0.7 },
    { loc: `${base}/tools/frame-lines`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/tools/loadout`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/tools/coverage`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/tools/aces`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/tools/cdl`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    ...FORMAT_TAXONOMY.map((f) => ({
      loc: `${base}/format/${f.slug}`,
      lastmod: now,
      changefreq: 'monthly' as const,
      priority: 0.7,
    })),
    { loc: `${base}/queries/alexa65-sphero`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/queries/dune-part-two-lenses`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${base}/queries/magic-hour-2023`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
  ];
  return xmlResponse(buildSitemap(entries));
}
