import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export async function listProductions(db: SeedDb = defaultDb) {
  return db.execute<{
    slug: string;
    title: string;
    type: string;
    release_year: number | null;
    synopsis: string | null;
    primary_aspect_ratio: string | null;
    primary_acquisition_format: string | null;
  }>(sql`
    SELECT
      p.slug, p.title, p.type, p.release_year, p.synopsis,
      pf.aspect_ratio AS primary_aspect_ratio,
      pf.acquisition_format AS primary_acquisition_format
    FROM productions p
    LEFT JOIN production_formats pf
      ON pf.production_id = p.id AND pf.is_primary = true
    ORDER BY p.release_year DESC NULLS LAST, p.title ASC
  `);
}

export async function getProductionWithFullDetail(db: SeedDb = defaultDb, slug: string) {
  // Production core
  const [prod] = await db.execute<{
    id: number; slug: string; title: string; original_title: string | null;
    type: string; release_year: number | null; runtime_minutes: number | null;
    synopsis: string | null; imdb_id: string | null; tmdb_id: number | null;
  }>(sql`SELECT id, slug, title, original_title, type, release_year, runtime_minutes,
              synopsis, imdb_id, tmdb_id
         FROM productions WHERE slug = ${slug}`);

  if (!prod) return null;

  const [formats, studios, crew, scenes, productionSources] = await Promise.all([
    // Formats
    db.execute<{
      label: string | null; aspect_ratio: string; acquisition_format: string;
      color_space: string | null; frame_rate: string | null; is_primary: boolean;
    }>(sql`SELECT label, aspect_ratio, acquisition_format, color_space,
                  frame_rate::text, is_primary
           FROM production_formats WHERE production_id = ${prod.id}
           ORDER BY is_primary DESC`),

    // Studios
    db.execute<{ name: string; kind: string; role: string }>(sql`
      SELECT s.name, s.kind, ps.role
      FROM production_studios ps JOIN studios s ON s.id = ps.studio_id
      WHERE ps.production_id = ${prod.id} ORDER BY s.name`),

    // Crew
    db.execute<{
      person_slug: string; display_name: string; role_slug: string; role_name: string;
      role_category: string; credit_order: number | null; credit_name_override: string | null;
    }>(sql`
      SELECT ppl.slug AS person_slug, ppl.display_name, r.slug AS role_slug,
             r.name AS role_name, r.category AS role_category,
             ca.credit_order, ca.credit_name_override
      FROM crew_assignments ca
      JOIN people ppl ON ppl.id = ca.person_id
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.production_id = ${prod.id}
      ORDER BY r.category, ca.credit_order NULLS LAST, ppl.display_name`),

    // Scenes with equipment
    db.execute<{
      scene_id: number; scene_slug: string; scene_title: string;
      scene_synopsis: string | null; time_of_day: string | null;
      interior_exterior: string | null; location: string | null;
      series_slug: string; series_name: string; series_category: string;
      manufacturer_slug: string;
      item_slug: string | null; item_name: string | null;
      setup_label: string | null; usage_role: string | null;
    }>(sql`
      SELECT sc.id AS scene_id, sc.slug AS scene_slug, sc.title AS scene_title,
             sc.synopsis AS scene_synopsis, sc.time_of_day, sc.interior_exterior, sc.location,
             es.slug AS series_slug, es.name AS series_name, es.category AS series_category,
             em.slug AS manufacturer_slug,
             ei.slug AS item_slug, ei.name AS item_name,
             eu.setup_label, eu.usage_role
      FROM scenes sc
      JOIN equipment_usage eu ON eu.scene_id = sc.id
      JOIN equipment_series es ON es.id = eu.equipment_series_id
      JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
      LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
      WHERE sc.production_id = ${prod.id}
      ORDER BY sc.id, es.category, es.name`),

    // Production sources
    db.execute<{
      title: string; publication: string | null; author: string | null;
      published_at: string | null; url: string | null; archive_url: string | null;
      confidence: string; claim_quote: string | null;
    }>(sql`
      SELECT s.title, s.publication, s.author, s.published_at::text, s.url, s.archive_url,
             ps.confidence, ps.claim_quote
      FROM production_sources ps JOIN sources s ON s.id = ps.source_id
      WHERE ps.production_id = ${prod.id}
      ORDER BY CASE ps.confidence
               WHEN 'primary' THEN 1
               WHEN 'secondary' THEN 2
               WHEN 'manufacturer_marketing' THEN 3
               WHEN 'speculative' THEN 4
               END`),
  ]);

  return { production: prod, formats, studios, crew, scenes, productionSources };
}
