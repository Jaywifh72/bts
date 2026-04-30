import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createTestDb, resetTestSchema } from './helpers.ts';
import { runSeed } from '../seed/run.ts';
import {
  findFeaturesShotOnAlexa65WithSphero,
  findLensesByDpOnProduction,
  findMagicHourExteriorLightingByYear,
} from '../queries/killer-queries.ts';

const { sql, db } = createTestDb();

beforeAll(async () => {
  await resetTestSchema(sql);
  await migrate(db, { migrationsFolder: './migrations' });
  await runSeed(db);
}, 120_000);

afterAll(async () => { await sql.end(); });

describe('killer queries', () => {
  it('Q1 returns The Revenant for ALEXA 65 + Panavision Sphero', async () => {
    const rows = await findFeaturesShotOnAlexa65WithSphero(db);
    const titles = rows.map((r: any) => r.title);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(titles).toContain('The Revenant');
  });

  it('Q2 returns DNA LF Vintage Primes for Greig Fraser on Dune: Part Two', async () => {
    const rows = await findLensesByDpOnProduction(db, 'greig-fraser', 'dune-part-two-2024');
    const seriesSlugs = rows.map((r: any) => r.series_slug);
    expect(seriesSlugs).toContain('arri-rental-dna-lf-vintage');
  });

  it('Q3 returns magic-hour exterior lighting from 2023 features', async () => {
    const rows = await findMagicHourExteriorLightingByYear(db, 2023);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
