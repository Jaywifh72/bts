import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { db as defaultDb, sql as defaultSql } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { seedManufacturers } from './data/manufacturers.ts';
import { seedRoles } from './data/roles.ts';
import { seedStudios } from './data/studios.ts';
import { seedSeries } from './data/series.ts';
import { seedItems } from './data/items.ts';
import { seedPeople } from './data/people.ts';
import { seedSources } from './data/sources.ts';
import { seedProductions } from './data/productions.ts';
import { seedScenes } from './data/scenes.ts';
import { seedCrew } from './data/crew.ts';
import { seedEquipmentUsage } from './data/equipment-usage.ts';
import { seedAttributions } from './data/attributions.ts';
import { seedVfxTechniques } from './data/vfx-techniques.ts';

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
  { name: 'people', run: async (db) => { await seedPeople(db); } },
  { name: 'sources', run: async (db) => { await seedSources(db); } },
  { name: 'productions', run: async (db) => { await seedProductions(db); } },
  { name: 'scenes', run: async (db) => { await seedScenes(db); } },
  { name: 'crew', run: async (db) => { await seedCrew(db); } },
  { name: 'equipment_usage', run: async (db) => { await seedEquipmentUsage(db); } },
  { name: 'attributions', run: async (db) => { await seedAttributions(db); } },
  { name: 'vfx_techniques', run: async (db) => { await seedVfxTechniques(db); } },
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
// pathToFileURL handles both platforms correctly:
//   • Windows: process.argv[1] = "C:\\..." → "file:///C:/..."
//   • Linux:   process.argv[1] = "/home/..." → "file:///home/..."
// The earlier `file:///${path.replace(/\\/g, '/')}` produced "file:////home/..."
// (four slashes) on Linux, which never matched import.meta.url's three. That
// silently disabled the CLI entry in CI, which is why GitHub Actions saw the
// seed step finish in 1s with no rows inserted.
const invokedPath = process.argv[1];
const _argv1AsUrl = invokedPath ? pathToFileURL(invokedPath).href : null;
if (import.meta.url === _argv1AsUrl) {
  runSeed(defaultDb)
    .then(() => defaultSql.end())
    .catch((e) => {
      try {
        console.error('seed failed:', e instanceof Error ? `${e.message}\n${e.stack}` : String(e));
      } catch {
        console.error('seed failed (error unprintable):', typeof e, Object.keys(e ?? {}));
      }
      process.exit(1);
    });
}
