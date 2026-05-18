import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type PersonStyleProfile = {
  philosophy: string | null;
  signature_techniques: string[];
  tools_of_choice: string[];
  tells: string | null;
  process_notes: string | null;
  influences: string[];
  career_arc: string | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  curated_by: string | null;
  curated_by_url: string | null;
  last_verified_at: string | null;
};

export async function getStyleProfileForPerson(
  db: SeedDb = defaultDb,
  personSlug: string,
): Promise<PersonStyleProfile | null> {
  const rows = await db.execute<PersonStyleProfile>(sql`
    SELECT
      sp.philosophy,
      sp.signature_techniques,
      sp.tools_of_choice,
      sp.tells,
      sp.process_notes,
      sp.influences,
      sp.career_arc,
      COALESCE(sp."references", '[]'::jsonb) AS "references",
      sp.curated_by, sp.curated_by_url,
      sp.last_verified_at::text
    FROM person_style_profiles sp
    JOIN people p ON p.id = sp.person_id
    WHERE p.slug = ${personSlug}
    LIMIT 1
  `);
  return rows[0] ?? null;
}
