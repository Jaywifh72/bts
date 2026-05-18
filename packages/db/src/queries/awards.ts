import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type AwardOrg =
  | 'academy_awards' | 'bafta' | 'cannes' | 'golden_globes'
  | 'critics_choice' | 'asc_award' | 'aso_award' | 'csc_award'
  | 'bsc_award' | 'spirit_awards' | 'venice' | 'berlin'
  | 'ves_award' | 'eca' | 'camerimage'
  | 'taurus_world_stunt_awards' | 'sag_stunt_ensemble' | 'other'
  // Migration 0077 — sound/music/craft society additions.
  | 'academy_stunt_design'
  | 'mpse_golden_reel' | 'cas_award' | 'hpa_award' | 'ace_eddie'
  | 'scl_award' | 'ascap_film_award' | 'bmi_film_award' | 'ivor_novello' | 'gms_award'
  | 'adg_award' | 'cdg_award' | 'muahs_award';

export type AwardRecipientType = 'person' | 'vfx_house' | 'stunt_company' | 'production';

export type ProductionAward = {
  id: number;
  award_org: AwardOrg;
  category: string;
  year: number;
  is_winner: boolean;
  recipient_person_slug: string | null;
  recipient_display_name: string | null;
  // 0057 — at most one of (person, vfx_house, stunt_company) is non-null per row.
  recipient_vfx_house_slug: string | null;
  recipient_vfx_house_name: string | null;
  recipient_stunt_company_slug: string | null;
  recipient_stunt_company_name: string | null;
  source_url: string | null;
};

/**
 * T2-6 — awards for a production. Sorted winners-first within year, most
 * recent year first. Joins three potential recipient tables (people /
 * vfx_houses / stunt_companies) so the UI can render whichever recipient
 * is attributed, or fall back to a production-level chip when all three
 * are null (Best Picture, etc.).
 */
export async function getProductionAwards(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionAward[]> {
  return db.execute<ProductionAward>(sql`
    SELECT
      a.id,
      a.award_org,
      a.category,
      a.year,
      a.is_winner,
      ppl.slug AS recipient_person_slug,
      ppl.display_name AS recipient_display_name,
      vh.slug AS recipient_vfx_house_slug,
      vh.name AS recipient_vfx_house_name,
      sc.slug AS recipient_stunt_company_slug,
      sc.name AS recipient_stunt_company_name,
      a.source_url
    FROM production_awards a
    LEFT JOIN people          ppl ON ppl.id = a.recipient_person_id
    LEFT JOIN vfx_houses      vh  ON vh.id  = a.recipient_vfx_house_id
    LEFT JOIN stunt_companies sc  ON sc.id  = a.recipient_stunt_company_id
    WHERE a.production_id = ${productionId}
    ORDER BY a.year DESC, a.is_winner DESC, a.award_org, a.category
  `);
}

export type CrewAward = ProductionAward & {
  production_slug: string;
  production_title: string;
  poster_path: string | null;
};

/**
 * T3-5 — awards a person has been nominated for or won, joined back to
 * the production they're for. Used on the crew detail page.
 */
export async function getAwardsForPerson(
  db: SeedDb = defaultDb,
  personSlug: string,
): Promise<CrewAward[]> {
  return db.execute<CrewAward>(sql`
    SELECT
      a.id, a.award_org, a.category, a.year, a.is_winner,
      ppl.slug AS recipient_person_slug,
      ppl.display_name AS recipient_display_name,
      a.source_url,
      p.slug AS production_slug,
      p.title AS production_title,
      p.poster_path
    FROM production_awards a
    JOIN people ppl ON ppl.id = a.recipient_person_id
    JOIN productions p ON p.id = a.production_id
    WHERE ppl.slug = ${personSlug}
    ORDER BY a.year DESC, a.is_winner DESC, a.category
  `);
}

// ── 0057 — org-recipient awards ─────────────────────────────────────────────

export type OrgRecipientAward = {
  id: number;
  award_org: AwardOrg;
  category: string;
  year: number;
  is_winner: boolean;
  source_url: string | null;
  production_slug: string;
  production_title: string;
  poster_path: string | null;
};

/**
 * Awards a VFX house has been nominated for / won. Powers the awards
 * section on /vfx/[slug]. Same shape as getAwardsForPerson but joined
 * via recipient_vfx_house_id.
 */
export async function getAwardsForVfxHouse(
  db: SeedDb = defaultDb,
  vfxHouseSlug: string,
): Promise<OrgRecipientAward[]> {
  return db.execute<OrgRecipientAward>(sql`
    SELECT
      a.id, a.award_org, a.category, a.year, a.is_winner, a.source_url,
      p.slug AS production_slug,
      p.title AS production_title,
      p.poster_path
    FROM production_awards a
    JOIN vfx_houses h ON h.id = a.recipient_vfx_house_id
    JOIN productions p ON p.id = a.production_id
    WHERE h.slug = ${vfxHouseSlug}
    ORDER BY a.year DESC, a.is_winner DESC, a.category
  `);
}

/**
 * Awards a stunt company has been nominated for / won. Powers the awards
 * section on /stunts/companies/[slug].
 */
export async function getAwardsForStuntCompany(
  db: SeedDb = defaultDb,
  stuntCompanySlug: string,
): Promise<OrgRecipientAward[]> {
  return db.execute<OrgRecipientAward>(sql`
    SELECT
      a.id, a.award_org, a.category, a.year, a.is_winner, a.source_url,
      p.slug AS production_slug,
      p.title AS production_title,
      p.poster_path
    FROM production_awards a
    JOIN stunt_companies sc ON sc.id = a.recipient_stunt_company_id
    JOIN productions p ON p.id = a.production_id
    WHERE sc.slug = ${stuntCompanySlug}
    ORDER BY a.year DESC, a.is_winner DESC, a.category
  `);
}

// ── 0057 — filtered awards index for /awards ────────────────────────────────

export type AwardsIndexRow = {
  id: number;
  award_org: AwardOrg;
  category: string;
  year: number;
  is_winner: boolean;
  source_url: string | null;
  production_slug: string;
  production_title: string;
  poster_path: string | null;
  // exactly one of these is populated (or all-null = production-level)
  recipient_kind: AwardRecipientType;
  recipient_slug: string | null;
  recipient_name: string | null;
};

export type AwardsIndexFilter = {
  org?: AwardOrg | 'all';
  year?: number | 'all';
  category?: string;             // free-text contains-match (case-insensitive)
  recipientKind?: AwardRecipientType | 'all';
  winnersOnly?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * Cross-cut awards index. Returns every award row matching the supplied
 * filters, with the recipient unioned across the three FK columns into a
 * single (kind, slug, name) triple so the UI can render uniformly.
 *
 * Used by /awards's filter form. Static-rendered with revalidate; the
 * row count is modest (<5000 in practice) so we don't paginate aggressively.
 */
export async function listAwards(
  db: SeedDb = defaultDb,
  filter: AwardsIndexFilter = {},
): Promise<AwardsIndexRow[]> {
  const orgFilter = !filter.org || filter.org === 'all'
    ? sql`TRUE`
    : sql`a.award_org = ${filter.org}::award_org_enum`;
  const yearFilter = !filter.year || filter.year === 'all'
    ? sql`TRUE`
    : sql`a.year = ${filter.year}`;
  const categoryFilter = !filter.category
    ? sql`TRUE`
    : sql`a.category ILIKE ${'%' + filter.category + '%'}`;
  const winnersFilter = filter.winnersOnly ? sql`a.is_winner = true` : sql`TRUE`;
  const recipientFilter = (() => {
    switch (filter.recipientKind) {
      case 'person':
        return sql`a.recipient_person_id IS NOT NULL`;
      case 'vfx_house':
        return sql`a.recipient_vfx_house_id IS NOT NULL`;
      case 'stunt_company':
        return sql`a.recipient_stunt_company_id IS NOT NULL`;
      case 'production':
        return sql`a.recipient_person_id IS NULL AND a.recipient_vfx_house_id IS NULL AND a.recipient_stunt_company_id IS NULL`;
      default:
        return sql`TRUE`;
    }
  })();

  const limit = filter.limit ?? 200;
  const offset = filter.offset ?? 0;

  return db.execute<AwardsIndexRow>(sql`
    SELECT
      a.id, a.award_org, a.category, a.year, a.is_winner, a.source_url,
      p.slug AS production_slug,
      p.title AS production_title,
      p.poster_path,
      CASE
        WHEN a.recipient_person_id IS NOT NULL THEN 'person'
        WHEN a.recipient_vfx_house_id IS NOT NULL THEN 'vfx_house'
        WHEN a.recipient_stunt_company_id IS NOT NULL THEN 'stunt_company'
        ELSE 'production'
      END AS recipient_kind,
      COALESCE(ppl.slug, vh.slug, sc.slug) AS recipient_slug,
      COALESCE(ppl.display_name, vh.name, sc.name) AS recipient_name
    FROM production_awards a
    JOIN productions p ON p.id = a.production_id
    LEFT JOIN people ppl ON ppl.id = a.recipient_person_id
    LEFT JOIN vfx_houses vh ON vh.id = a.recipient_vfx_house_id
    LEFT JOIN stunt_companies sc ON sc.id = a.recipient_stunt_company_id
    WHERE ${orgFilter}
      AND ${yearFilter}
      AND ${categoryFilter}
      AND ${winnersFilter}
      AND ${recipientFilter}
    ORDER BY a.year DESC, a.is_winner DESC, a.award_org, a.category
    LIMIT ${limit} OFFSET ${offset}
  `);
}

/**
 * Distinct year set + max year (for the year-filter dropdown). Cheap;
 * keeps the awards index in sync with whatever's actually in the DB.
 */
export async function listAwardYears(db: SeedDb = defaultDb): Promise<number[]> {
  const rows = await db.execute<{ year: number }>(sql`
    SELECT DISTINCT year FROM production_awards ORDER BY year DESC
  `);
  return rows.map((r) => r.year);
}
