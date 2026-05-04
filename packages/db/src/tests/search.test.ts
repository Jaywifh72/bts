import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createTestDb, resetTestSchema } from './helpers.ts';
import { runSeed } from '../seed/run.ts';
import { search } from '../queries/search.ts';

const { sql, db } = createTestDb();

beforeAll(async () => {
  await resetTestSchema(sql);
  await migrate(db, { migrationsFolder: './migrations' });
  await runSeed(db);
}, 120_000);

afterAll(async () => { await sql.end(); });

describe('search', () => {
  it('returns Dune: Part Two for "dune"', async () => {
    const rows = await search(db, 'dune');
    const productions = rows.filter((r) => r.category === 'production');
    expect(productions.map((r) => r.display)).toContain('Dune: Part Two');
  });

  it('returns Greig Fraser for "greig"', async () => {
    const rows = await search(db, 'greig');
    const people = rows.filter((r) => r.category === 'person');
    expect(people.map((r) => r.display)).toContain('Greig Fraser');
  });

  it('returns ARRI gear for "alexa"', async () => {
    const rows = await search(db, 'alexa');
    const series = rows.filter((r) => r.category === 'series');
    expect(series.length).toBeGreaterThan(0);
    expect(series.some((r) => r.display.includes('ALEXA'))).toBe(true);
  });

  it('finds Cooke via fuzzy match for typo "cookee"', async () => {
    // Trigram similarity: catches transposed/duplicated letters in queries.
    const rows = await search(db, 'cookee');
    const manufacturers = rows.filter((r) => r.category === 'manufacturer');
    expect(manufacturers.map((r) => r.display)).toContain('Cooke Optics');
  });

  it('returns [] for empty query', async () => {
    expect(await search(db, '')).toEqual([]);
    expect(await search(db, '   ')).toEqual([]);
  });

  it('produces ready-to-link hrefs', async () => {
    const rows = await search(db, 'dune');
    const dune = rows.find((r) => r.display === 'Dune: Part Two');
    expect(dune?.href).toMatch(/^\/films\//);
  });

  it('orders results by score DESC overall', async () => {
    const rows = await search(db, 'arri');
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.score).toBeGreaterThanOrEqual(rows[i]!.score);
    }
  });

  it('honours per-category limit', async () => {
    const rows = await search(db, 'a', 3); // very loose query
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    }
    for (const n of counts.values()) {
      expect(n).toBeLessThanOrEqual(3);
    }
  });
});
