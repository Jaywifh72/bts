import { NextResponse, type NextRequest } from 'next/server';
import { db, sql } from '@bts/db';
import { siteUrl } from '@/lib/site';

/**
 * CineCanon-Sentinel — public Citation Precision feed.
 *
 * Reads from `aeo_daily_metrics` (migration 0091). Returns the
 * CineCanon-scoped daily aggregates for the last N days (default 7).
 *
 * Until Hermes runs its first cycle the table is empty and the
 * response is `{ metrics: [] }`. This is intentional — the endpoint
 * is stable from day one so consumers can build against it.
 *
 * CC-BY 4.0. Edge-cached.
 */
export const runtime = 'nodejs';

type Row = {
  metric_date: string;
  engine_id: string | null;
  scope: string;
  topical_cluster: string | null;
  page_url: string | null;
  precision_mean: string | null;
  precision_ci_lo: string | null;
  precision_ci_hi: string | null;
  share_of_answer: string | null;
  n_observations: number;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = clampInt(url.searchParams.get('days'), 1, 90, 7);

  const rows = await db.execute<Row>(sql`
    SELECT
      metric_date::text   AS metric_date,
      engine_id::text     AS engine_id,
      scope,
      topical_cluster,
      page_url,
      precision_mean::text,
      precision_ci_lo::text,
      precision_ci_hi::text,
      share_of_answer::text,
      n_observations
    FROM aeo_daily_metrics
    WHERE scope = 'cinecanon'
      AND metric_date >= (CURRENT_DATE - (${days} || ' days')::interval)
    ORDER BY metric_date DESC, page_url NULLS LAST
    LIMIT 5000
  `);

  return NextResponse.json(
    {
      metrics: rows,
      window_days: days,
      _meta: {
        license: 'CC-BY 4.0',
        attribution: `Data courtesy of CineCanon (${siteUrl()})`,
        api_version: 'v1',
        notes: 'Empty array until the AEO observatory has run at least one cycle.',
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
