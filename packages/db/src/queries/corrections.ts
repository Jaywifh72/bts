import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type CorrectionStatus = 'open' | 'triaged' | 'resolved' | 'dismissed';

export type Correction = {
  id: number;
  production_id: number | null;
  production_slug: string | null;
  production_title: string | null;
  page_url: string;
  message: string;
  email: string | null;
  status: CorrectionStatus;
  triage_notes: string | null;
  created_at: string;
};

/**
 * T7-4 — insert a public correction submission. Light validation in the
 * server action; the column NOT NULL constraints catch the rest. Returns
 * the new row id.
 */
export async function insertCorrection(
  db: SeedDb = defaultDb,
  input: {
    productionSlug?: string | null;
    pageUrl: string;
    message: string;
    email?: string | null;
  },
): Promise<number> {
  const rows = await db.execute<{ id: number }>(sql`
    INSERT INTO corrections (production_id, page_url, message, email)
    VALUES (
      ${input.productionSlug ? sql`(SELECT id FROM productions WHERE slug = ${input.productionSlug})` : sql`NULL`},
      ${input.pageUrl},
      ${input.message},
      ${input.email ?? null}
    )
    RETURNING id
  `);
  return rows[0]!.id;
}

export async function listCorrections(
  db: SeedDb = defaultDb,
  filter: { status?: CorrectionStatus | 'all' } = {},
): Promise<Correction[]> {
  const status = filter.status ?? 'open';
  return db.execute<Correction>(sql`
    SELECT
      c.id, c.production_id,
      p.slug AS production_slug, p.title AS production_title,
      c.page_url, c.message, c.email,
      c.status, c.triage_notes,
      c.created_at::text AS created_at
    FROM corrections c
    LEFT JOIN productions p ON p.id = c.production_id
    WHERE ${status === 'all' ? sql`TRUE` : sql`c.status = ${status}`}
    ORDER BY c.created_at DESC
  `);
}

export async function countOpenCorrections(db: SeedDb = defaultDb): Promise<number> {
  const [row] = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM corrections WHERE status = 'open'
  `);
  return Number(row?.count ?? 0);
}

export async function updateCorrectionStatus(
  db: SeedDb = defaultDb,
  id: number,
  status: CorrectionStatus,
  triageNotes?: string | null,
): Promise<void> {
  await db.execute(sql`
    UPDATE corrections
    SET status = ${status},
        triage_notes = ${triageNotes ?? null},
        updated_at = NOW()
    WHERE id = ${id}
  `);
}
