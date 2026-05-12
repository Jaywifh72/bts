import { NextResponse, type NextRequest } from 'next/server';
import { db, getPersonBySlug, getPersonFilmography } from '@bts/db';
import type { CrewApiResponse } from '@/lib/api-contracts';

/**
 * Light public-API endpoint for crew detail. Backs the OG image route's
 * edge-runtime fetch + future external integrations. Same CC-BY +
 * 5-minute edge cache contract as /api/v1/productions/<slug>.
 */
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const [person, filmography] = await Promise.all([
    getPersonBySlug(db, params.slug),
    getPersonFilmography(db, params.slug),
  ]);
  if (!person) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const payload = {
    slug: person.slug,
    display_name: person.display_name,
    biography: person.biography,
    primary_role: filmography[0]?.role_name ?? null,
    country: person.nationality ?? null,
    birth_year: person.birth_year ?? null,
    death_year: person.death_year ?? null,
    imdb_id: person.imdb_id ?? null,
    tmdb_person_id: person.tmdb_person_id ?? null,
    wikidata_id: person.wikidata_id ?? null,
    filmography: filmography.map((f) => ({
      production_slug: f.production_slug,
      production_title: f.production_title,
      release_year: f.release_year,
      role_name: f.role_name,
      role_category: f.role_category,
    })),
    _meta: {
      license: 'CC BY 4.0 - please cite "Studio Pro" with a link back',
    },
  } satisfies CrewApiResponse;

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
