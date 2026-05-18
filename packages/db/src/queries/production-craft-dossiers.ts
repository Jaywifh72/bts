import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type CraftDossierRow = {
  slug: string;
  craft: string;
  headline: string;
  lead_credit: string | null;
  lead_slug: string | null;
  lead_name: string | null;
  production_slug: string;
  production_title: string;
  release_year: number | null;
  summary: string | null;
  body: string | null;
  signature_looks: string[];
  techniques: string[];
  references_consulted: string[];
  collaborators: string[];
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  data_tier: string;
};

export async function listCraftDossiers(
  db: SeedDb = defaultDb,
  opts: { craft?: string; limit?: number } = {},
): Promise<CraftDossierRow[]> {
  const craft = opts.craft ?? null;
  const limit = opts.limit ?? 200;
  return db.execute<CraftDossierRow>(sql`
    SELECT d.slug, d.craft, d.headline, d.lead_credit,
           lp.slug AS lead_slug, lp.display_name AS lead_name,
           p.slug AS production_slug, p.title AS production_title, p.release_year,
           d.summary, d.body, d.signature_looks, d.techniques,
           d.references_consulted, d.collaborators,
           COALESCE(d."references", '[]'::jsonb) AS "references",
           d.data_tier
      FROM production_craft_dossiers d
      JOIN productions p ON p.id = d.production_id
      LEFT JOIN people lp ON lp.id = d.lead_person_id
     WHERE ${craft}::text IS NULL OR d.craft = ${craft}
     ORDER BY p.release_year DESC NULLS LAST, p.title
     LIMIT ${limit}
  `);
}

export async function getCraftDossierBySlug(
  db: SeedDb = defaultDb,
  slug: string,
): Promise<CraftDossierRow | null> {
  const rows = await db.execute<CraftDossierRow>(sql`
    SELECT d.slug, d.craft, d.headline, d.lead_credit,
           lp.slug AS lead_slug, lp.display_name AS lead_name,
           p.slug AS production_slug, p.title AS production_title, p.release_year,
           d.summary, d.body, d.signature_looks, d.techniques,
           d.references_consulted, d.collaborators,
           COALESCE(d."references", '[]'::jsonb) AS "references",
           d.data_tier
      FROM production_craft_dossiers d
      JOIN productions p ON p.id = d.production_id
      LEFT JOIN people lp ON lp.id = d.lead_person_id
     WHERE d.slug = ${slug}
     LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listCraftDossiersForProduction(
  db: SeedDb = defaultDb,
  productionSlug: string,
): Promise<CraftDossierRow[]> {
  return db.execute<CraftDossierRow>(sql`
    SELECT d.slug, d.craft, d.headline, d.lead_credit,
           lp.slug AS lead_slug, lp.display_name AS lead_name,
           p.slug AS production_slug, p.title AS production_title, p.release_year,
           d.summary, d.body, d.signature_looks, d.techniques,
           d.references_consulted, d.collaborators,
           COALESCE(d."references", '[]'::jsonb) AS "references",
           d.data_tier
      FROM production_craft_dossiers d
      JOIN productions p ON p.id = d.production_id
      LEFT JOIN people lp ON lp.id = d.lead_person_id
     WHERE p.slug = ${productionSlug}
     ORDER BY d.craft
  `);
}
