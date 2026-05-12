import { db, sql } from '../src/index.ts';

const total = await db.execute<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM post_houses`);
console.log(`post_houses rows: ${total[0]!.n}`);

const links = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM production_post_houses
`);
console.log(`production_post_houses links: ${links[0]!.n}`);

const sample = await db.execute<{ slug: string; name: string; country: string | null; tagline: string | null }>(sql`
  SELECT slug, name, country, NULL AS tagline FROM post_houses ORDER BY name LIMIT 30
`);
console.log('\nexisting post houses:');
for (const r of sample) console.log(`  ${r.slug.padEnd(28)} ${r.name.padEnd(38)} ${r.country ?? '--'}`);

const linkedSample = await db.execute<{ production_slug: string; ph_slug: string; role: string }>(sql`
  SELECT p.slug AS production_slug, ph.slug AS ph_slug, pph.role::text
  FROM production_post_houses pph
  JOIN productions p ON p.id = pph.production_id
  JOIN post_houses ph ON ph.id = pph.post_house_id
  ORDER BY p.title LIMIT 12
`);
console.log('\nexisting links:');
for (const r of linkedSample) console.log(`  ${r.production_slug.padEnd(40)} :: ${r.ph_slug.padEnd(20)} ${r.role}`);

process.exit(0);
