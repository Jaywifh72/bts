import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

/**
 * T2-3 — list every post house with a credit count. Defaults to hiding
 * empties (mirrors VFX house behavior).
 */
export async function listPostHouses(
  db: SeedDb = defaultDb,
  opts: { withCreditsOnly?: boolean; kinds?: string[]; limit?: number } = {},
) {
  const withCreditsOnly = opts.withCreditsOnly ?? true;
  const limit = opts.limit ?? 200;
  const kindFilter = opts.kinds && opts.kinds.length > 0
    ? sql`AND ph.kind::text = ANY(${`{${opts.kinds.join(',')}}`}::text[])`
    : sql``;
  return db.execute<{
    slug: string;
    name: string;
    kind: string;
    country: string | null;
    city: string | null;
    production_count: number;
  }>(sql`
    SELECT ph.slug, ph.name, ph.kind::text, ph.country, ph.city,
           COUNT(DISTINCT pph.production_id)::int AS production_count
    FROM post_houses ph
    LEFT JOIN production_post_houses pph ON pph.post_house_id = ph.id
    WHERE TRUE ${kindFilter}
    GROUP BY ph.id
    HAVING ${withCreditsOnly ? sql`COUNT(DISTINCT pph.production_id) > 0` : sql`TRUE`}
    ORDER BY production_count DESC, ph.name ASC
    LIMIT ${limit}
  `);
}

/**
 * Post-house roles for a single production. Used by the production
 * detail page to surface DI / color / sound mix credits.
 */
export async function getProductionPostHouses(
  db: SeedDb = defaultDb,
  productionId: number,
) {
  return db.execute<{
    slug: string;
    name: string;
    kind: string;
    role: string;
    notes: string | null;
  }>(sql`
    SELECT ph.slug, ph.name, ph.kind, pph.role, pph.notes
    FROM production_post_houses pph
    JOIN post_houses ph ON ph.id = pph.post_house_id
    WHERE pph.production_id = ${productionId}
    ORDER BY pph.role, ph.name
  `);
}
