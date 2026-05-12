import { db, sql } from '../src/index.ts';

const stuntVideos = await db.execute<{
  title: string;
  production_title: string;
  production_slug: string;
  status: string;
  view_count: number | null;
}>(sql`
  SELECT pv.title, p.title AS production_title, p.slug AS production_slug, pv.status::text, pv.view_count
  FROM production_videos pv
  JOIN productions p ON p.id = pv.production_id
  WHERE pv.category = 'stunts'
  ORDER BY pv.view_count DESC NULLS LAST
`);
console.log(`--- ${stuntVideos.length} stunt videos ---`);
for (const r of stuntVideos) console.log(`  [${r.status}] ${r.title}  →  /films/${r.production_slug}`);

console.log('\n--- Sample remaining "other" / "behind_the_scenes" videos with stunt-related context ---');
const candidates = await db.execute<{ category: string; title: string; status: string }>(sql`
  SELECT category::text, status::text, title
  FROM production_videos
  WHERE category IN ('other', 'behind_the_scenes', 'making_of')
    AND (
      LOWER(title) LIKE '%fight%'
      OR LOWER(title) LIKE '%stunt%'
      OR LOWER(title) LIKE '%chase%'
      OR LOWER(title) LIKE '%action%'
      OR LOWER(title) LIKE '%anatomy of%'
    )
  ORDER BY view_count DESC NULLS LAST
  LIMIT 50
`);
for (const r of candidates) console.log(`  [${r.category} / ${r.status}] ${r.title}`);

process.exit(0);
