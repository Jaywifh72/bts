import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type AwardOrg =
  | 'academy_awards' | 'bafta' | 'cannes' | 'golden_globes'
  | 'critics_choice' | 'asc_award' | 'aso_award' | 'csc_award'
  | 'bsc_award' | 'spirit_awards' | 'venice' | 'berlin'
  | 'ves_award' | 'eca' | 'other';

export type ProductionAward = {
  id: number;
  award_org: AwardOrg;
  category: string;
  year: number;
  is_winner: boolean;
  recipient_person_slug: string | null;
  recipient_display_name: string | null;
  source_url: string | null;
};

/**
 * T2-6 — awards for a production. Sorted winners-first within year, most
 * recent year first. Joins to people for recipient slug/name when set.
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
      a.source_url
    FROM production_awards a
    LEFT JOIN people ppl ON ppl.id = a.recipient_person_id
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
