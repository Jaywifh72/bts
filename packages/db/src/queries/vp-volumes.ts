import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type VpVolumeRow = {
  slug: string;
  name: string;
  facility_name: string | null;
  operator: string | null;
  country: string | null;
  city: string | null;
  led_brand: string | null;
  led_pitch_mm: string | null;
  wall_width_m: string | null;
  wall_height_m: string | null;
  ceiling_present: boolean;
  tracking_system: string | null;
  render_engine: string | null;
  completion_year: number | null;
  production_count: number;
};

export async function listVpVolumes(
  db: SeedDb = defaultDb,
  opts: { withCreditsOnly?: boolean; limit?: number } = {},
): Promise<VpVolumeRow[]> {
  const withCreditsOnly = opts.withCreditsOnly ?? false;
  const limit = opts.limit ?? 200;
  return db.execute<VpVolumeRow>(sql`
    SELECT v.slug, v.name, v.facility_name, v.operator, v.country, v.city,
           v.led_brand, v.led_pitch_mm::text, v.wall_width_m::text, v.wall_height_m::text,
           v.ceiling_present, v.tracking_system, v.render_engine, v.completion_year,
           COUNT(DISTINCT pv.production_id)::int AS production_count
    FROM vp_volumes v
    LEFT JOIN production_vp_volumes pv ON pv.volume_id = v.id
    GROUP BY v.id
    HAVING ${withCreditsOnly ? sql`COUNT(DISTINCT pv.production_id) > 0` : sql`TRUE`}
    ORDER BY production_count DESC, v.name
    LIMIT ${limit}
  `);
}

export async function getVpVolumeBySlug(db: SeedDb = defaultDb, slug: string) {
  const rows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    facility_name: string | null;
    operator: string | null;
    country: string | null;
    city: string | null;
    led_brand: string | null;
    led_pitch_mm: string | null;
    wall_width_m: string | null;
    wall_height_m: string | null;
    ceiling_present: boolean;
    ceiling_height_m: string | null;
    tracking_system: string | null;
    render_engine: string | null;
    color_pipeline: string | null;
    completion_year: number | null;
    atmos_capable: boolean;
    website_url: string | null;
    summary: string | null;
    production_count: number;
  }>(sql`
    SELECT v.id, v.slug, v.name, v.facility_name, v.operator, v.country, v.city,
           v.led_brand, v.led_pitch_mm::text, v.wall_width_m::text, v.wall_height_m::text,
           v.ceiling_present, v.ceiling_height_m::text,
           v.tracking_system, v.render_engine, v.color_pipeline,
           v.completion_year, v.atmos_capable, v.website_url, v.summary,
           (SELECT COUNT(*)::int FROM production_vp_volumes WHERE volume_id = v.id) AS production_count
    FROM vp_volumes v
    WHERE v.slug = ${slug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listProductionsForVpVolume(
  db: SeedDb = defaultDb,
  volumeId: number,
  limit: number = 200,
) {
  return db.execute<{
    slug: string;
    title: string;
    release_year: number | null;
    credited_use: string | null;
  }>(sql`
    SELECT p.slug, p.title, p.release_year, pv.credited_use
    FROM production_vp_volumes pv
    JOIN productions p ON p.id = pv.production_id
    WHERE pv.volume_id = ${volumeId}
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}
