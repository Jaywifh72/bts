import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

// ── Manufacturers ──────────────────────────────────────────────────────────────

export type ManufacturerListOptions = {
  /** When true, hides manufacturers that have no series. Default true. */
  withSeriesOnly?: boolean;
};

export async function listManufacturers(
  db: SeedDb = defaultDb,
  opts: ManufacturerListOptions = {},
) {
  const withSeriesOnly = opts.withSeriesOnly ?? true;
  return db.execute<{
    slug: string; name: string; kind: string; country: string | null;
    description: string | null; website: string | null; tagline: string | null;
    series_count: number; item_count: number;
  }>(sql`
    SELECT em.slug, em.name, em.kind::text, em.country, em.description, em.website, em.tagline,
           COUNT(DISTINCT es.id)::int AS series_count,
           COUNT(DISTINCT ei.id)::int AS item_count
    FROM equipment_manufacturers em
    LEFT JOIN equipment_series es ON es.manufacturer_id = em.id
    LEFT JOIN equipment_items ei ON ei.series_id = es.id
    GROUP BY em.id
    HAVING ${withSeriesOnly ? sql`COUNT(es.id) > 0` : sql`TRUE`}
    ORDER BY em.name ASC
  `);
}

/**
 * Aggregate counts for the gear index hero — one query, used by the
 * index page header to show the size of the catalog at a glance.
 */
export async function getGearArchiveStats(db: SeedDb = defaultDb) {
  const [row] = await db.execute<{
    manufacturers: number;
    rental_houses: number;
    series: number;
    items: number;
    cameras: number;
    lenses: number;
    lighting: number;
    filters: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM equipment_manufacturers WHERE kind = 'manufacturer') AS manufacturers,
      (SELECT COUNT(*)::int FROM equipment_manufacturers WHERE kind = 'rental_house') AS rental_houses,
      (SELECT COUNT(*)::int FROM equipment_series) AS series,
      (SELECT COUNT(*)::int FROM equipment_items) AS items,
      (SELECT COUNT(*)::int FROM equipment_items ei JOIN equipment_series es ON es.id = ei.series_id WHERE es.category = 'camera_body') AS cameras,
      (SELECT COUNT(*)::int FROM equipment_items ei JOIN equipment_series es ON es.id = ei.series_id WHERE es.category = 'lens_set') AS lenses,
      (SELECT COUNT(*)::int FROM equipment_items ei JOIN equipment_series es ON es.id = ei.series_id WHERE es.category = 'lighting_fixture') AS lighting,
      (SELECT COUNT(*)::int FROM equipment_items ei JOIN equipment_series es ON es.id = ei.series_id WHERE es.category = 'filter') AS filters
  `);
  return row ?? { manufacturers: 0, rental_houses: 0, series: 0, items: 0, cameras: 0, lenses: 0, lighting: 0, filters: 0 };
}

export async function getManufacturerBySlug(db: SeedDb = defaultDb, slug: string) {
  const [manufacturer] = await db.execute<{
    id: number;
    slug: string; name: string; kind: string; country: string | null;
    founded_year: number | null; website: string | null; description: string | null;
    summary: string | null; tagline: string | null; headquarters: string | null;
    parent_company: string | null; employee_count: number | null;
    references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
    total_items: number; total_productions: number; primary_credits: number;
  }>(sql`
    SELECT em.id, em.slug, em.name, em.kind::text, em.country,
           em.founded_year, em.website, em.description,
           em.summary, em.tagline, em.headquarters, em.parent_company,
           em.employee_count, em."references",
           (SELECT COUNT(*)::int FROM equipment_items ei
              JOIN equipment_series es ON es.id = ei.series_id
              WHERE es.manufacturer_id = em.id) AS total_items,
           (SELECT COUNT(DISTINCT sc.production_id)::int
              FROM equipment_usage eu
              JOIN equipment_series es ON es.id = eu.equipment_series_id
              JOIN scenes sc ON sc.id = eu.scene_id
              WHERE es.manufacturer_id = em.id) AS total_productions,
           (SELECT COUNT(DISTINCT sc.production_id)::int
              FROM equipment_usage eu
              JOIN equipment_series es ON es.id = eu.equipment_series_id
              JOIN scenes sc ON sc.id = eu.scene_id
              WHERE es.manufacturer_id = em.id
                AND es.category IN ('camera_body', 'lens_set')) AS primary_credits
    FROM equipment_manufacturers em
    WHERE em.slug = ${slug}
  `);
  if (!manufacturer) return null;

  const series = await db.execute<{
    slug: string; name: string; category: string;
    year_introduced: number | null; year_discontinued: number | null;
    description: string | null; summary: string | null;
    item_count: number; production_count: number;
  }>(sql`
    SELECT es.slug, es.name, es.category::text, es.year_introduced, es.year_discontinued,
           es.description, es.summary,
           COUNT(DISTINCT ei.id)::int AS item_count,
           (SELECT COUNT(DISTINCT sc.production_id)::int
              FROM equipment_usage eu
              JOIN scenes sc ON sc.id = eu.scene_id
              WHERE eu.equipment_series_id = es.id) AS production_count
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
    description: string | null; summary: string | null; signature_look: string | null;
    references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
    manufacturer_slug: string; manufacturer_name: string;
  }>(sql`
    SELECT es.id, es.slug, es.name, es.category::text, es.year_introduced, es.year_discontinued,
           es.description, es.summary, es.signature_look, es."references",
           em.slug AS manufacturer_slug, em.name AS manufacturer_name
    FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE es.slug = ${seriesSlug}
  `);
  if (!series) return null;

  const [items, usedOn] = await Promise.all([
    db.execute<{
      slug: string; name: string; status: string;
      year_introduced: number | null; specs: Record<string, unknown>;
      description: string | null; image_url: string | null; notable_uses: string | null;
    }>(sql`
      SELECT slug, name, status::text, year_introduced, specs,
             description, image_url, notable_uses
      FROM equipment_items WHERE series_id = ${series.id}
      ORDER BY name
    `),
    db.execute<{ production_slug: string; production_title: string; release_year: number | null; poster_path: string | null }>(sql`
      SELECT DISTINCT p.slug AS production_slug, p.title AS production_title,
             p.release_year, p.poster_path
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
 * T4-3 — fetches multiple equipment items by slug for the comparison tool.
 * Returned in the order of `itemSlugs` so the UI doesn't have to re-sort.
 */
export async function getItemsForComparison(
  db: SeedDb = defaultDb,
  itemSlugs: string[],
) {
  if (itemSlugs.length === 0) return [];
  // Hand-format the postgres array literal — postgres-js's automatic
  // array binding sends a record type that can't be cast to text[].
  const slugLiteral = `{${itemSlugs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
  return db.execute<{
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
    WHERE ei.slug = ANY(${slugLiteral}::text[])
    ORDER BY array_position(${slugLiteral}::text[], ei.slug)
  `);
}

/**
 * Productions that used at least one of the given items, ranked by how
 * many of the items they used. Used by the comparison tool's
 * "shown together on" section.
 */
export async function getProductionsUsingAnyItem(
  db: SeedDb = defaultDb,
  itemSlugs: string[],
) {
  if (itemSlugs.length === 0) return [];
  const slugLiteral = `{${itemSlugs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
  return db.execute<{
    production_slug: string;
    production_title: string;
    release_year: number | null;
    poster_path: string | null;
    matched_item_slugs: string[];
  }>(sql`
    SELECT p.slug AS production_slug, p.title AS production_title,
           p.release_year, p.poster_path,
           array_agg(DISTINCT ei.slug) AS matched_item_slugs
    FROM equipment_usage eu
    JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    JOIN scenes sc ON sc.id = eu.scene_id
    JOIN productions p ON p.id = sc.production_id
    WHERE ei.slug = ANY(${slugLiteral}::text[])
    GROUP BY p.id, p.slug, p.title, p.release_year, p.poster_path
    ORDER BY array_length(array_agg(DISTINCT ei.slug), 1) DESC,
             p.release_year DESC NULLS LAST,
             p.title
    LIMIT 30
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

/**
 * (manufacturer, series) pairs — for the series-level gear page
 * generateStaticParams. Replaces the old N+M pattern that fanned out
 * one listSeriesByManufacturer call per manufacturer at build time.
 */
export async function listAllSeriesPaths(db: SeedDb = defaultDb) {
  return db.execute<{ manufacturer_slug: string; series_slug: string }>(sql`
    SELECT em.slug AS manufacturer_slug, es.slug AS series_slug
    FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    ORDER BY em.slug, es.slug
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
    specs: Record<string, unknown>;
    description: string | null; image_url: string | null; notable_uses: string | null;
    value_proposition: string | null;
    images: Array<{ url: string; caption?: string; credit?: string; source?: string }>;
    compatibility: { mount?: string; compatible_cameras?: string[]; compatible_lens_mounts?: string[]; adapter_notes?: string };
    series_slug: string; series_name: string;
    series_category: string; series_summary: string | null;
    manufacturer_slug: string; manufacturer_name: string;
    manufacturer_website: string | null;
  }>(sql`
    SELECT ei.slug, ei.name, ei.model_number, ei.status::text,
           ei.year_introduced, ei.year_discontinued, ei.specs,
           ei.description, ei.image_url, ei.notable_uses,
           ei.value_proposition, ei.images, ei.compatibility,
           es.slug AS series_slug, es.name AS series_name,
           es.category::text AS series_category, es.summary AS series_summary,
           em.slug AS manufacturer_slug, em.name AS manufacturer_name,
           em.website AS manufacturer_website
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
