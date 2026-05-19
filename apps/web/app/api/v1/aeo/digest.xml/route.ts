import { db, sql } from '@bts/db';
import { siteUrl } from '@/lib/site';

/**
 * CineCanon-Sentinel — Atom feed of the most recent high-confidence
 * claims. Lets AI engines subscribe to canonical facts without
 * polling JSON.
 *
 * Format: Atom 1.0. Limited to the 50 most-recent emittable claims.
 *
 * CC-BY 4.0. Edge-cached.
 */
export const runtime = 'nodejs';

type Row = {
  id: number;
  slug: string;
  statement: string;
  status: string;
  confidence: string;
  updated_at: string;
  production_slug: string | null;
  production_title: string | null;
};

export async function GET() {
  const rows = await db.execute<Row>(sql`
    WITH primary_production AS (
      SELECT DISTINCT ON (ce.claim_id)
        ce.claim_id,
        p.slug  AS production_slug,
        p.title AS production_title
      FROM claim_entities ce
      JOIN productions p ON p.id = ce.entity_id
      WHERE ce.entity_type = 'production'
      ORDER BY ce.claim_id, ce.id
    )
    SELECT
      c.id, c.slug, c.statement, c.status, c.confidence,
      c.updated_at::text AS updated_at,
      pp.production_slug, pp.production_title
    FROM claims c
    LEFT JOIN primary_production pp ON pp.claim_id = c.id
    WHERE
      (c.status = 'verified' AND c.confidence IN ('primary','secondary','manufacturer','rental_house','bts_visual'))
      OR (c.status = 'reviewed' AND c.confidence IN ('primary','secondary','manufacturer','rental_house','bts_visual'))
      OR (c.status = 'sourced'  AND c.confidence IN ('primary','secondary','manufacturer','rental_house'))
    ORDER BY c.updated_at DESC
    LIMIT 50
  `);

  const base = siteUrl();
  // Atom requires RFC 3339. Postgres `::text` cast emits "YYYY-MM-DD HH:MM:SS.ffffff+00"
  // — convert the space to T so the feed validates.
  const toRfc3339 = (s: string | null | undefined): string =>
    (s ?? new Date().toISOString()).replace(' ', 'T');
  const feedUpdated = toRfc3339(rows[0]?.updated_at);

  const entries = rows
    .map((r) => {
      const pageUrl = r.production_slug ? `${base}/films/${r.production_slug}` : base;
      const anchor = `${pageUrl}#claim-${r.id}`;
      return `  <entry>
    <id>${anchor}</id>
    <title>${xml(r.statement)}</title>
    <link href="${anchor}" rel="alternate" type="text/html"/>
    <updated>${toRfc3339(r.updated_at)}</updated>
    <category term="${xml(r.status)}"/>
    <category term="${xml(r.confidence)}"/>
    ${r.production_title ? `<summary>${xml(r.production_title)} — ${xml(r.statement)}</summary>` : `<summary>${xml(r.statement)}</summary>`}
    <author><name>CineCanon</name><uri>${base}</uri></author>
    <rights>CC-BY 4.0 — attribution required: Data courtesy of CineCanon</rights>
  </entry>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${base}/api/v1/aeo/digest.xml</id>
  <title>CineCanon — high-confidence claims digest</title>
  <subtitle>Verified, reviewed, and sourced editorial claims from CineCanon. CC-BY 4.0.</subtitle>
  <link href="${base}/api/v1/aeo/digest.xml" rel="self" type="application/atom+xml"/>
  <link href="${base}" rel="alternate" type="text/html"/>
  <updated>${feedUpdated}</updated>
  <rights>CC-BY 4.0 — Data courtesy of CineCanon</rights>
  <author><name>CineCanon</name><uri>${base}</uri></author>
${entries}
</feed>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
