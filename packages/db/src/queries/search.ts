import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type SearchCategory =
  | 'production'
  | 'person'
  | 'manufacturer'
  | 'series'
  | 'item'
  | 'vfx_house';

export type SearchResult = {
  category: SearchCategory;
  slug: string;
  display: string;
  /** Disambiguation context: year for productions, role for people, manufacturer for gear, etc. */
  subtitle: string | null;
  /** Ready-to-link absolute path within the site. */
  href: string;
  /** Trigram similarity in [0, 1]. Higher is better. */
  score: number;
};

const SIMILARITY_THRESHOLD = 0.15;
const HARD_LIMIT_PER_CATEGORY = 10;

/**
 * Multi-entity trigram search across productions, people, gear (manufacturers,
 * series, items), and VFX houses.
 *
 * Uses pg_trgm's `similarity()` and `%` operator with the GIN trigram indexes
 * created in migration 0011. Per-category cap prevents one popular type from
 * drowning the others.
 *
 * Returns [] for empty / whitespace-only queries.
 */
export async function search(
  db: SeedDb = defaultDb,
  q: string,
  perCategoryLimit = HARD_LIMIT_PER_CATEGORY,
): Promise<SearchResult[]> {
  const trimmed = q.trim();
  if (trimmed.length === 0) return [];

  // Filter on similarity() > threshold inline. We don't use the % operator
  // (which would use the GIN index but depends on the session-scoped
  // similarity_threshold setting that postgres-js's connection pool may
  // not preserve between statements). At our corpus size (~1000 entities
  // total across all tables) the sequential scan over similarity() is
  // sub-millisecond, so the index isn't necessary for correctness or
  // performance — it's preserved for future scale.
  const threshold = SIMILARITY_THRESHOLD;

  type RawRow = {
    category: SearchCategory;
    slug: string;
    display: string;
    subtitle: string | null;
    href: string;
    score: number;
  };

  return db.execute<RawRow>(sql`
    WITH
      productions_match AS (
        SELECT
          'production'::text AS category,
          slug,
          title AS display,
          CASE
            WHEN release_year IS NOT NULL THEN release_year::text
            ELSE NULL
          END AS subtitle,
          '/films/' || slug AS href,
          GREATEST(
            similarity(title, ${trimmed}),
            COALESCE(similarity(original_title, ${trimmed}), 0)
          )::real AS score
        FROM productions
        WHERE similarity(title, ${trimmed}) > ${threshold}
           OR similarity(original_title, ${trimmed}) > ${threshold}
        ORDER BY score DESC, title ASC
        LIMIT ${perCategoryLimit}
      ),
      people_match AS (
        SELECT
          'person'::text AS category,
          slug,
          display_name AS display,
          NULL::text AS subtitle,
          '/crew/' || slug AS href,
          similarity(display_name, ${trimmed})::real AS score
        FROM people
        WHERE similarity(display_name, ${trimmed}) > ${threshold}
        ORDER BY score DESC, display_name ASC
        LIMIT ${perCategoryLimit}
      ),
      manufacturers_match AS (
        SELECT
          'manufacturer'::text AS category,
          slug,
          name AS display,
          country AS subtitle,
          '/gear/' || slug AS href,
          similarity(name, ${trimmed})::real AS score
        FROM equipment_manufacturers
        WHERE similarity(name, ${trimmed}) > ${threshold}
        ORDER BY score DESC, name ASC
        LIMIT ${perCategoryLimit}
      ),
      series_match AS (
        SELECT
          'series'::text AS category,
          es.slug AS slug,
          es.name AS display,
          em.name AS subtitle,
          '/gear/' || em.slug || '/' || es.slug AS href,
          similarity(es.name, ${trimmed})::real AS score
        FROM equipment_series es
        JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
        WHERE similarity(es.name, ${trimmed}) > ${threshold}
        ORDER BY score DESC, es.name ASC
        LIMIT ${perCategoryLimit}
      ),
      items_match AS (
        SELECT
          'item'::text AS category,
          ei.slug AS slug,
          ei.name AS display,
          em.name || ' · ' || es.name AS subtitle,
          '/gear/' || em.slug || '/' || es.slug || '/' || ei.slug AS href,
          similarity(ei.name, ${trimmed})::real AS score
        FROM equipment_items ei
        JOIN equipment_series es ON es.id = ei.series_id
        JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
        WHERE similarity(ei.name, ${trimmed}) > ${threshold}
        ORDER BY score DESC, ei.name ASC
        LIMIT ${perCategoryLimit}
      ),
      vfx_match AS (
        SELECT
          'vfx_house'::text AS category,
          slug,
          name AS display,
          country AS subtitle,
          '/vfx/' || slug AS href,
          similarity(name, ${trimmed})::real AS score
        FROM vfx_houses
        WHERE similarity(name, ${trimmed}) > ${threshold}
        ORDER BY score DESC, name ASC
        LIMIT ${perCategoryLimit}
      )
    SELECT * FROM productions_match
    UNION ALL SELECT * FROM people_match
    UNION ALL SELECT * FROM manufacturers_match
    UNION ALL SELECT * FROM series_match
    UNION ALL SELECT * FROM items_match
    UNION ALL SELECT * FROM vfx_match
    ORDER BY score DESC, display ASC
  `);
}
