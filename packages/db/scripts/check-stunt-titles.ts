import { db, sql } from '../src/index.ts';

console.log('--- Sample titles per category (last 50 each) ---');
const sample = await db.execute<{ category: string; title: string; status: string }>(sql`
  SELECT category::text, title, status::text
  FROM production_videos
  WHERE category IN ('behind_the_scenes', 'making_of', 'other')
    AND (
      LOWER(title) LIKE '%stunt%'
      OR LOWER(title) LIKE '%fight%'
      OR LOWER(title) LIKE '%action%'
      OR LOWER(title) LIKE '%chase%'
      OR LOWER(title) LIKE '%car%'
    )
  ORDER BY category, title
  LIMIT 60
`);
for (const r of sample) console.log(`  ${r.category.padEnd(20)} ${r.status.padEnd(10)} ${r.title}`);

console.log('\n--- Other category sample (no filter) ---');
const otherSample = await db.execute<{ title: string; status: string }>(sql`
  SELECT title, status::text
  FROM production_videos
  WHERE category = 'other'
  ORDER BY view_count DESC NULLS LAST
  LIMIT 30
`);
for (const r of otherSample) console.log(`  ${r.status.padEnd(10)} ${r.title}`);

process.exit(0);
