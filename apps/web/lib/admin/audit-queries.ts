import 'server-only';
import { db, sql } from '@bts/db';

/**
 * Unified change log sourced from each editorial table's
 * `updated_at` and `created_at` columns. Distinguishes "created"
 * from "edited" by comparing timestamps within the row itself —
 * created_at == updated_at means the row hasn't been touched since
 * insert. We expose only editorial / curated tables here; bulk-
 * synced tables (productions / people) are surfaced through their
 * own dashboards.
 */

export type AuditEvent = {
  table_name: string;
  table_label: string;
  slug: string;
  display_name: string;
  /** 'created' if updated_at equals created_at, else 'edited'. */
  kind: 'created' | 'edited';
  updated_at: string;
  created_at: string;
  href: string;
};

export type AuditFilters = {
  table?: string;
  /** Restrict to events newer than this many days. Default null = unbounded. */
  sinceDays?: number;
  limit?: number;
  offset?: number;
};

/**
 * The set of tables surfaced on the audit page. Each entry maps the
 * table to the display fields the audit feed needs. Tables with
 * different name columns (title vs name vs display_name) are
 * normalised in the SELECT.
 */
const AUDIT_TABLES: ReadonlyArray<{
  table: string;
  label: string;
  selectName: string;
  hrefTemplate: string;
}> = [
  { table: 'productions', label: 'Production', selectName: 'title', hrefTemplate: '/films/' },
  { table: 'people', label: 'Crew', selectName: 'display_name', hrefTemplate: '/crew/' },
  { table: 'vfx_houses', label: 'VFX house', selectName: 'name', hrefTemplate: '/vfx/' },
  { table: 'stunt_companies', label: 'Stunt company', selectName: 'name', hrefTemplate: '/stunts/companies/' },
  { table: 'stunt_schools', label: 'Stunt school', selectName: 'name', hrefTemplate: '/stunts/schools/' },
  // Sequences + equipment series/items have nested URL structures
  // requiring joins to resolve their public path. Audit links them to
  // their listing index instead — the operator searches from there.
  { table: 'stunt_sequences', label: 'Stunt sequence', selectName: 'name', hrefTemplate: '/stunts/sequences#' },
  { table: 'stunt_rigging_techniques', label: 'Rigging', selectName: 'name', hrefTemplate: '/stunts/rigging/' },
  { table: 'safety_bulletins', label: 'Safety bulletin', selectName: 'title', hrefTemplate: '/stunts/safety/' },
  { table: 'equipment_manufacturers', label: 'Manufacturer', selectName: 'name', hrefTemplate: '/gear/' },
  { table: 'equipment_series', label: 'Equipment series', selectName: 'name', hrefTemplate: '/gear#' },
  { table: 'equipment_items', label: 'Equipment item', selectName: 'name', hrefTemplate: '/gear#' },
  { table: 'post_houses', label: 'Post house', selectName: 'name', hrefTemplate: '/post-houses/' },
];

/**
 * For UI: the set of available filter pills. Pre-resolved here so
 * the page doesn't hardcode the same thing.
 */
export function listAuditTables(): ReadonlyArray<{ key: string; label: string }> {
  return AUDIT_TABLES.map((t) => ({ key: t.table, label: t.label }));
}

export async function listAuditEvents(filters: AuditFilters = {}): Promise<AuditEvent[]> {
  const limit = Math.min(filters.limit ?? 100, 500);
  const offset = Math.max(filters.offset ?? 0, 0);

  // Per-table CTE assembly — each branch returns a uniform shape so
  // the outer UNION ALL can sort + paginate consistently. Restrict
  // to the requested table when filter is set, otherwise include
  // all branches.
  const branches: ReturnType<typeof sql>[] = [];
  for (const t of AUDIT_TABLES) {
    if (filters.table && filters.table !== t.table) continue;

    // Limit each branch to a reasonable per-table cap before the
    // outer sort, otherwise productions/people would dominate the
    // sort step. The outer LIMIT then narrows to the page size.
    const perTableCap = filters.table ? limit + offset : 200;
    branches.push(sql`
      (SELECT
         ${t.table}::text AS table_name,
         ${t.label}::text AS table_label,
         slug::text,
         ${sql.identifier(t.selectName)}::text AS display_name,
         CASE WHEN updated_at = created_at THEN 'created' ELSE 'edited' END AS kind,
         updated_at::text,
         created_at::text,
         (${t.hrefTemplate}::text || slug::text) AS href
       FROM ${sql.identifier(t.table)}
       ${filters.sinceDays ? sql`WHERE updated_at > NOW() - (${filters.sinceDays} || ' days')::interval` : sql``}
       ORDER BY updated_at DESC
       LIMIT ${perTableCap})
    `);
  }

  if (branches.length === 0) return [];

  const unioned = sql.join(branches, sql` UNION ALL `);

  return db.execute<AuditEvent>(sql`
    WITH events AS (
      ${unioned}
    )
    SELECT * FROM events
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

export type AuditTableCount = { table_name: string; n: number };

/**
 * Per-table counts for the filter pills. Restricted to the same
 * sinceDays window the feed uses so the pills reflect what the
 * filter would surface.
 */
export async function getAuditTableCounts(
  sinceDays?: number,
): Promise<AuditTableCount[]> {
  const branches: ReturnType<typeof sql>[] = [];
  for (const t of AUDIT_TABLES) {
    branches.push(sql`
      SELECT ${t.table}::text AS table_name,
             COUNT(*)::int AS n
        FROM ${sql.identifier(t.table)}
        ${sinceDays ? sql`WHERE updated_at > NOW() - (${sinceDays} || ' days')::interval` : sql``}
    `);
  }
  return db.execute<AuditTableCount>(sql`
    ${sql.join(branches, sql` UNION ALL `)}
  `);
}
