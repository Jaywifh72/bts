import { describe, it, expect, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createTestDb, expectOne, resetTestSchema } from './helpers.ts';

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
    // Assert a minimum table count + presence of canonical tables. Hard-coding the
    // exact count was a constant source of bit-rot — every new migration broke
    // this test. The presence list catches structural regressions (e.g. someone
    // accidentally drops a major table) without needing manual updates.
    const REQUIRED_TABLES = [
      'productions', 'people', 'crew_assignments', 'roles',
      'equipment_manufacturers', 'equipment_series', 'equipment_items', 'equipment_usage',
      'scenes', 'sources',
      'production_studios', 'studios', 'production_formats',
      'post_houses', 'production_post_houses',
      'production_keyframes', 'production_awards',
      'production_locations',
      'lighting_setups', 'production_color_pipelines',
      'vfx_houses', 'vfx_credits', 'vfx_techniques',
      'production_videos',
      'stunt_sequences', 'safety_bulletins',
      'media_assets', 'media_associations',
      'claims', 'evidence_items',
    ];
    for (const table of REQUIRED_TABLES) {
      expect(tables, `expected table "${table}" to exist after migrate`).toContain(table);
    }
    // Loose upper bound — catches "migration creates 100 tables by accident"
    expect(tables.length).toBeGreaterThanOrEqual(REQUIRED_TABLES.length);
    expect(tables.length).toBeLessThan(120);
  }, 30_000);

  it('migrations are idempotent (re-applying does nothing)', async () => {
    await resetTestSchema(sql);
    await migrate(db, { migrationsFolder: './migrations' });
    const before = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations`;
    await migrate(db, { migrationsFolder: './migrations' });
    const after = await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM drizzle.__drizzle_migrations`;
    expect(expectOne(after, 'migration count after').c).toBe(expectOne(before, 'migration count before').c);
  }, 30_000);
});
