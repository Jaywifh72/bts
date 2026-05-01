import { describe, it, expect, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createTestDb, resetTestSchema } from './helpers.ts';

const { sql, db } = createTestDb();

afterAll(async () => { await sql.end(); });

describe('migration sanity', () => {
  it('all migrations apply forward against an empty database', async () => {
    await resetTestSchema(sql);
    await migrate(db, { migrationsFolder: './migrations' });
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const tables = rows.map((r) => r.table_name);
    expect(tables.length).toBe(22);
  }, 30_000);

  it('migrations are idempotent (re-applying does nothing)', async () => {
    await resetTestSchema(sql);
    await migrate(db, { migrationsFolder: './migrations' });
    const before = await sql`SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations` as unknown as { c: number }[];
    await migrate(db, { migrationsFolder: './migrations' });
    const after = await sql`SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations` as unknown as { c: number }[];
    expect(after[0].c).toBe(before[0].c);
  }, 30_000);
});
