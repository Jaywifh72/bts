import 'dotenv/config';
import { db as defaultDb, sql as defaultSql } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { seedManufacturers } from './data/manufacturers.ts';
import { seedRoles } from './data/roles.ts';
import { seedStudios } from './data/studios.ts';
import { seedSeries } from './data/series.ts';
import { seedItems } from './data/items.ts';

export type SeedDb = PostgresJsDatabase<Record<string, never>>;
export type Step = { name: string; run: (db: SeedDb) => Promise<void> };

// Tasks 15-25 each push one step into this array. Order matters:
//   1. manufacturers   2. roles          3. studios
//   4. series          5. items          6. people
//   7. sources         8. productions (+ formats + studios link)
//   9. scenes         10. crew_assignments
//  11. equipment_usage 12. attributions (all four _sources)
export const steps: Step[] = [
  { name: 'manufacturers', run: async (db) => { await seedManufacturers(db); } },
  { name: 'roles', run: async (db) => { await seedRoles(db); } },
  { name: 'studios', run: async (db) => { await seedStudios(db); } },
  { name: 'series', run: async (db) => { await seedSeries(db); } },
  { name: 'items', run: async (db) => { await seedItems(db); } },
];

export async function runSeed(db: SeedDb = defaultDb): Promise<void> {
  console.log(`seed: running ${steps.length} step(s)`);
  for (const step of steps) {
    const t0 = Date.now();
    await step.run(db);
    console.log(`  ✓ ${step.name} (${Date.now() - t0}ms)`);
  }
  console.log('seed: done');
}

// CLI entry: only when this file is invoked directly via `tsx src/seed/run.ts`.
// On Windows, process.argv[1] uses backslashes (C:\...) while import.meta.url
// uses forward slashes (file:///C:/...). Normalise both sides for comparison.
const _argv1AsUrl = `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (import.meta.url === _argv1AsUrl) {
  runSeed(defaultDb)
    .then(() => defaultSql.end())
    .catch((e) => { console.error('seed failed:', e); process.exit(1); });
}
