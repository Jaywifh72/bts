import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

// ── Manufacturers ──────────────────────────────────────────────────────────────

export async function listManufacturers(db: SeedDb = defaultDb) {
  return db.execute<{
    slug: string; name: string; kind: string; country: string | null;
    description: string | null; series_count: number;
  }>(sql`
    SELECT em.slug, em.name, em.kind, em.country, em.description,
           COUNT(es.id)::int AS series_count
    FROM equipment_manufacturers em
    LEFT JOIN equipment_series es ON es.manufacturer_id = em.id
    GROUP BY em.id ORDER BY em.name ASC
  `);
}

export async function getManufacturerBySlug(db: SeedDb = defaultDb, slug: string) {
  const [manufacturer] = await db.execute<{
    slug: string; name: string; kind: string; country: string | null;
    founded_year: number | null; website: string | null; description: string | null;
  }>(sql`
    SELECT slug, name, kind, country, founded_year, website, description
    FROM equipment_manufacturers WHERE slug = ${slug}
  `);
  if (!manufacturer) return null;

  const series = await db.execute<{
    slug: string; name: string; category: string;
    year_introduced: number | null; year_discontinued: number | null;
    description: string | null; item_count: number;
  }>(sql`
    SELECT es.slug, es.name, es.category, es.year_introduced, es.year_discontinued,
           es.description, COUNT(ei.id)::int AS item_count
    FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    LEFT JOIN equipment_items ei ON ei.series_id = es.id
    WHERE em.slug = ${slug}
    GROUP BY es.id ORDER BY es.category, es.name
  `);

  return { manufacturer, series };
}

// ── Series ─────────────────────────────────────────────────────────────────────

export async function listSeriesByManufacturer(db: SeedDb = defaultDb, manufacturerSlug: string) {
  return db.execute<{ slug: string }>(sql`
    SELECT es.slug FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE em.slug = ${manufacturerSlug}
  `);
}

export async function getSeriesBySlug(db: SeedDb = defaultDb, seriesSlug: string) {
  const [series] = await db.execute<{
    id: number; slug: string; name: string; category: string;
    year_introduced: number | null; year_discontinued: number | null;
    description: string | null; manufacturer_slug: string; manufacturer_name: string;
  }>(sql`
    SELECT es.id, es.slug, es.name, es.category, es.year_introduced, es.year_discontinued,
           es.description, em.slug AS manufacturer_slug, em.name AS manufacturer_name
    FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE es.slug = ${seriesSlug}
  `);
  if (!series) return null;

  const [items, usedOn] = await Promise.all([
    db.execute<{
      slug: string; name: string; status: string;
      year_introduced: number | null; specs: unknown;
    }>(sql`
      SELECT slug, name, status, year_introduced, specs
      FROM equipment_items WHERE series_id = ${series.id}
      ORDER BY name
    `),
    db.execute<{ production_slug: string; production_title: string; release_year: number | null }>(sql`
      SELECT DISTINCT p.slug AS production_slug, p.title AS production_title, p.release_year
      FROM equipment_usage eu
      JOIN scenes sc ON sc.id = eu.scene_id
      JOIN productions p ON p.id = sc.production_id
      WHERE eu.equipment_series_id = ${series.id}
      ORDER BY p.release_year DESC NULLS LAST
    `),
  ]);

  return { series, items, usedOn };
}

/**
 * Cross-reference: camera crew who worked on productions where the given
 * series was used in any scene.
 *
 * Restricted to category='camera' roles. Grain: one row per (person, role)
 * pair. Ordered by production_count DESC so the most-frequent users surface
 * first.
 */
export async function getCrewForSeries(db: SeedDb = defaultDb, seriesSlug: string) {
  return db.execute<{
    person_slug: string;
    display_name: string;
    role_slug: string;
    role_name: string;
    role_category: string;
    production_count: number;
    scene_count: number;
  }>(sql`
    SELECT
      p.slug AS person_slug, p.display_name,
      r.slug AS role_slug, r.name AS role_name, r.category AS role_category,
      COUNT(DISTINCT sc.production_id)::int AS production_count,
      COUNT(DISTINCT sc.id)::int AS scene_count
    FROM equipment_series es
    JOIN equipment_usage eu ON eu.equipment_series_id = es.id
    JOIN scenes sc ON sc.id = eu.scene_id
    JOIN crew_assignments ca ON ca.production_id = sc.production_id
    JOIN people p ON p.id = ca.person_id
    JOIN roles r ON r.id = ca.role_id
    WHERE es.slug = ${seriesSlug}
      AND r.category = 'camera'
    GROUP BY p.slug, p.display_name, r.slug, r.name, r.category
    ORDER BY production_count DESC, scene_count DESC, p.display_name
  `);
}

/**
 * Same shape as getCrewForSeries but filtered to a single equipment item.
 * Useful for the per-item detail page where the question is "who has shot on
 * this specific lens / body".
 */
export async function getCrewForItem(db: SeedDb = defaultDb, itemSlug: string) {
  return db.execute<{
    person_slug: string;
    display_name: string;
    role_slug: string;
    role_name: string;
    role_category: string;
    production_count: number;
    scene_count: number;
  }>(sql`
    SELECT
      p.slug AS person_slug, p.display_name,
      r.slug AS role_slug, r.name AS role_name, r.category AS role_category,
      COUNT(DISTINCT sc.production_id)::int AS production_count,
      COUNT(DISTINCT sc.id)::int AS scene_count
    FROM equipment_items ei
    JOIN equipment_usage eu ON eu.equipment_item_id = ei.id
    JOIN scenes sc ON sc.id = eu.scene_id
    JOIN crew_assignments ca ON ca.production_id = sc.production_id
    JOIN people p ON p.id = ca.person_id
    JOIN roles r ON r.id = ca.role_id
    WHERE ei.slug = ${itemSlug}
      AND r.category = 'camera'
    GROUP BY p.slug, p.display_name, r.slug, r.name, r.category
    ORDER BY production_count DESC, scene_count DESC, p.display_name
  `);
}

/**
 * Returns every (manufacturer, series, item) slug triple in the catalog.
 * Items appear once per row. Pure read for sitemap and similar bulk URL
 * enumeration — does not include any aggregates or related data.
 */
export async function listAllGearPaths(db: SeedDb = defaultDb) {
  return db.execute<{
    manufacturer_slug: string;
    series_slug: string;
    item_slug: string;
  }>(sql`
    SELECT
      em.slug AS manufacturer_slug,
      es.slug AS series_slug,
      ei.slug AS item_slug
    FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    ORDER BY em.slug, es.slug, ei.slug
  `);
}

// ── Items ──────────────────────────────────────────────────────────────────────

export async function listItemsBySeries(db: SeedDb = defaultDb, seriesSlug: string) {
  return db.execute<{ slug: string }>(sql`
    SELECT ei.slug FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    WHERE es.slug = ${seriesSlug}
  `);
}

export async function getItemBySlug(db: SeedDb = defaultDb, itemSlug: string) {
  const [item] = await db.execute<{
    slug: string; name: string; model_number: string | null; status: string;
    year_introduced: number | null; year_discontinued: number | null;
    specs: unknown; series_slug: string; series_name: string;
    series_category: string; manufacturer_slug: string; manufacturer_name: string;
  }>(sql`
    SELECT ei.slug, ei.name, ei.model_number, ei.status,
           ei.year_introduced, ei.year_discontinued, ei.specs,
           es.slug AS series_slug, es.name AS series_name, es.category AS series_category,
           em.slug AS manufacturer_slug, em.name AS manufacturer_name
    FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE ei.slug = ${itemSlug}
  `);
  if (!item) return null;

  const usedOn = await db.execute<{
    production_slug: string; production_title: string; release_year: number | null;
    scene_title: string; setup_label: string | null;
  }>(sql`
    SELECT DISTINCT p.slug AS production_slug, p.title AS production_title,
                    p.release_year, sc.title AS scene_title, eu.setup_label
    FROM equipment_usage eu
    JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    JOIN scenes sc ON sc.id = eu.scene_id
    JOIN productions p ON p.id = sc.production_id
    WHERE ei.slug = ${itemSlug}
    ORDER BY p.release_year DESC NULLS LAST, p.title
  `);

  return { item, usedOn };
}
