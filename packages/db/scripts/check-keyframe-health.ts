import { db, sql } from '../src/index.ts';

const total = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM production_keyframes
`);
console.log(`total keyframes: ${total[0]!.n}`);

const interstellar = await db.execute<{ id: number; image_url: string; caption: string | null }>(sql`
  SELECT kf.id, kf.image_url, kf.caption
  FROM production_keyframes kf
  JOIN productions p ON p.id = kf.production_id
  WHERE p.slug LIKE 'interstellar%'
  ORDER BY kf.sort_order, kf.id
`);
console.log('\nInterstellar keyframes:');
for (const r of interstellar) console.log(`  id=${r.id}  ${r.image_url}  — ${r.caption ?? '(no caption)'}`);

process.exit(0);
