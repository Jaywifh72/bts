import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq } from 'drizzle-orm';
import { createTestDb, expectOne, resetTestSchema } from './helpers.ts';

// Walk an error's `cause` chain looking for a foreign-key violation.
//
// Drizzle 0.36 surfaced the raw postgres-js error directly, so its `message`
// contained "foreign key constraint". Drizzle 0.45 wraps queries with a new
// Error whose message is "Failed query: <SQL>" and stashes the original on
// `.cause` (this is the wrapper introduced alongside the sql.identifier()
// SQL-injection patch). Match either shape, and prefer the postgres-js error
// code 23503 (foreign_key_violation) when we can find it.
function isFkViolation(err: unknown): boolean {
  let cur: unknown = err;
  while (cur) {
    const e = cur as { code?: string; message?: string; cause?: unknown };
    if (e.code === '23503') return true;
    if (typeof e.message === 'string' && /foreign key/i.test(e.message)) return true;
    cur = e.cause;
  }
  return false;
}

async function expectFkViolation(p: Promise<unknown>): Promise<void> {
  try {
    await p;
    throw new Error('Expected a foreign-key violation, got resolved promise');
  } catch (err) {
    if (!isFkViolation(err)) throw err;
  }
}
import {
  productions, scenes, productionFormats, productionStudios, productionSources,
  studios, people, roles, crewAssignments, crewAssignmentSources,
  equipmentManufacturers, equipmentSeries, equipmentItems,
  equipmentUsage, equipmentUsageSources,
  sources, sceneSources,
  vfxHouses, vfxCredits, vfxTechniques,
  productionVfxTechniques, vfxHouseSources,
  productionVideos,
} from '../schema/index.ts';

const { sql, db } = createTestDb();

beforeAll(async () => {
  await resetTestSchema(sql);
  await migrate(db, { migrationsFolder: './migrations' });
}, 60_000);

afterAll(async () => { await sql.end(); });

// Each test uses unique slugs — no per-test schema reset needed.

describe('cascade matrix — direct edges', () => {
  it('production deletion CASCADEs to scenes', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-1', type: 'feature', title: 'Test' }).returning(), 'p');
    await db.insert(scenes).values({ productionId: p.id, slug: 's1', title: 'S' });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(scenes).where(eq(scenes.productionId, p.id));
    expect(orphans.length).toBe(0);
  });

  it('production deletion CASCADEs to production_formats', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-2', type: 'feature', title: 'Test' }).returning(), 'p');
    await db.insert(productionFormats).values({
      productionId: p.id, aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW', isPrimary: true,
    });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(productionFormats).where(eq(productionFormats.productionId, p.id));
    expect(orphans.length).toBe(0);
  });

  it('production deletion CASCADEs to production_studios', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-3', type: 'feature', title: 'Test' }).returning(), 'p');
    const s = expectOne(await db.insert(studios).values({ slug: 'casc-s-3', name: 'TestStudio', kind: 'studio' }).returning(), 's');
    await db.insert(productionStudios).values({ productionId: p.id, studioId: s.id, role: 'distributor' });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(productionStudios).where(eq(productionStudios.productionId, p.id));
    expect(orphans.length).toBe(0);
    // studio itself should remain
    await db.delete(studios).where(eq(studios.id, s.id));
  });

  it('production deletion CASCADEs to production_sources', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-4', type: 'feature', title: 'Test' }).returning(), 'p');
    const src = expectOne(await db.insert(sources).values({ slug: 'casc-src-4', kind: 'wiki', title: 'S' }).returning(), 'src');
    await db.insert(productionSources).values({ productionId: p.id, sourceId: src.id, confidence: 'primary' });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(productionSources).where(eq(productionSources.productionId, p.id));
    expect(orphans.length).toBe(0);
    await db.delete(sources).where(eq(sources.id, src.id));
  });

  it('scene deletion CASCADEs to equipment_usage', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-5', type: 'feature', title: 'Test' }).returning(), 'p');
    const sc = expectOne(await db.insert(scenes).values({ productionId: p.id, slug: 's1', title: 'S' }).returning(), 'sc');
    const m = expectOne(await db.insert(equipmentManufacturers).values({ slug: 'casc-m-5', name: 'M', kind: 'manufacturer' }).returning(), 'm');
    const es = expectOne(await db.insert(equipmentSeries).values({ slug: 'casc-es-5', name: 'ES', category: 'camera_body', manufacturerId: m.id }).returning(), 'es');
    await db.insert(equipmentUsage).values({ sceneId: sc.id, equipmentSeriesId: es.id });
    await db.delete(scenes).where(eq(scenes.id, sc.id));
    const orphans = await db.select().from(equipmentUsage).where(eq(equipmentUsage.sceneId, sc.id));
    expect(orphans.length).toBe(0);
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(equipmentSeries).where(eq(equipmentSeries.id, es.id));
    await db.delete(equipmentManufacturers).where(eq(equipmentManufacturers.id, m.id));
  });

  it('scene deletion CASCADEs to scene_sources', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-6', type: 'feature', title: 'Test' }).returning(), 'p');
    const sc = expectOne(await db.insert(scenes).values({ productionId: p.id, slug: 's1', title: 'S' }).returning(), 'sc');
    const src = expectOne(await db.insert(sources).values({ slug: 'casc-src-6', kind: 'wiki', title: 'S' }).returning(), 'src');
    await db.insert(sceneSources).values({ sceneId: sc.id, sourceId: src.id, confidence: 'primary' });
    await db.delete(scenes).where(eq(scenes.id, sc.id));
    const orphans = await db.select().from(sceneSources).where(eq(sceneSources.sceneId, sc.id));
    expect(orphans.length).toBe(0);
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(sources).where(eq(sources.id, src.id));
  });

  it('crew_assignment deletion CASCADEs to crew_assignment_sources', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-7', type: 'feature', title: 'Test' }).returning(), 'p');
    const person = expectOne(await db.insert(people).values({ slug: 'casc-pp-7', displayName: 'P' }).returning(), 'person');
    const role = expectOne(await db.insert(roles).values({ slug: 'casc-r-7', name: 'R', category: 'production' }).returning(), 'role');
    const src = expectOne(await db.insert(sources).values({ slug: 'casc-src-7', kind: 'wiki', title: 'S' }).returning(), 'src');
    const ca = expectOne(await db.insert(crewAssignments).values({ productionId: p.id, personId: person.id, roleId: role.id }).returning(), 'ca');
    await db.insert(crewAssignmentSources).values({ crewAssignmentId: ca.id, sourceId: src.id, confidence: 'primary' });
    await db.delete(crewAssignments).where(eq(crewAssignments.id, ca.id));
    const orphans = await db.select().from(crewAssignmentSources).where(eq(crewAssignmentSources.crewAssignmentId, ca.id));
    expect(orphans.length).toBe(0);
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(people).where(eq(people.id, person.id));
    await db.delete(roles).where(eq(roles.id, role.id));
    await db.delete(sources).where(eq(sources.id, src.id));
  });

  it('production deletion CASCADEs to production_videos', async () => {
    const p = expectOne(await db.insert(productions)
      .values({ slug: 'casc-vid-1', type: 'feature', title: 'Test' })
      .returning(), 'p');
    await db.insert(productionVideos).values({
      productionId: p.id,
      source: 'youtube',
      externalId: 'abc123',
      url: 'https://www.youtube.com/watch?v=abc123',
      title: 'Test Video',
      category: 'vfx_breakdown',
      confidenceScore: '0.800',
      status: 'published',
    });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db
      .select()
      .from(productionVideos)
      .where(eq(productionVideos.productionId, p.id));
    expect(orphans.length).toBe(0);
  });

  it('equipment_usage deletion CASCADEs to equipment_usage_sources', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-p-8', type: 'feature', title: 'Test' }).returning(), 'p');
    const sc = expectOne(await db.insert(scenes).values({ productionId: p.id, slug: 's1', title: 'S' }).returning(), 'sc');
    const m = expectOne(await db.insert(equipmentManufacturers).values({ slug: 'casc-m-8', name: 'M', kind: 'manufacturer' }).returning(), 'm');
    const es = expectOne(await db.insert(equipmentSeries).values({ slug: 'casc-es-8', name: 'ES', category: 'camera_body', manufacturerId: m.id }).returning(), 'es');
    const eu = expectOne(await db.insert(equipmentUsage).values({ sceneId: sc.id, equipmentSeriesId: es.id }).returning(), 'eu');
    const src = expectOne(await db.insert(sources).values({ slug: 'casc-src-8', kind: 'wiki', title: 'S' }).returning(), 'src');
    await db.insert(equipmentUsageSources).values({ equipmentUsageId: eu.id, sourceId: src.id, confidence: 'primary' });
    await db.delete(equipmentUsage).where(eq(equipmentUsage.id, eu.id));
    const orphans = await db.select().from(equipmentUsageSources).where(eq(equipmentUsageSources.equipmentUsageId, eu.id));
    expect(orphans.length).toBe(0);
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(equipmentSeries).where(eq(equipmentSeries.id, es.id));
    await db.delete(equipmentManufacturers).where(eq(equipmentManufacturers.id, m.id));
    await db.delete(sources).where(eq(sources.id, src.id));
  });
});

describe('cascade matrix — RESTRICT edges', () => {
  it('person deletion is RESTRICTED when person has crew_assignments', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-r-p-1', type: 'feature', title: 'T' }).returning(), 'p');
    const person = expectOne(await db.insert(people).values({ slug: 'casc-r-pp-1', displayName: 'P' }).returning(), 'person');
    const role = expectOne(await db.insert(roles).values({ slug: 'casc-r-rr-1', name: 'R', category: 'production' }).returning(), 'role');
    await db.insert(crewAssignments).values({ productionId: p.id, personId: person.id, roleId: role.id });
    await expectFkViolation(db.delete(people).where(eq(people.id, person.id)));
    // Cleanup: delete production first (cascades crew_assignments), then person/role
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(people).where(eq(people.id, person.id));
    await db.delete(roles).where(eq(roles.id, role.id));
  });

  it('equipment_item deletion is RESTRICTED when item has equipment_usage', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-r-p-2', type: 'feature', title: 'T' }).returning(), 'p');
    const sc = expectOne(await db.insert(scenes).values({ productionId: p.id, slug: 's', title: 'S' }).returning(), 'sc');
    const m = expectOne(await db.insert(equipmentManufacturers).values({ slug: 'casc-r-m-2', name: 'M', kind: 'manufacturer' }).returning(), 'm');
    const es = expectOne(await db.insert(equipmentSeries).values({ slug: 'casc-r-es-2', name: 'ES', category: 'camera_body', manufacturerId: m.id }).returning(), 'es');
    const it = expectOne(await db.insert(equipmentItems).values({ slug: 'casc-r-it-2', name: 'IT', seriesId: es.id, status: 'active' }).returning(), 'it');
    await db.insert(equipmentUsage).values({ sceneId: sc.id, equipmentSeriesId: es.id, equipmentItemId: it.id });
    await expectFkViolation(db.delete(equipmentItems).where(eq(equipmentItems.id, it.id)));
    // Cleanup: production cascade wipes scenes+equipment_usage, then items/series/manufacturer
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(equipmentItems).where(eq(equipmentItems.id, it.id));
    await db.delete(equipmentSeries).where(eq(equipmentSeries.id, es.id));
    await db.delete(equipmentManufacturers).where(eq(equipmentManufacturers.id, m.id));
  });

  it('equipment_series deletion is RESTRICTED when it has items', async () => {
    const m = expectOne(await db.insert(equipmentManufacturers).values({ slug: 'casc-r-m-3', name: 'M', kind: 'manufacturer' }).returning(), 'm');
    const es = expectOne(await db.insert(equipmentSeries).values({ slug: 'casc-r-es-3', name: 'ES', category: 'camera_body', manufacturerId: m.id }).returning(), 'es');
    await db.insert(equipmentItems).values({ slug: 'casc-r-it-3', name: 'IT', seriesId: es.id, status: 'active' });
    await expectFkViolation(db.delete(equipmentSeries).where(eq(equipmentSeries.id, es.id)));
    await db.delete(equipmentItems).where(eq(equipmentItems.seriesId, es.id));
    await db.delete(equipmentSeries).where(eq(equipmentSeries.id, es.id));
    await db.delete(equipmentManufacturers).where(eq(equipmentManufacturers.id, m.id));
  });

  it('equipment_manufacturer deletion is RESTRICTED when it has series', async () => {
    const m = expectOne(await db.insert(equipmentManufacturers).values({ slug: 'casc-r-m-4', name: 'M', kind: 'manufacturer' }).returning(), 'm');
    await db.insert(equipmentSeries).values({ slug: 'casc-r-es-4', name: 'ES', category: 'camera_body', manufacturerId: m.id });
    await expectFkViolation(db.delete(equipmentManufacturers).where(eq(equipmentManufacturers.id, m.id)));
    await db.delete(equipmentSeries).where(eq(equipmentSeries.manufacturerId, m.id));
    await db.delete(equipmentManufacturers).where(eq(equipmentManufacturers.id, m.id));
  });

  it('studio deletion is RESTRICTED when it has production_studios links', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-r-p-5', type: 'feature', title: 'T' }).returning(), 'p');
    const s = expectOne(await db.insert(studios).values({ slug: 'casc-r-s-5', name: 'S', kind: 'studio' }).returning(), 's');
    await db.insert(productionStudios).values({ productionId: p.id, studioId: s.id, role: 'distributor' });
    await expectFkViolation(db.delete(studios).where(eq(studios.id, s.id)));
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(studios).where(eq(studios.id, s.id));
  });

  it('role deletion is RESTRICTED when it has crew_assignments', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-r-p-6', type: 'feature', title: 'T' }).returning(), 'p');
    const person = expectOne(await db.insert(people).values({ slug: 'casc-r-pp-6', displayName: 'P' }).returning(), 'person');
    const role = expectOne(await db.insert(roles).values({ slug: 'casc-r-rr-6', name: 'R', category: 'production' }).returning(), 'role');
    await db.insert(crewAssignments).values({ productionId: p.id, personId: person.id, roleId: role.id });
    await expectFkViolation(db.delete(roles).where(eq(roles.id, role.id)));
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(people).where(eq(people.id, person.id));
    await db.delete(roles).where(eq(roles.id, role.id));
  });

  it('source deletion is RESTRICTED when it has attributions', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-r-p-7', type: 'feature', title: 'T' }).returning(), 'p');
    const src = expectOne(await db.insert(sources).values({ slug: 'casc-r-src-7', kind: 'wiki', title: 'S' }).returning(), 'src');
    await db.insert(productionSources).values({ productionId: p.id, sourceId: src.id, confidence: 'primary' });
    await expectFkViolation(db.delete(sources).where(eq(sources.id, src.id)));
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(sources).where(eq(sources.id, src.id));
  });
});

describe('cascade matrix — transitive', () => {
  it('deleting a production cascades through scenes -> equipment_usage -> equipment_usage_sources', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-t-p-1', type: 'feature', title: 'T' }).returning(), 'p');
    const sc = expectOne(await db.insert(scenes).values({ productionId: p.id, slug: 's', title: 'S' }).returning(), 'sc');
    const m = expectOne(await db.insert(equipmentManufacturers).values({ slug: 'casc-t-m-1', name: 'M', kind: 'manufacturer' }).returning(), 'm');
    const es = expectOne(await db.insert(equipmentSeries).values({ slug: 'casc-t-es-1', name: 'ES', category: 'camera_body', manufacturerId: m.id }).returning(), 'es');
    const eu = expectOne(await db.insert(equipmentUsage).values({ sceneId: sc.id, equipmentSeriesId: es.id }).returning(), 'eu');
    const src = expectOne(await db.insert(sources).values({ slug: 'casc-t-src-1', kind: 'wiki', title: 'S' }).returning(), 'src');
    await db.insert(equipmentUsageSources).values({ equipmentUsageId: eu.id, sourceId: src.id, confidence: 'primary' });

    // Delete the production at the top of the chain
    await db.delete(productions).where(eq(productions.id, p.id));

    // Everything below should be gone
    expect((await db.select().from(scenes).where(eq(scenes.id, sc.id))).length).toBe(0);
    expect((await db.select().from(equipmentUsage).where(eq(equipmentUsage.id, eu.id))).length).toBe(0);
    expect((await db.select().from(equipmentUsageSources).where(eq(equipmentUsageSources.equipmentUsageId, eu.id))).length).toBe(0);

    // The source itself should remain (RESTRICT on source side, but CASCADE removed the join row first)
    expect((await db.select().from(sources).where(eq(sources.id, src.id))).length).toBe(1);

    await db.delete(sources).where(eq(sources.id, src.id));
    await db.delete(equipmentSeries).where(eq(equipmentSeries.id, es.id));
    await db.delete(equipmentManufacturers).where(eq(equipmentManufacturers.id, m.id));
  });
});

describe('cascade matrix — VFX tables', () => {
  it('production deletion CASCADEs to vfx_credits', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-vfx-p-1', type: 'feature', title: 'T' }).returning(), 'p');
    const h = expectOne(await db.insert(vfxHouses).values({ slug: 'casc-vfx-h-1', name: 'TestHouse' }).returning(), 'h');
    await db.insert(vfxCredits).values({ productionId: p.id, vfxHouseId: h.id, role: 'primary' });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(vfxCredits).where(eq(vfxCredits.productionId, p.id));
    expect(orphans.length).toBe(0);
    await db.delete(vfxHouses).where(eq(vfxHouses.id, h.id));
  });

  it('production deletion CASCADEs to production_vfx_techniques', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-vfx-p-2', type: 'feature', title: 'T' }).returning(), 'p');
    const t = expectOne(await db.insert(vfxTechniques).values({ slug: 'casc-vfx-t-2', name: 'Test', category: 'creature' }).returning(), 't');
    await db.insert(productionVfxTechniques).values({ productionId: p.id, techniqueId: t.id });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(productionVfxTechniques).where(eq(productionVfxTechniques.productionId, p.id));
    expect(orphans.length).toBe(0);
    await db.delete(vfxTechniques).where(eq(vfxTechniques.id, t.id));
  });

  it('vfx_house deletion CASCADEs to vfx_house_sources', async () => {
    const h = expectOne(await db.insert(vfxHouses).values({ slug: 'casc-vfx-h-3', name: 'H' }).returning(), 'h');
    const src = expectOne(await db.insert(sources).values({ slug: 'casc-vfx-src-3', kind: 'wiki', title: 'S' }).returning(), 'src');
    await db.insert(vfxHouseSources).values({ vfxHouseId: h.id, sourceId: src.id, confidence: 'primary' });
    await db.delete(vfxHouses).where(eq(vfxHouses.id, h.id));
    const orphans = await db.select().from(vfxHouseSources).where(eq(vfxHouseSources.vfxHouseId, h.id));
    expect(orphans.length).toBe(0);
    await db.delete(sources).where(eq(sources.id, src.id));
  });

  it('vfx_house deletion is RESTRICTED when it has vfx_credits', async () => {
    const p = expectOne(await db.insert(productions).values({ slug: 'casc-vfx-r-p-1', type: 'feature', title: 'T' }).returning(), 'p');
    const h = expectOne(await db.insert(vfxHouses).values({ slug: 'casc-vfx-r-h-1', name: 'H' }).returning(), 'h');
    await db.insert(vfxCredits).values({ productionId: p.id, vfxHouseId: h.id, role: 'primary' });
    await expectFkViolation(db.delete(vfxHouses).where(eq(vfxHouses.id, h.id)));
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(vfxHouses).where(eq(vfxHouses.id, h.id));
  });
});
