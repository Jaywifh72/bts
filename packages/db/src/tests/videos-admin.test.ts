import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql as drizzleSql } from 'drizzle-orm';
import { createTestDb, expectOne, resetTestSchema } from './helpers.ts';
import { runSeed } from '../seed/run.ts';
import {
  listVideosForReview,
  countVideosForReview,
  updateVideoStatus,
  updateVideoCategory,
  rejectVideo,
  bulkUpdateVideoStatus,
  bulkRejectVideos,
} from '../queries/videos.ts';

const { sql, db } = createTestDb();

beforeAll(async () => {
  await resetTestSchema(sql);
  await migrate(db, { migrationsFolder: './migrations' });
  await runSeed(db);

  // Insert a known set of pending/published rows for ordering and filter assertions.
  // We rely on the seeded productions; pick dune-part-two-2024.
  const production = expectOne(await db.execute<{ id: number }>(drizzleSql`
    SELECT id FROM productions WHERE slug = 'dune-part-two-2024'
  `), 'dune-part-two-2024 production');
  const prodId = production.id;

  await db.execute(drizzleSql`
    INSERT INTO production_videos
      (production_id, source, external_id, url, title, category, confidence_score, status)
    VALUES
      (${prodId}, 'youtube', 'pending-high', 'https://x/1', 'High pending',  'vfx_breakdown',     '0.620', 'pending'),
      (${prodId}, 'youtube', 'pending-mid',  'https://x/2', 'Mid pending',   'vfx_breakdown',     '0.500', 'pending'),
      (${prodId}, 'youtube', 'pending-low',  'https://x/3', 'Low pending',   'making_of',         '0.420', 'pending'),
      (${prodId}, 'youtube', 'rejected-1',   'https://x/4', 'Rejected one',  'making_of',         '0.500', 'rejected')
    ON CONFLICT DO NOTHING
  `);
}, 120_000);

afterAll(async () => { await sql.end(); });

describe('videos admin queries', () => {
  it('listVideosForReview defaults to pending sorted by confidence DESC', async () => {
    const rows = await listVideosForReview(db, { status: 'pending' });
    const targets = rows.filter((r) => r.external_id.startsWith('pending-'));
    expect(targets.map((r) => r.external_id)).toEqual([
      'pending-high', 'pending-mid', 'pending-low',
    ]);
  });

  it('listVideosForReview filters by productionSlug', async () => {
    const rows = await listVideosForReview(db, {
      status: 'pending',
      productionSlug: 'dune-part-two-2024',
    });
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.every((r) => r.production_slug === 'dune-part-two-2024')).toBe(true);
  });

  it('listVideosForReview filters by category', async () => {
    const rows = await listVideosForReview(db, {
      status: 'pending',
      productionSlug: 'dune-part-two-2024',
      category: 'making_of',
    });
    expect(rows.every((r) => r.category === 'making_of')).toBe(true);
    expect(rows.map((r) => r.external_id)).toContain('pending-low');
  });

  it('listVideosForReview honours limit and offset', async () => {
    const all = await listVideosForReview(db, {
      status: 'pending',
      productionSlug: 'dune-part-two-2024',
    });
    const page1 = await listVideosForReview(db, {
      status: 'pending',
      productionSlug: 'dune-part-two-2024',
      limit: 2,
      offset: 0,
    });
    const page2 = await listVideosForReview(db, {
      status: 'pending',
      productionSlug: 'dune-part-two-2024',
      limit: 2,
      offset: 2,
    });
    expect(page1.length).toBe(2);
    expect(page1[0]?.id).toBe(all[0]?.id);
    expect(page2[0]?.id).toBe(all[2]?.id);
  });

  it('countVideosForReview matches list length without limit', async () => {
    const all = await listVideosForReview(db, {
      status: 'pending',
      productionSlug: 'dune-part-two-2024',
    });
    const total = await countVideosForReview(db, {
      status: 'pending',
      productionSlug: 'dune-part-two-2024',
    });
    expect(total).toBe(all.length);
  });

  it('updateVideoStatus changes status without touching category_locked', async () => {
    const target = expectOne(await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM production_videos WHERE external_id = 'pending-high' LIMIT 1
    `), 'pending-high video');
    await updateVideoStatus(db, target.id, 'published');
    const after = expectOne(await db.execute<{ status: string; category_locked: boolean }>(drizzleSql`
      SELECT status, category_locked FROM production_videos WHERE id = ${target.id}
    `), 'updated pending-high video');
    expect(after.status).toBe('published');
    expect(after.category_locked).toBe(false);
    // restore for other tests
    await updateVideoStatus(db, target.id, 'pending');
  });

  it('rejectVideo sets status=rejected AND category_locked=true', async () => {
    const target = expectOne(await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM production_videos WHERE external_id = 'pending-mid' LIMIT 1
    `), 'pending-mid video');
    await rejectVideo(db, target.id);
    const after = expectOne(await db.execute<{ status: string; category_locked: boolean }>(drizzleSql`
      SELECT status, category_locked FROM production_videos WHERE id = ${target.id}
    `), 'rejected pending-mid video');
    expect(after.status).toBe('rejected');
    expect(after.category_locked).toBe(true);
  });

  it('updateVideoCategory changes category AND sets category_locked=true', async () => {
    const target = expectOne(await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM production_videos WHERE external_id = 'pending-low' LIMIT 1
    `), 'pending-low video');
    await updateVideoCategory(db, target.id, 'compositing');
    const after = expectOne(await db.execute<{ category: string; category_locked: boolean }>(drizzleSql`
      SELECT category, category_locked FROM production_videos WHERE id = ${target.id}
    `), 'updated pending-low video');
    expect(after.category).toBe('compositing');
    expect(after.category_locked).toBe(true);
  });

  it('bulkUpdateVideoStatus updates many rows in one statement and returns slugs', async () => {
    const prodRows = await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM productions WHERE slug = 'dune-part-two-2024'
    `);
    const prodId = expectOne(prodRows, 'dune-part-two-2024 production').id;
    await db.execute(drizzleSql`
      INSERT INTO production_videos
        (production_id, source, external_id, url, title, category, confidence_score, status)
      VALUES
        (${prodId}, 'youtube', 'bulk-1', 'https://x/b1', 'Bulk one', 'making_of', '0.5', 'pending'),
        (${prodId}, 'youtube', 'bulk-2', 'https://x/b2', 'Bulk two', 'making_of', '0.5', 'pending')
      ON CONFLICT DO NOTHING
    `);
    const targets = await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM production_videos WHERE external_id IN ('bulk-1', 'bulk-2')
    `);
    const ids = targets.map((t) => t.id);

    const slugs = await bulkUpdateVideoStatus(db, ids, 'published');
    expect(slugs).toContain('dune-part-two-2024');

    const idList = drizzleSql.join(ids.map((id) => drizzleSql`${id}`), drizzleSql`, `);
    const after = await db.execute<{ status: string; category_locked: boolean }>(drizzleSql`
      SELECT status, category_locked FROM production_videos WHERE id IN (${idList})
    `);
    expect(after.every((r) => r.status === 'published')).toBe(true);
    // status flip alone must NOT lock the category
    expect(after.every((r) => r.category_locked === false)).toBe(true);
  });

  it('bulkRejectVideos rejects many rows and locks their categories', async () => {
    const prodRows = await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM productions WHERE slug = 'dune-part-two-2024'
    `);
    const prodId = expectOne(prodRows, 'dune-part-two-2024 production').id;
    await db.execute(drizzleSql`
      INSERT INTO production_videos
        (production_id, source, external_id, url, title, category, confidence_score, status)
      VALUES
        (${prodId}, 'youtube', 'bulk-rej-1', 'https://x/r1', 'Rej one', 'making_of', '0.5', 'pending'),
        (${prodId}, 'youtube', 'bulk-rej-2', 'https://x/r2', 'Rej two', 'making_of', '0.5', 'pending')
      ON CONFLICT DO NOTHING
    `);
    const targets = await db.execute<{ id: number }>(drizzleSql`
      SELECT id FROM production_videos WHERE external_id IN ('bulk-rej-1', 'bulk-rej-2')
    `);
    const ids = targets.map((t) => t.id);

    const slugs = await bulkRejectVideos(db, ids);
    expect(slugs).toContain('dune-part-two-2024');

    const idList = drizzleSql.join(ids.map((id) => drizzleSql`${id}`), drizzleSql`, `);
    const after = await db.execute<{ status: string; category_locked: boolean }>(drizzleSql`
      SELECT status, category_locked FROM production_videos WHERE id IN (${idList})
    `);
    expect(after.every((r) => r.status === 'rejected')).toBe(true);
    expect(after.every((r) => r.category_locked === true)).toBe(true);
  });

  it('bulk operations are no-ops with empty input', async () => {
    expect(await bulkUpdateVideoStatus(db, [], 'published')).toEqual([]);
    expect(await bulkRejectVideos(db, [])).toEqual([]);
  });
});
