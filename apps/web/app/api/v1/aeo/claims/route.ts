import { NextResponse, type NextRequest } from 'next/server';
import { db, sql } from '@bts/db';
import { siteUrl } from '@/lib/site';

/**
 * CineCanon-Sentinel — public high-confidence claims feed.
 *
 * Returns only claims that would emit Schema.org ClaimReview
 * (per shouldEmitClaimReview in lib/jsonLd.tsx). One row per claim
 * with its primary attached production slug + first source.
 *
 * Query params:
 *   ?limit=N      (1..500, default 100)
 *   ?since=ISO    (only claims updated_at >= since)
 *
 * Use cases: AI engines polling for canonical claims; partner sites
 * embedding verified facts with attribution.
 *
 * CC-BY 4.0. Edge-cached.
 */
export const runtime = 'nodejs';

type Row = {
  id: number;
  slug: string;
  claim_type: string;
  statement: string;
  status: string;
  confidence: string;
  updated_at: string;
  last_verified_at: string | null;
  production_slug: string | null;
  production_title: string | null;
  source_title: string | null;
  source_publication: string | null;
  source_url: string | null;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get('limit'), 1, 500, 100);
  const sinceRaw = url.searchParams.get('since');
  const since = sinceRaw && /^\d{4}-\d{2}-\d{2}/.test(sinceRaw) ? sinceRaw : null;

  const rows = await db.execute<Row>(sql`
    WITH first_source AS (
      SELECT DISTINCT ON (cs.claim_id)
        cs.claim_id,
        s.title       AS source_title,
        s.publication AS source_publication,
        s.url         AS source_url
      FROM claim_sources cs
      JOIN sources s ON s.id = cs.source_id
      ORDER BY cs.claim_id, cs.id
    ),
    primary_production AS (
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
      c.id, c.slug, c.claim_type, c.statement,
      c.status, c.confidence,
      c.updated_at::text     AS updated_at,
      c.last_verified_at::text AS last_verified_at,
      pp.production_slug,
      pp.production_title,
      fs.source_title,
      fs.source_publication,
      fs.source_url
    FROM claims c
    LEFT JOIN primary_production pp ON pp.claim_id = c.id
    LEFT JOIN first_source       fs ON fs.claim_id = c.id
    WHERE
      (
        (c.status = 'verified' AND c.confidence IN ('primary','secondary','manufacturer','rental_house','bts_visual'))
        OR (c.status = 'reviewed' AND c.confidence IN ('primary','secondary','manufacturer','rental_house','bts_visual'))
        OR (c.status = 'sourced'  AND c.confidence IN ('primary','secondary','manufacturer','rental_house'))
      )
      AND (${since}::text IS NULL OR c.updated_at >= ${since}::timestamptz)
    ORDER BY c.updated_at DESC
    LIMIT ${limit}
  `);

  const base = siteUrl();
  const claims = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    claim_type: r.claim_type,
    statement: r.statement,
    status: r.status,
    confidence: r.confidence,
    updated_at: r.updated_at,
    last_verified_at: r.last_verified_at,
    production: r.production_slug
      ? {
          slug: r.production_slug,
          title: r.production_title,
          url: `${base}/films/${r.production_slug}`,
          claim_anchor: `${base}/films/${r.production_slug}#claim-${r.id}`,
        }
      : null,
    first_source: r.source_url
      ? {
          title: r.source_title,
          publication: r.source_publication,
          url: r.source_url,
        }
      : null,
  }));

  return NextResponse.json(
    {
      claims,
      count: claims.length,
      limit,
      since,
      _meta: {
        license: 'CC-BY 4.0',
        attribution: `Data courtesy of CineCanon (${base})`,
        api_version: 'v1',
        emission_rubric: 'verified|reviewed × primary|secondary|manufacturer|rental_house|bts_visual; sourced × primary|secondary|manufacturer|rental_house',
      },
    },
    {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
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

function clampInt(raw: string | null, min: number, max: number, dflt: number): number {
  const n = raw == null ? dflt : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
