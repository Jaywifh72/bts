import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * T2-3 — list every post house with a credit count. Defaults to hiding
 * empties (mirrors VFX house behavior).
 */
export async function listPostHouses(
  db: SeedDb = defaultDb,
  opts: { withCreditsOnly?: boolean; kinds?: string[]; limit?: number } = {},
) {
  const withCreditsOnly = opts.withCreditsOnly ?? true;
  const limit = opts.limit ?? 200;
  const kindFilter = opts.kinds && opts.kinds.length > 0
    ? sql`AND ph.kind::text = ANY(${`{${opts.kinds.join(',')}}`}::text[])`
    : sql``;
  return db.execute<{
    slug: string;
    name: string;
    kind: string;
    country: string | null;
    city: string | null;
    production_count: number;
  }>(sql`
    SELECT ph.slug, ph.name, ph.kind::text, ph.country, ph.city,
           COUNT(DISTINCT pph.production_id)::int AS production_count
    FROM post_houses ph
    LEFT JOIN production_post_houses pph ON pph.post_house_id = ph.id
    WHERE TRUE ${kindFilter}
    GROUP BY ph.id
    HAVING ${withCreditsOnly ? sql`COUNT(DISTINCT pph.production_id) > 0` : sql`TRUE`}
    ORDER BY production_count DESC, ph.name ASC
    LIMIT ${limit}
  `);
}

/**
 * Detail-page lookup. Returns NULL when the slug doesn't match.
 */
export async function getPostHouseBySlug(
  db: SeedDb = defaultDb,
  slug: string,
) {
  const rows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    kind: string;
    country: string | null;
    city: string | null;
    website: string | null;
    founded_year: number | null;
    description: string | null;
    atmos_certified: boolean;
    dolby_premier_certified: boolean;
    imax_certified: boolean;
    mix_room_count: number | null;
    hdr_grading: boolean;
    spec_notes: string | null;
    // 0082 editorial parity.
    summary: string | null;
    tagline: string | null;
    headquarters: string | null;
    parent_company: string | null;
    employee_count: number | null;
    careers_url: string | null;
    reel_url: string | null;
    wikidata_id: string | null;
    references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
    curated_by: string | null;
    curated_by_url: string | null;
    last_verified_at: string | null;
    production_count: number;
  }>(sql`
    SELECT ph.id, ph.slug, ph.name, ph.kind::text, ph.country, ph.city,
           ph.website, ph.founded_year, ph.description,
           -- 0079 spec columns — projected as defaults until migration applies.
           FALSE AS atmos_certified, FALSE AS dolby_premier_certified,
           FALSE AS imax_certified, NULL::int AS mix_room_count,
           FALSE AS hdr_grading, NULL::text AS spec_notes,
           -- 0082 editorial-parity columns — projected as NULL until migration applies.
           NULL::text AS summary, NULL::text AS tagline,
           NULL::text AS headquarters, NULL::text AS parent_company,
           NULL::int  AS employee_count, NULL::text AS careers_url,
           NULL::text AS reel_url, NULL::text AS wikidata_id,
           '[]'::jsonb AS references,
           NULL::text AS curated_by, NULL::text AS curated_by_url,
           NULL::text AS last_verified_at,
           (SELECT COUNT(DISTINCT pph.production_id)::int
              FROM production_post_houses pph
             WHERE pph.post_house_id = ph.id) AS production_count
    FROM post_houses ph
    WHERE ph.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

/**
 * Productions credited at a post house. Used by the detail-page
 * filmography panel; one row per (production, role) so a film that
 * uses the same house for both DI and sound mix appears twice (with
 * different `role`).
 */
export async function listProductionsForPostHouse(
  db: SeedDb = defaultDb,
  postHouseId: number,
  limit: number = 200,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    role: string;
    notes: string | null;
  }>(sql`
    SELECT p.slug, p.title, p.release_year, p.poster_path,
           pph.role::text AS role, pph.notes
    FROM production_post_houses pph
    JOIN productions p ON p.id = pph.production_id
    WHERE pph.post_house_id = ${postHouseId}
    ORDER BY p.release_year DESC NULLS LAST, p.title, pph.role
    LIMIT ${limit}
  `);
}

/**
 * Post-house roles for a single production. Used by the production
 * detail page to surface DI / color / sound mix credits.
 */
export async function getProductionPostHouses(
  db: SeedDb = defaultDb,
  productionId: number,
) {
  return db.execute<{
    slug: string;
    name: string;
    kind: string;
    role: string;
    notes: string | null;
  }>(sql`
    SELECT ph.slug, ph.name, ph.kind, pph.role, pph.notes
    FROM production_post_houses pph
    JOIN post_houses ph ON ph.id = pph.post_house_id
    WHERE pph.production_id = ${productionId}
    ORDER BY pph.role, ph.name
  `);
}
