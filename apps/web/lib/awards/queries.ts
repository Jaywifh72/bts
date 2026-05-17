/**
 * App-side awards queries that go beyond what @bts/db exposes —
 * specifically, anything that needs the craft taxonomy from
 * `crafts.ts`. Lives in apps/web because the craft mapping is a
 * presentation-layer concern until the schema-side `crafts` table
 * ships (proposed migrations 0069-0072).
 */
import { db, sql } from '@bts/db';
import { craftCaseSql, type CraftSlug } from './crafts';

const CRAFT = craftCaseSql(sql.raw('a.award_org::text'), sql.raw('a.category'));

export type CraftAwardRow = {
  id: number;
  award_org: string;
  category: string;
  year: number;
  is_winner: boolean;
  source_url: string | null;
  craft: CraftSlug;
  production_slug: string;
  production_title: string;
  poster_path: string | null;
  recipient_kind: 'person' | 'vfx_house' | 'stunt_company' | 'production';
  recipient_slug: string | null;
  recipient_name: string | null;
};

export async function listAwardsByCraft(
  craft: CraftSlug,
  opts: { winnersOnly?: boolean; limit?: number; year?: number } = {},
): Promise<CraftAwardRow[]> {
  const winFilter  = opts.winnersOnly ? sql`a.is_winner = TRUE` : sql`TRUE`;
  const yearFilter = opts.year ? sql`a.year = ${opts.year}` : sql`TRUE`;
  const limit = opts.limit ?? 300;

  return db.execute<CraftAwardRow>(sql`
    SELECT
      a.id, a.award_org::text AS award_org, a.category, a.year, a.is_winner, a.source_url,
      ${CRAFT} AS craft,
      p.slug AS production_slug, p.title AS production_title, p.poster_path,
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
    LEFT JOIN people          ppl ON ppl.id = a.recipient_person_id
    LEFT JOIN vfx_houses      vh  ON vh.id  = a.recipient_vfx_house_id
    LEFT JOIN stunt_companies sc  ON sc.id  = a.recipient_stunt_company_id
    WHERE ${CRAFT} = ${craft}
      AND ${winFilter}
      AND ${yearFilter}
    ORDER BY a.year DESC, a.is_winner DESC, a.award_org, a.category
    LIMIT ${limit}
  `);
}

export type CraftSummary = {
  craft: CraftSlug;
  total: number;
  wins: number;
  orgs: number;
  year_min: number;
  year_max: number;
};

/** Counts per craft across all award rows. Powers the /awards craft strip + index. */
export async function getCraftSummaries(): Promise<CraftSummary[]> {
  return db.execute<CraftSummary>(sql`
    SELECT
      ${CRAFT} AS craft,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE a.is_winner)::int AS wins,
      COUNT(DISTINCT a.award_org)::int AS orgs,
      MIN(a.year)::int AS year_min,
      MAX(a.year)::int AS year_max
    FROM production_awards a
    WHERE ${CRAFT} IS NOT NULL
    GROUP BY ${CRAFT}
    ORDER BY total DESC
  `);
}

export type TopRecipient = {
  recipient_kind: 'person' | 'vfx_house' | 'stunt_company';
  recipient_slug: string;
  recipient_name: string;
  wins: number;
  noms: number;
};

/** Top recipients (by wins, then noms) within one craft. */
export async function getTopRecipientsForCraft(
  craft: CraftSlug,
  limit: number = 15,
): Promise<TopRecipient[]> {
  return db.execute<TopRecipient>(sql`
    WITH craft_awards AS (
      SELECT a.*
      FROM production_awards a
      WHERE ${CRAFT} = ${craft}
    ),
    expanded AS (
      SELECT 'person'::text AS recipient_kind, ppl.slug, ppl.display_name AS name, a.is_winner
      FROM craft_awards a JOIN people ppl ON ppl.id = a.recipient_person_id
      UNION ALL
      SELECT 'vfx_house', vh.slug, vh.name, a.is_winner
      FROM craft_awards a JOIN vfx_houses vh ON vh.id = a.recipient_vfx_house_id
      UNION ALL
      SELECT 'stunt_company', sc.slug, sc.name, a.is_winner
      FROM craft_awards a JOIN stunt_companies sc ON sc.id = a.recipient_stunt_company_id
    )
    SELECT
      recipient_kind, slug AS recipient_slug, name AS recipient_name,
      COUNT(*) FILTER (WHERE is_winner)::int AS wins,
      COUNT(*) FILTER (WHERE NOT is_winner)::int AS noms
    FROM expanded
    GROUP BY recipient_kind, slug, name
    ORDER BY wins DESC, noms DESC, name
    LIMIT ${limit}
  `);
}
