import { db, sql } from '../src/index.ts';

const stats = await db.execute<{
  production_slug: string;
  sequence_slug: string;
  sequence_name: string;
  credit_count: number;
}>(sql`
  SELECT p.slug AS production_slug,
         ss.slug AS sequence_slug, ss.name AS sequence_name,
         COUNT(ssc.id)::int AS credit_count
  FROM stunt_sequences ss
  JOIN productions p ON p.id = ss.production_id
  LEFT JOIN stunt_sequence_credits ssc ON ssc.sequence_id = ss.id
  GROUP BY p.slug, ss.slug, ss.name, ss.sort_order
  ORDER BY p.slug, ss.sort_order
`);
console.log('--- Credits per sequence ---');
for (const r of stats) {
  console.log(`  ${r.credit_count.toString().padStart(2)}  ${r.production_slug.padEnd(35)} :: ${r.sequence_slug}`);
}

process.exit(0);
