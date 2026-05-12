import { db, sql } from '@bts/db';
import { categoriseVideo } from './categorise.ts';

/**
 * Re-run the categoriser against every existing production_videos
 * row that ISN'T `category_locked = true`. The lock flag is set
 * when an admin reviewer explicitly confirms a category, so we
 * never overwrite manual decisions.
 *
 * Run after categoriser keyword changes to fold the new heuristics
 * into the existing corpus. Idempotent: rows whose category doesn't
 * change are no-op.
 */

type VideoRow = {
  id: number;
  title: string;
  channel_id: string | null;
  source: 'youtube' | 'vimeo';
  category: string;
};

export async function reclassifyVideos(): Promise<void> {
  console.log('reclassify videos — scanning unlocked rows…');

  const rows = await db.execute<VideoRow>(sql`
    SELECT id, title, channel_id, source::text, category::text
    FROM production_videos
    WHERE category_locked = false
  `);

  let unchanged = 0;
  const transitions = new Map<string, number>();
  const changedIds: Array<{ id: number; from: string; to: string }> = [];

  for (const row of rows) {
    const next = categoriseVideo({
      source: row.source,
      channelId: row.channel_id,
      title: row.title,
    });
    if (next === row.category) {
      unchanged++;
      continue;
    }
    const key = `${row.category} → ${next}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
    changedIds.push({ id: row.id, from: row.category, to: next });
  }

  // Apply in batches: one UPDATE per target category covers all
  // rows transitioning INTO it during this pass.
  const byTargetCategory = new Map<string, number[]>();
  for (const c of changedIds) {
    const list = byTargetCategory.get(c.to) ?? [];
    list.push(c.id);
    byTargetCategory.set(c.to, list);
  }
  for (const [target, ids] of byTargetCategory) {
    if (ids.length === 0) continue;
    await db.execute(sql`
      UPDATE production_videos
      SET category = ${target}::video_category_enum,
          updated_at = NOW()
      WHERE id IN ${sql`(${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`}
    `);
    console.log(`  [~] ${ids.length} rows → ${target}`);
  }

  console.log(
    `\nreclassify done — scanned ${rows.length}, unchanged ${unchanged}, changed ${changedIds.length}`,
  );
  if (transitions.size > 0) {
    console.log('\ntop transitions:');
    for (const [k, n] of [...transitions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
      console.log(`  ${n.toString().padStart(4)}  ${k}`);
    }
  }
}
