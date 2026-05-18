// Deeper audit — for each MISSING composer, search the people table
// by display_name ILIKE to find the actual slug they were ingested
// under (handles diacritics, stage-names, mid-name initials).
import { db, sql } from '../src/index.ts';

const QUERIES: Array<{ key: string; ilike: string }> = [
  { key: 'Hildur Guðnadóttir', ilike: '%Hildur%' },
  { key: 'Mica Levi',          ilike: '%Mica%' },
  { key: 'Christopher Bear',   ilike: '%Christopher Bear%' },
  { key: 'Daniel Rossen',      ilike: '%Rossen%' },
  { key: 'Oliver Coates',      ilike: '%Oliver%Coates%' },
  { key: 'Lorne Balfe',        ilike: '%Balfe%' },
  { key: 'Bryce Dessner',      ilike: '%Dessner%' },
];

for (const q of QUERIES) {
  const rows = await db.execute<{ slug: string; display_name: string }>(sql`
    SELECT slug, display_name FROM people
    WHERE display_name ILIKE ${q.ilike}
    ORDER BY display_name
    LIMIT 5
  `);
  console.log(`\n${q.key}:`);
  if (rows.length === 0) {
    console.log('  (no matches)');
  } else {
    for (const r of rows) console.log(`  ${r.slug}  →  ${r.display_name}`);
  }
}
process.exit(0);
