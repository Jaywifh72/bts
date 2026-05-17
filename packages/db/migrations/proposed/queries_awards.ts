// PROPOSED — replacement for `packages/db/src/queries/awards.ts` after
// migrations 0069-0072 + schema_awards.ts are promoted. Not yet active.
//
// Notable changes from current queries:
//   - All queries now JOIN award_categories + award_orgs to expose
//     `award_org_slug`, `org_name`, `category_slug`, `category_name`,
//     `craft_slug`.
//   - `AwardOrg` TS union removed — orgs are dynamic, identified by slug.
//   - `listAwards` filter accepts `craftSlug` (new) and `orgSlug` (string).
//   - All FROM clauses use `awards` (renamed from `production_awards`).

import { db as defaultDb } from '../../src/db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type AwardRecipientKind =
  | 'production' | 'person' | 'vfx_house' | 'stunt_company' | 'society' | 'other_org';

// Common projection: every awards query in this file selects these columns
// so callers can render uniformly without re-joining org/category metadata.
const AWARD_COLUMNS = sql`
  a.id,
  a.year,
  a.is_winner,
  a.source_url,
  a.recipient_kind,
  o.slug AS award_org_slug,
  o.name AS award_org_name,
  o.is_craft_focused,
  c.slug AS category_slug,
  c.name AS category_name,
  cr.slug AS craft_slug,
  cr.name AS craft_name
`;

const AWARD_JOINS = sql`
  JOIN award_categories c ON c.id = a.category_id
  JOIN award_orgs o       ON o.id = a.award_org_id
  LEFT JOIN crafts cr     ON cr.id = c.craft_id
`;

export type AwardRow = {
  id: number;
  year: number;
  is_winner: boolean;
  source_url: string | null;
  recipient_kind: AwardRecipientKind;
  award_org_slug: string;
  award_org_name: string;
  is_craft_focused: boolean;
  category_slug: string;
  category_name: string;
  craft_slug: string | null;
  craft_name: string | null;
};

export type ProductionAward = AwardRow & {
  recipient_person_slug: string | null;
  recipient_display_name: string | null;
  recipient_vfx_house_slug: string | null;
  recipient_vfx_house_name: string | null;
  recipient_stunt_company_slug: string | null;
  recipient_stunt_company_name: string | null;
};

export async function getProductionAwards(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionAward[]> {
  return db.execute<ProductionAward>(sql`
    SELECT ${AWARD_COLUMNS},
           ppl.slug AS recipient_person_slug,
           ppl.display_name AS recipient_display_name,
           vh.slug  AS recipient_vfx_house_slug,
           vh.name  AS recipient_vfx_house_name,
           sc.slug  AS recipient_stunt_company_slug,
           sc.name  AS recipient_stunt_company_name
    FROM awards a
    ${AWARD_JOINS}
    LEFT JOIN people          ppl ON ppl.id = a.recipient_person_id
    LEFT JOIN vfx_houses      vh  ON vh.id  = a.recipient_vfx_house_id
    LEFT JOIN stunt_companies sc  ON sc.id  = a.recipient_stunt_company_id
    WHERE a.production_id = ${productionId}
    ORDER BY a.year DESC, a.is_winner DESC, o.slug, c.sort_order
  `);
}

export type CrewAward = ProductionAward & {
  production_slug: string;
  production_title: string;
  poster_path: string | null;
};

export async function getAwardsForPerson(
  db: SeedDb = defaultDb,
  personSlug: string,
): Promise<CrewAward[]> {
  return db.execute<CrewAward>(sql`
    SELECT ${AWARD_COLUMNS},
           ppl.slug AS recipient_person_slug,
           ppl.display_name AS recipient_display_name,
           NULL::text AS recipient_vfx_house_slug,
           NULL::text AS recipient_vfx_house_name,
           NULL::text AS recipient_stunt_company_slug,
           NULL::text AS recipient_stunt_company_name,
           p.slug AS production_slug,
           p.title AS production_title,
           p.poster_path
    FROM awards a
    ${AWARD_JOINS}
    JOIN people ppl ON ppl.id = a.recipient_person_id
    JOIN productions p ON p.id = a.production_id
    WHERE ppl.slug = ${personSlug}
    ORDER BY a.year DESC, a.is_winner DESC, c.sort_order
  `);
}

export type OrgRecipientAward = AwardRow & {
  production_slug: string;
  production_title: string;
  poster_path: string | null;
};

export async function getAwardsForVfxHouse(
  db: SeedDb = defaultDb,
  vfxHouseSlug: string,
): Promise<OrgRecipientAward[]> {
  return db.execute<OrgRecipientAward>(sql`
    SELECT ${AWARD_COLUMNS},
           p.slug AS production_slug,
           p.title AS production_title,
           p.poster_path
    FROM awards a
    ${AWARD_JOINS}
    JOIN vfx_houses h  ON h.id = a.recipient_vfx_house_id
    JOIN productions p ON p.id = a.production_id
    WHERE h.slug = ${vfxHouseSlug}
    ORDER BY a.year DESC, a.is_winner DESC, c.sort_order
  `);
}

export async function getAwardsForStuntCompany(
  db: SeedDb = defaultDb,
  stuntCompanySlug: string,
): Promise<OrgRecipientAward[]> {
  return db.execute<OrgRecipientAward>(sql`
    SELECT ${AWARD_COLUMNS},
           p.slug AS production_slug,
           p.title AS production_title,
           p.poster_path
    FROM awards a
    ${AWARD_JOINS}
    JOIN stunt_companies sc ON sc.id = a.recipient_stunt_company_id
    JOIN productions p      ON p.id  = a.production_id
    WHERE sc.slug = ${stuntCompanySlug}
    ORDER BY a.year DESC, a.is_winner DESC, c.sort_order
  `);
}

// ── /awards index ──────────────────────────────────────────────────

export type AwardsIndexRow = AwardRow & {
  production_slug: string;
  production_title: string;
  poster_path: string | null;
  recipient_slug: string | null;
  recipient_name: string | null;
};

export type AwardsIndexFilter = {
  orgSlug?: string | 'all';
  craftSlug?: string | 'all';           // NEW — powers /awards/craft/[craft]
  year?: number | 'all';
  category?: string;                    // free-text contains on category name
  recipientKind?: AwardRecipientKind | 'all';
  winnersOnly?: boolean;
  craftFocusedOnly?: boolean;           // NEW — filter to craft-focused orgs only
  limit?: number;
  offset?: number;
};

export async function listAwards(
  db: SeedDb = defaultDb,
  filter: AwardsIndexFilter = {},
): Promise<AwardsIndexRow[]> {
  const orgFilter   = !filter.orgSlug   || filter.orgSlug   === 'all' ? sql`TRUE` : sql`o.slug = ${filter.orgSlug}`;
  const craftFilter = !filter.craftSlug || filter.craftSlug === 'all' ? sql`TRUE` : sql`cr.slug = ${filter.craftSlug}`;
  const yearFilter  = !filter.year      || filter.year      === 'all' ? sql`TRUE` : sql`a.year = ${filter.year}`;
  const catFilter   = !filter.category                                 ? sql`TRUE` : sql`c.name ILIKE ${'%' + filter.category + '%'}`;
  const winFilter   = filter.winnersOnly                               ? sql`a.is_winner = true` : sql`TRUE`;
  const cfFilter    = filter.craftFocusedOnly                          ? sql`o.is_craft_focused = true` : sql`TRUE`;
  const recipFilter = !filter.recipientKind || filter.recipientKind === 'all'
    ? sql`TRUE`
    : sql`a.recipient_kind = ${filter.recipientKind}::award_recipient_kind_enum`;

  const limit  = filter.limit  ?? 200;
  const offset = filter.offset ?? 0;

  return db.execute<AwardsIndexRow>(sql`
    SELECT ${AWARD_COLUMNS},
           p.slug AS production_slug,
           p.title AS production_title,
           p.poster_path,
           COALESCE(ppl.slug, vh.slug, sc.slug) AS recipient_slug,
           COALESCE(ppl.display_name, vh.name, sc.name) AS recipient_name
    FROM awards a
    ${AWARD_JOINS}
    JOIN productions p ON p.id = a.production_id
    LEFT JOIN people          ppl ON ppl.id = a.recipient_person_id
    LEFT JOIN vfx_houses      vh  ON vh.id  = a.recipient_vfx_house_id
    LEFT JOIN stunt_companies sc  ON sc.id  = a.recipient_stunt_company_id
    WHERE ${orgFilter} AND ${craftFilter} AND ${yearFilter}
      AND ${catFilter} AND ${winFilter} AND ${cfFilter} AND ${recipFilter}
    ORDER BY a.year DESC, a.is_winner DESC, o.slug, c.sort_order
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export async function listAwardYears(db: SeedDb = defaultDb): Promise<number[]> {
  const rows = await db.execute<{ year: number }>(sql`
    SELECT DISTINCT year FROM awards ORDER BY year DESC
  `);
  return rows.map((r) => r.year);
}

// ── Taxonomy lookups (for filter dropdowns + craft landing pages) ──

export type CraftRow = { id: number; slug: string; name: string; sort_order: number };
export async function listCrafts(db: SeedDb = defaultDb): Promise<CraftRow[]> {
  return db.execute<CraftRow>(sql`
    SELECT id, slug, name, sort_order
    FROM crafts
    ORDER BY sort_order, name
  `);
}

export type AwardOrgRow = {
  id: number; slug: string; name: string;
  country: string | null; kind: string; is_craft_focused: boolean;
};
export async function listAwardOrgs(
  db: SeedDb = defaultDb,
  opts: { craftFocusedOnly?: boolean } = {},
): Promise<AwardOrgRow[]> {
  const cf = opts.craftFocusedOnly ? sql`WHERE is_craft_focused = true` : sql``;
  return db.execute<AwardOrgRow>(sql`
    SELECT id, slug, name, country, kind, is_craft_focused
    FROM award_orgs
    ${cf}
    ORDER BY name
  `);
}
