import { db, sql } from '../src/index.ts';

const total = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM production_lighting_setups
`);
console.log(`production_lighting_setups rows: ${total[0]!.n}`);

const filmsCovered = await db.execute<{ n: number }>(sql`
  SELECT COUNT(DISTINCT production_id)::int AS n FROM production_lighting_setups
`);
console.log(`distinct films with lighting setups: ${filmsCovered[0]!.n}`);

const sample = await db.execute<{
  production_slug: string;
  title: string;
  release_year: number | null;
  setup_name: string;
  description: string | null;
  fixtures: string[];
  scene_id: number | null;
}>(sql`
  SELECT p.slug AS production_slug, p.title, p.release_year,
         pls.setup_name, pls.description, pls.fixtures, pls.scene_id
  FROM production_lighting_setups pls
  JOIN productions p ON p.id = pls.production_id
  ORDER BY p.release_year DESC NULLS LAST, p.title
  LIMIT 10
`);
console.log('\nsample (existing rows):');
for (const r of sample) console.log(`  ${(r.release_year ?? '----').toString()} ${r.production_slug.padEnd(40)} ${r.setup_name}`);
if (sample.length > 0) {
  console.log('\nfirst row schema:');
  console.log(JSON.stringify(sample[0], null, 2));
}

process.exit(0);
