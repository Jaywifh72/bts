import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/site';

/**
 * T9-4 — API root: discovery doc + license terms. Lets consumers
 * point at /api/v1 and get a self-describing index.
 */
export const runtime = 'nodejs';

export async function GET() {
  const base = siteUrl();
  return NextResponse.json(
    {
      name: 'CineCanon API',
      version: 'v1',
      description: 'Read-only API for cinematic technical metadata.',
      license: 'CC-BY 4.0',
      attribution: `Data courtesy of CineCanon (${base})`,
      endpoints: {
        production: {
          method: 'GET',
          path: `${base}/api/v1/productions/{slug}`,
          example: `${base}/api/v1/productions/dune-part-two-2024`,
          description: 'Full production payload: production, formats, studios, crew, scenes, sources, vfx, videos, post houses.',
        },
        search_suggest: {
          method: 'GET',
          path: `${base}/api/search/suggest?q={query}`,
          description: 'Autocomplete search across films, crew, gear, scenes, videos, studios, VFX houses.',
        },
      },
      attribution_required: true,
      cors: 'enabled (Access-Control-Allow-Origin: *)',
    },
    {
      headers: {
        'Cache-Control': 's-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
