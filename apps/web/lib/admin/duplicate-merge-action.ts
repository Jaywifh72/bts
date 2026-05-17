'use server';

import { revalidatePath } from 'next/cache';
import { db, sql } from '@bts/db';
import { safeAuth } from '@/lib/safe-auth';

/**
 * Allowlist of tables we know how to merge. Each must have:
 *   - an `id bigint` primary key
 *   - a unique `slug text` column
 * The merge walks every FK pointing at the table (via pg_catalog),
 * re-points each FK from delete_id to keep_id, then deletes the
 * delete row.
 */
const ALLOWED_TABLES = new Set([
  'vfx_houses',
  'stunt_companies',
  'equipment_manufacturers',
  'productions',
]);

export type MergeResult =
  | { ok: true; updatedTables: string[]; keepSlug: string; deleteSlug: string }
  | { ok: false; error: string };

export async function mergeDuplicateAction(
  tableName: string,
  keepSlug: string,
  deleteSlug: string,
): Promise<MergeResult> {
  // Auth: admin only.
  const session = await safeAuth();
  if (session?.user?.role !== 'admin') {
    return { ok: false, error: 'Forbidden: admin only' };
  }
  if (!ALLOWED_TABLES.has(tableName)) {
    return { ok: false, error: `Unknown table: ${tableName}` };
  }
  if (keepSlug === deleteSlug) {
    return { ok: false, error: 'keep and delete slugs are identical' };
  }

  try {
    const updatedTables = await db.transaction(async (tx) => {
      // Resolve ids from slugs. `sql.identifier()` would be ideal but
      // we already validated tableName against the allowlist above, so
      // direct interpolation is safe.
      const slugCol = tableName === 'productions' ? 'slug' : 'slug';
      void slugCol;
      const ids = await tx.execute<{ keep_id: number | null; delete_id: number | null }>(
        sql`SELECT
              (SELECT id FROM ${sql.raw(tableName)} WHERE slug = ${keepSlug}) AS keep_id,
              (SELECT id FROM ${sql.raw(tableName)} WHERE slug = ${deleteSlug}) AS delete_id`,
      );
      const { keep_id: keepId, delete_id: deleteId } = ids[0] ?? {};
      if (!keepId || !deleteId) {
        throw new Error(
          `Could not resolve ids (keep=${keepSlug}: ${keepId ?? 'missing'}, delete=${deleteSlug}: ${deleteId ?? 'missing'})`,
        );
      }

      // Enumerate every FK that points at <tableName>(id).
      const fks = await tx.execute<{ ref_table: string; ref_col: string }>(sql`
        SELECT
          cls.relname AS ref_table,
          att.attname AS ref_col
        FROM pg_constraint con
        JOIN pg_class cls ON cls.oid = con.conrelid
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
        WHERE con.contype = 'f'
          AND con.confrelid = ${sql.raw(`'${tableName}'`)}::regclass
          AND array_length(con.conkey, 1) = 1
      `);

      const updated: string[] = [];
      for (const fk of fks) {
        // Two-step: first delete rows in the referencing table that
        // would collide with the keep side on whatever UNIQUE
        // constraint they share (e.g. production_post_houses can have
        // both delete_id and keep_id rows for the same production+role
        // — re-pointing would violate the PK). Best-effort: catch
        // unique-violation errors per FK and surface them.
        try {
          await tx.execute(sql`
            UPDATE ${sql.raw(fk.ref_table)}
            SET ${sql.raw(fk.ref_col)} = ${keepId}
            WHERE ${sql.raw(fk.ref_col)} = ${deleteId}
          `);
          updated.push(`${fk.ref_table}.${fk.ref_col}`);
        } catch (err) {
          // Collision likely — delete the offending row(s) in the
          // referencing table where re-pointing would conflict, then
          // retry. This drops the duplicate associations rather than
          // failing the whole merge.
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
            await tx.execute(sql`
              DELETE FROM ${sql.raw(fk.ref_table)}
              WHERE ${sql.raw(fk.ref_col)} = ${deleteId}
            `);
            updated.push(`${fk.ref_table}.${fk.ref_col} (dropped colliding rows)`);
          } else {
            throw err;
          }
        }
      }

      // Finally delete the orphan row itself.
      await tx.execute(sql`
        DELETE FROM ${sql.raw(tableName)} WHERE id = ${deleteId}
      `);
      updated.push(`${tableName} (deleted '${deleteSlug}')`);

      return updated;
    });

    revalidatePath('/admin/health/duplicates');
    revalidatePath('/admin/health');
    return { ok: true, updatedTables, keepSlug, deleteSlug };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type IgnoreResult = { ok: true } | { ok: false; error: string };

/**
 * Mark a candidate pair as "these are NOT actually duplicates — keep
 * both". The pair is stored canonically (lower slug first) so the
 * dismissal sticks across page-load orderings. Idempotent: re-marking
 * an already-ignored pair is a no-op.
 */
export async function ignoreDuplicateAction(
  tableName: string,
  aSlug: string,
  bSlug: string,
): Promise<IgnoreResult> {
  const session = await safeAuth();
  if (session?.user?.role !== 'admin') {
    return { ok: false, error: 'Forbidden: admin only' };
  }
  if (!ALLOWED_TABLES.has(tableName)) {
    return { ok: false, error: `Unknown table: ${tableName}` };
  }
  if (aSlug === bSlug) {
    return { ok: false, error: 'slugs are identical' };
  }

  const [slugLow, slugHigh] = aSlug < bSlug ? [aSlug, bSlug] : [bSlug, aSlug];
  try {
    await db.execute(sql`
      INSERT INTO ignored_duplicates (table_name, slug_low, slug_high, ignored_by)
      VALUES (${tableName}, ${slugLow}, ${slugHigh}, ${session.user.id}::uuid)
      ON CONFLICT (table_name, slug_low, slug_high) DO NOTHING
    `);
    revalidatePath('/admin/health/duplicates');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
