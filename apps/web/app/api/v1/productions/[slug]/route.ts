import { NextResponse, type NextRequest } from 'next/server';
import {
  db,
  getProductionWithFullDetail,
  getProductionVfxData,
  getProductionVideos,
  getProductionPostHouses,
} from '@bts/db';

/**
 * T9-4 — public read-only API. Returns the full production payload as
 * stable JSON. CC-BY attribution; rate-limited only by edge cache.
 *
 * Goal: rental house quoting tools, on-set apps, and journalists can
 * embed Studio Pro data programmatically — and cite us back.
 *
 * Stable contract:
 *   - All keys snake_case (matches DB column names)
 *   - tmdb_collection_id / wikidata_id let consumers join other sources
 *   - last_verified_at signals freshness
 *
 * 5-minute edge cache. Production deploys can layer a longer cache
 * upstream.
 */

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const [vfx, videos, postHouses] = await Promise.all([
    getProductionVfxData(db, data.production.id),
    getProductionVideos(db, data.production.id),
    getProductionPostHouses(db, data.production.id),
  ]);

  return NextResponse.json(
    {
      production: data.production,
      formats: data.formats,
      studios: data.studios,
      crew: data.crew,
      scenes: data.scenes,
      sources: data.productionSources,
      vfx,
      videos,
      post_houses: postHouses,
      _meta: {
        license: 'CC-BY 4.0',
        attribution: 'Data courtesy of Studio Pro (https://studiopro.example.com)',
        api_version: 'v1',
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
