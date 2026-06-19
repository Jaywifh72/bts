import { db, listPeople, type PersonListRow } from '@bts/db';
import { siteUrl } from '@/lib/site';
import { buildSitemap, xmlResponse } from '@/lib/sitemap-helpers';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const now = new Date().toISOString();
  // C1 fix (SEO/AEO/GEO audit 2026-06-18): Only include crew pages that are
  // actually indexable. The crew page's generateMetadata sets noindex,follow
  // when !(hasBio || credits>=8). Previously ALL ~12.4k crew URLs were listed
  // here — 94% were noindex, wasting crawl budget with contradictory signaling.
  //
  // We filter by credit_count >= 8 (matching the page's hasCredits threshold).
  // Bio-only people (bio ≥80 chars but <8 credits) are a rare edge case and
  // are still discoverable via internal links from film pages.
  const people = await listPeople(db, { limit: 50000 });
  const indexable = people.filter(
    (p: PersonListRow) => p.credit_count >= 8,
  );

  return xmlResponse(
    buildSitemap(
      indexable.map((p) => ({
        loc: `${base}/crew/${p.slug}`,
        lastmod: now,
        changefreq: 'monthly' as const,
        priority: 0.7,
      })),
    ),
  );
}
