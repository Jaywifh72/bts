import { db, listDigestProductions } from '@bts/db';
import { absoluteUrl, siteUrl } from '@/lib/site';

/**
 * T9-6 — weekly digest as an Atom 1.0 feed.
 *
 * RSS first (per the plan); a mailer integration can wrap this same
 * content later. Atom over RSS 2.0 because Atom has better-defined
 * timestamps and updated semantics.
 *
 * Cached at the edge for an hour — the feed only refreshes when a curator
 * bumps `last_verified_at` on a production, which is on the order of
 * once a day.
 */
export const revalidate = 3600;

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const items = await listDigestProductions(db, 5);
  const base = siteUrl();
  const updated = items[0]?.last_verified_at ?? new Date().toISOString();

  const entries = items
    .map((p) => {
      const link = absoluteUrl(`/films/${p.slug}`);
      const title = p.release_year ? `${p.title} (${p.release_year})` : p.title;
      const summary = p.synopsis ?? `Curated technical reference for ${p.title}.`;
      // Atom requires both `updated` and `id` — `id` should be a stable URI.
      return `  <entry>
    <title>${escape(title)}</title>
    <link rel="alternate" href="${escape(link)}"/>
    <id>${escape(link)}</id>
    <updated>${new Date(p.last_verified_at).toISOString()}</updated>
    <summary>${escape(summary)}</summary>
  </entry>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Studio Pro — Weekly digest</title>
  <subtitle>Newly curated productions with full crew and equipment data.</subtitle>
  <link rel="self" href="${escape(absoluteUrl('/digest.xml'))}"/>
  <link rel="alternate" href="${escape(base)}"/>
  <id>${escape(base)}/</id>
  <updated>${new Date(updated).toISOString()}</updated>
${entries}
</feed>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
