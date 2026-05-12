import { db, sql } from '../src/index.ts';

const sequences = await db.execute<{
  production_slug: string;
  production_title: string;
  slug: string;
  name: string;
  discipline_tags: string[];
}>(sql`
  SELECT p.slug AS production_slug, p.title AS production_title,
         ss.slug, ss.name, ss.discipline_tags
  FROM stunt_sequences ss
  JOIN productions p ON p.id = ss.production_id
  ORDER BY p.title, ss.sort_order
`);
console.log(`--- ${sequences.length} existing sequences ---`);
for (const s of sequences) {
  console.log(`  ${s.production_slug.padEnd(40)} :: ${s.slug.padEnd(35)} ${s.name}`);
  console.log(`    tags: [${s.discipline_tags.join(', ')}]`);
}

process.exit(0);
