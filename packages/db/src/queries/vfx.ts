import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type VfxHouseListOptions = {
  /** When true, hides houses with zero credits. Default true. */
  withCreditsOnly?: boolean;
};

export async function listVfxHouses(
  db: SeedDb = defaultDb,
  opts: VfxHouseListOptions = {},
) {
  const withCreditsOnly = opts.withCreditsOnly ?? true;
  return db.execute<{
    slug: string;
    name: string;
    country: string | null;
    founded_year: number | null;
    website: string | null;
    kind: string | null;
    tagline: string | null;
    summary: string | null;
    headquarters: string | null;
    production_count: number;
    primary_count: number;
    total_shots: number | null;
  }>(sql`
    SELECT vh.slug, vh.name, vh.country, vh.founded_year, vh.website,
           vh.kind::text AS kind,
           vh.tagline, vh.summary, vh.headquarters,
           COUNT(DISTINCT vc.production_id)::int AS production_count,
           COUNT(DISTINCT CASE WHEN vc.role = 'primary' THEN vc.production_id END)::int AS primary_count,
           SUM(vc.shot_count)::int AS total_shots
    FROM vfx_houses vh
    LEFT JOIN vfx_credits vc ON vc.vfx_house_id = vh.id
    GROUP BY vh.id
    HAVING ${withCreditsOnly ? sql`COUNT(DISTINCT vc.production_id) > 0` : sql`TRUE`}
    ORDER BY production_count DESC, vh.name ASC
  `);
}

export async function getVfxHouseWithFilmography(db: SeedDb = defaultDb, slug: string) {
  const [house] = await db.execute<{
    id: number;
    slug: string;
    name: string;
    country: string | null;
    founded_year: number | null;
    website: string | null;
    summary: string | null;
    headquarters: string | null;
    parent_company: string | null;
    employee_count: number | null;
    tagline: string | null;
    careers_url: string | null;
    reel_url: string | null;
    references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
    total_productions: number;
    primary_credits: number;
    total_shots: number | null;
    // 0060 — entity-level provenance.
    data_tier: 'curated' | 'imported';
    curated_by: string | null;
    curated_by_url: string | null;
    last_curated_review: string | null;
    last_verified_at: string | null;
  }>(sql`
    SELECT
      vh.id, vh.slug, vh.name, vh.country, vh.founded_year, vh.website,
      vh.summary, vh.headquarters, vh.parent_company, vh.employee_count,
      vh.tagline, vh.careers_url, vh.reel_url, vh."references",
      vh.data_tier, vh.curated_by, vh.curated_by_url,
      vh.last_curated_review::text, vh.last_verified_at::text,
      COUNT(DISTINCT vc.production_id)::int AS total_productions,
      COUNT(DISTINCT CASE WHEN vc.role = 'primary' THEN vc.production_id END)::int AS primary_credits,
      SUM(vc.shot_count) AS total_shots
    FROM vfx_houses vh
    LEFT JOIN vfx_credits vc ON vc.vfx_house_id = vh.id
    WHERE vh.slug = ${slug}
    GROUP BY vh.id
  `);
  if (!house) return null;

  const [filmography, techniques, offices, highlights] = await Promise.all([
    db.execute<{
      production_slug: string;
      production_title: string;
      release_year: number | null;
      role: string;
      shot_count: number | null;
      poster_path: string | null;
    }>(sql`
      SELECT p.slug AS production_slug, p.title AS production_title,
             p.release_year, vc.role, vc.shot_count, p.poster_path
      FROM vfx_credits vc
      JOIN productions p ON p.id = vc.production_id
      WHERE vc.vfx_house_id = ${house.id}
      ORDER BY p.release_year DESC NULLS LAST, p.title ASC
    `),

    db.execute<{ slug: string; name: string; category: string }>(sql`
      SELECT DISTINCT vt.slug, vt.name, vt.category
      FROM production_vfx_techniques pvt
      JOIN vfx_techniques vt ON vt.id = pvt.technique_id
      JOIN vfx_credits vc ON vc.production_id = pvt.production_id
      WHERE vc.vfx_house_id = ${house.id}
      ORDER BY vt.category, vt.name
    `),

    db.execute<{ city: string; country: string | null; is_headquarters: boolean; sort_order: number }>(sql`
      SELECT city, country, is_headquarters, sort_order
      FROM vfx_house_offices
      WHERE vfx_house_id = ${house.id}
      ORDER BY is_headquarters DESC, sort_order, city
    `),

    db.execute<{
      production_slug: string;
      production_title: string;
      release_year: number | null;
      poster_path: string | null;
      editorial_note: string;
      sort_order: number;
    }>(sql`
      SELECT p.slug AS production_slug, p.title AS production_title,
             p.release_year, p.poster_path,
             vhh.editorial_note, vhh.sort_order
      FROM vfx_house_highlights vhh
      JOIN productions p ON p.id = vhh.production_id
      WHERE vhh.vfx_house_id = ${house.id}
      ORDER BY vhh.sort_order, p.release_year DESC NULLS LAST
    `),
  ]);

  return { house, filmography, techniques, offices, highlights };
}

export async function getProductionVfxData(db: SeedDb = defaultDb, productionId: number) {
  const [credits, techniques] = await Promise.all([
    db.execute<{
      vfx_house_slug: string;
      vfx_house_name: string;
      vfx_house_kind: string | null;
      role: string;
      shot_count: number | null;
      notes: string | null;
    }>(sql`
      SELECT vh.slug AS vfx_house_slug, vh.name AS vfx_house_name,
             vh.kind AS vfx_house_kind,
             vc.role, vc.shot_count, vc.notes
      FROM vfx_credits vc
      JOIN vfx_houses vh ON vh.id = vc.vfx_house_id
      WHERE vc.production_id = ${productionId}
      ORDER BY CASE vc.role
        WHEN 'primary' THEN 1
        WHEN 'special_sequences' THEN 2
        WHEN 'additional' THEN 3
        WHEN 'miniatures' THEN 4
        WHEN 'previsualization' THEN 5
      END, vh.name
    `),

    db.execute<{ slug: string; name: string; category: string }>(sql`
      SELECT vt.slug, vt.name, vt.category
      FROM production_vfx_techniques pvt
      JOIN vfx_techniques vt ON vt.id = pvt.technique_id
      WHERE pvt.production_id = ${productionId}
      ORDER BY vt.category, vt.name
    `),
  ]);

  return { credits, techniques };
}
