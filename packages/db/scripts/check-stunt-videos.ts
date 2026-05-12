import { db, sql } from '../src/index.ts';

const totalsByCategory = await db.execute<{ category: string; status: string; n: number }>(sql`
  SELECT category::text AS category, status::text AS status, COUNT(*)::int AS n
  FROM production_videos
  WHERE status IN ('published', 'pending')
  GROUP BY category, status
  ORDER BY category, status
`);
console.log('--- Videos by category × status ---');
for (const r of totalsByCategory) console.log(JSON.stringify(r));

const byProd = await db.execute<{
  productions_with_any_video: number;
  productions_with_stunt_video: number;
  total_productions: number;
}>(sql`
  SELECT
    (SELECT COUNT(DISTINCT production_id)::int FROM production_videos WHERE status = 'published') AS productions_with_any_video,
    (SELECT COUNT(DISTINCT production_id)::int FROM production_videos WHERE status = 'published' AND category = 'stunts') AS productions_with_stunt_video,
    (SELECT COUNT(*)::int FROM productions) AS total_productions
`);
console.log('\n--- Coverage ---');
console.log(JSON.stringify(byProd[0]));

const seqStats = await db.execute<{ total_sequences: number; with_bts_url: number }>(sql`
  SELECT
    (SELECT COUNT(*)::int FROM stunt_sequences) AS total_sequences,
    (SELECT COUNT(*)::int FROM stunt_sequences WHERE bts_video_url IS NOT NULL) AS with_bts_url
`);
console.log('\n--- Stunt sequence BTS coverage ---');
console.log(JSON.stringify(seqStats[0]));

const sampleStuntVideos = await db.execute<{ title: string; production_title: string; category: string; status: string }>(sql`
  SELECT pv.title, p.title AS production_title, pv.category::text, pv.status::text
  FROM production_videos pv
  JOIN productions p ON p.id = pv.production_id
  WHERE pv.category = 'stunts'
  ORDER BY pv.created_at DESC
  LIMIT 10
`);
console.log('\n--- Sample stunt videos ---');
for (const r of sampleStuntVideos) console.log(JSON.stringify(r));

process.exit(0);
