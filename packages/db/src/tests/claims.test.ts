import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql as drizzleSql } from 'drizzle-orm';
import { createTestDb, expectOne, resetTestSchema } from './helpers.ts';
import { runSeed } from '../seed/run.ts';
import {
  attachClaimEntity,
  attachClaimSource,
  createClaim,
  getClaimDetail,
  getClaimsForGear,
  getClaimsForProduction,
  updateClaimStatus,
} from '../queries/claims.ts';
import { backfillClaimsFromCuratedData } from '../../scripts/backfill-claims.ts';

const { sql, db } = createTestDb();

beforeAll(async () => {
  await resetTestSchema(sql);
  await migrate(db, { migrationsFolder: './migrations' });
  await runSeed(db);
}, 120_000);

afterAll(async () => { await sql.end(); });

describe('claims queries', () => {
  it('creates claims, attaches provenance, and looks them up by production', async () => {
    const production = expectOne(await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM productions WHERE slug = 'dune-part-two-2024'
    `), 'dune-part-two-2024 production');
    const source = expectOne(await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM sources ORDER BY id LIMIT 1
    `), 'seed source');

    const claimId = await createClaim(db, {
      slug: 'test-dune-claims-alexa-65',
      claimType: 'production_camera',
      statement: 'Dune: Part Two used ALEXA 65 cameras for desert photography.',
      status: 'sourced',
      confidence: 'primary',
    });
    await attachClaimEntity(db, {
      claimId,
      entityType: 'production',
      entityId: production.id,
      entitySlug: 'dune-part-two-2024',
    });
    const sourceLinkId = await attachClaimSource(db, {
      claimId,
      sourceId: source.id,
      confidence: 'primary',
      quote: 'ALEXA 65 camera package.',
    });
    const duplicateSourceLinkId = await attachClaimSource(db, {
      claimId,
      sourceId: source.id,
      confidence: 'primary',
      quote: 'ALEXA 65 camera package.',
    });
    expect(duplicateSourceLinkId).toBe(sourceLinkId);

    const claims = await getClaimsForProduction(db, production.id);
    const claim = claims.find((row) => row.id === claimId);
    expect(claim?.statement).toContain('ALEXA 65');
    expect(claim?.source_count).toBe(1);

    await updateClaimStatus(db, claimId, 'verified', { verifiedBy: 'vitest' });
    const detail = await getClaimDetail(db, claimId);
    expect(detail?.status).toBe('verified');
    expect(detail?.verified_by).toBe('vitest');
    expect(detail?.last_verified_at).toBeTruthy();
    expect(detail?.sources).toHaveLength(1);
    expect(detail?.entities.map((entity) => entity.entity_type)).toContain('production');
  });

  it('does not double-count sources when a gear claim matches multiple entities', async () => {
    const gear = expectOne(await db.execute<{
      manufacturer_id: number;
      manufacturer_slug: string;
      series_id: number;
      series_slug: string;
    }>(drizzleSql`
      SELECT em.id AS manufacturer_id, em.slug AS manufacturer_slug,
             es.id AS series_id, es.slug AS series_slug
      FROM equipment_series es
      JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
      ORDER BY es.id
      LIMIT 1
    `), 'seed gear');
    const source = expectOne(await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM sources ORDER BY id LIMIT 1
    `), 'seed source');

    const claimId = await createClaim(db, {
      slug: 'test-gear-source-count',
      claimType: 'gear_spec',
      statement: 'A test gear spec has one supporting source.',
      status: 'sourced',
      confidence: 'secondary',
    });
    await attachClaimEntity(db, {
      claimId,
      entityType: 'equipment_manufacturer',
      entityId: gear.manufacturer_id,
      entitySlug: gear.manufacturer_slug,
    });
    await attachClaimEntity(db, {
      claimId,
      entityType: 'equipment_series',
      entityId: gear.series_id,
      entitySlug: gear.series_slug,
    });
    await attachClaimSource(db, {
      claimId,
      sourceId: source.id,
      confidence: 'secondary',
    });

    const rows = await getClaimsForGear(db, {
      manufacturerId: gear.manufacturer_id,
      seriesId: gear.series_id,
    });
    const claim = rows.find((row) => row.id === claimId);
    expect(claim?.source_count).toBe(1);
  });

  it('backfills curated rows idempotently', async () => {
    const first = await backfillClaimsFromCuratedData(db);
    expect(first.total).toBeGreaterThan(0);

    const beforeSecond = expectOne(await db.execute<{ count: string }>(drizzleSql`
      SELECT COUNT(*)::text AS count FROM claims
      WHERE slug LIKE 'production-format-%'
         OR slug LIKE 'equipment-usage-%'
         OR slug LIKE 'vfx-credit-%'
         OR slug LIKE 'color-pipeline-%'
         OR slug LIKE 'lighting-setup-%'
         OR slug LIKE 'post-house-%'
    `), 'backfilled claim count');

    const second = await backfillClaimsFromCuratedData(db);
    const afterSecond = expectOne(await db.execute<{ count: string }>(drizzleSql`
      SELECT COUNT(*)::text AS count FROM claims
      WHERE slug LIKE 'production-format-%'
         OR slug LIKE 'equipment-usage-%'
         OR slug LIKE 'vfx-credit-%'
         OR slug LIKE 'color-pipeline-%'
         OR slug LIKE 'lighting-setup-%'
         OR slug LIKE 'post-house-%'
    `), 'backfilled claim count after rerun');

    expect(second.total).toBe(first.total);
    expect(afterSecond.count).toBe(beforeSecond.count);

    const backfilled = expectOne(await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM claims WHERE slug LIKE 'production-format-%' LIMIT 1
    `), 'backfilled production-format claim');
    await updateClaimStatus(db, backfilled.id, 'verified', { verifiedBy: 'vitest' });
    await backfillClaimsFromCuratedData(db);
    const preserved = expectOne(await db.execute<{ status: string; verified_by: string | null }>(drizzleSql`
      SELECT status, verified_by FROM claims WHERE id = ${backfilled.id}
    `), 'preserved backfilled claim');
    expect(preserved.status).toBe('verified');
    expect(preserved.verified_by).toBe('vitest');
  });
});
