import { db, sql } from '../src/index.ts';

const total = await db.execute<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM production_locations`);
console.log(`production_locations rows: ${total[0]!.n}`);

const filmsCovered = await db.execute<{ n: number }>(sql`
  SELECT COUNT(DISTINCT production_id)::int AS n FROM production_locations
`);
console.log(`distinct films with locations: ${filmsCovered[0]!.n}`);

const sample = await db.execute<{
  production_slug: string;
  title: string;
  location_name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  notes: string | null;
}>(sql`
  SELECT p.slug AS production_slug, p.title,
         pl.name AS location_name, NULL AS city, pl.region, pl.country, pl.notes
  FROM production_locations pl
  JOIN productions p ON p.id = pl.production_id
  ORDER BY p.title, pl.id
  LIMIT 20
`);
console.log('\nsample:');
for (const r of sample) console.log(`  ${r.production_slug.padEnd(40)} :: ${r.location_name} (${[r.city, r.country].filter(Boolean).join(', ')})`);
if (sample.length > 0) {
  console.log('\nfirst row schema:');
  console.log(JSON.stringify(sample[0], null, 2));
}
process.exit(0);
