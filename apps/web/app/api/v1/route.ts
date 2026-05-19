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
        aeo_precision: {
          method: 'GET',
          path: `${base}/api/v1/aeo/precision?days={1..90}`,
          example: `${base}/api/v1/aeo/precision?days=7`,
          description: 'Daily Citation Precision metrics for CineCanon pages (from the CineCanon-Sentinel observatory). Empty until the first daily cycle has run.',
        },
        aeo_claims: {
          method: 'GET',
          path: `${base}/api/v1/aeo/claims?limit={1..500}&since={ISO}`,
          example: `${base}/api/v1/aeo/claims?limit=50`,
          description: 'High-confidence claims feed — only claims that would emit Schema.org ClaimReview. Includes production attribution and first source.',
        },
        aeo_digest_atom: {
          method: 'GET',
          path: `${base}/api/v1/aeo/digest.xml`,
          description: 'Atom 1.0 feed of the 50 most-recent high-confidence claims. Subscribe to canonical facts.',
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
