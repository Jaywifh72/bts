import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createTestDb, resetTestSchema } from './helpers.ts';
import { runSeed } from '../seed/run.ts';
import { getEquipmentUsedByPerson } from '../queries/people.ts';
import { getCrewForSeries, getCrewForItem } from '../queries/equipment.ts';

const { sql, db } = createTestDb();

beforeAll(async () => {
  await resetTestSchema(sql);
  await migrate(db, { migrationsFolder: './migrations' });
  await runSeed(db);
}, 120_000);

afterAll(async () => { await sql.end(); });

describe('cross-reference queries', () => {
  describe('getEquipmentUsedByPerson', () => {
    it('returns the gear Greig Fraser shot on (incl. DNA LF Vintage)', async () => {
      const rows = await getEquipmentUsedByPerson(db, 'greig-fraser');
      expect(rows.length).toBeGreaterThan(0);
      const seriesSlugs = rows.map((r) => r.series_slug);
      expect(seriesSlugs).toContain('arri-rental-dna-lf-vintage');
      expect(seriesSlugs).toContain('arri-alexa-mini-lf-series');
    });

    it('orders by production_count DESC then scene_count DESC', async () => {
      const rows = await getEquipmentUsedByPerson(db, 'greig-fraser');
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1]!;
        const curr = rows[i]!;
        if (prev.production_count !== curr.production_count) {
          expect(prev.production_count).toBeGreaterThanOrEqual(curr.production_count);
        } else {
          expect(prev.scene_count).toBeGreaterThanOrEqual(curr.scene_count);
        }
      }
    });

    it('returns nothing for non-camera-crew people (e.g., directors with no DP role)', async () => {
      // A pure director (with no DP role) would have no rows. We use a known
      // case: someone like Yorgos Lanthimos crewed only as director on his
      // films, so r.category = 'camera' filter excludes him.
      const rows = await getEquipmentUsedByPerson(db, 'yorgos-lanthimos');
      // Either no rows, or none from non-camera roles.
      expect(rows.length).toBe(0);
    });
  });

  describe('getCrewForSeries', () => {
    it('returns Greig Fraser among crew for arri-rental-dna-lf-vintage', async () => {
      const rows = await getCrewForSeries(db, 'arri-rental-dna-lf-vintage');
      const slugs = rows.map((r) => r.person_slug);
      expect(slugs).toContain('greig-fraser');
    });

    it('returns Hoyte van Hoytema and others for arri-alexa-65-series', async () => {
      const rows = await getCrewForSeries(db, 'arri-alexa-65-series');
      const slugs = rows.map((r) => r.person_slug);
      expect(slugs).toContain('hoyte-van-hoytema');
      expect(slugs).toContain('emmanuel-lubezki');
    });

    it('only includes camera-department crew', async () => {
      const rows = await getCrewForSeries(db, 'arri-rental-dna-lf-vintage');
      expect(rows.every((r) => r.role_category === 'camera')).toBe(true);
    });

    it('orders by production_count DESC', async () => {
      const rows = await getCrewForSeries(db, 'arri-rental-dna-lf-vintage');
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i - 1]!.production_count).toBeGreaterThanOrEqual(rows[i]!.production_count);
      }
    });
  });

  describe('getCrewForItem', () => {
    it('returns crew for a specific ARRI ALEXA 65 body', async () => {
      const rows = await getCrewForItem(db, 'arri-alexa-65');
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.role_category === 'camera')).toBe(true);
    });
  });
});
