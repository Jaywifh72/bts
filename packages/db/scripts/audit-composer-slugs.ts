// One-shot audit — for each expected composer slug in the phase-2
// score_works seed, check whether the person exists in the production
// `people` table. Surfaces slug-mismatch issues like
// 'hildur-gudnadottir' vs 'hildur-guonadottir'.
//
// Usage: pnpm --filter @bts/db exec tsx scripts/audit-composer-slugs.ts
//
// Prints a fuzzy-match suggestion when the exact slug isn't found.
import { db, sql } from '../src/index.ts';

const EXPECTED = [
  'hans-zimmer', 'benjamin-wallfisch', 'steven-price', 'carter-burwell',
  'jung-jae-il', 'daniel-blumberg', 'ryuichi-sakamoto',
  'ludwig-goransson', 'trent-reznor', 'atticus-ross',
  'hildur-gudnadottir', 'johann-johannsson', 'alexandre-desplat',
  'mica-levi', 'volker-bertelmann', 'michael-giacchino',
  'robbie-robertson', 'christopher-bear', 'daniel-rossen', 'oliver-coates',
  'harold-faltermeyer', 'lorne-balfe', 'alva-noto', 'bryce-dessner',
];

// drizzle's sql template flattens JS arrays to a (.., .., ..) list.
// Build a Postgres text[] literal manually so we can cast it cleanly.
const expectedLit = '{' + EXPECTED.map((s) => '"' + s + '"').join(',') + '}';
const found = await db.execute<{ slug: string; display_name: string }>(sql`
  SELECT slug, display_name FROM people
  WHERE slug = ANY(${expectedLit}::text[])
  ORDER BY slug
`);
const foundSet = new Set(found.map((r) => r.slug));
const missing = EXPECTED.filter((s) => !foundSet.has(s));

console.log(`Found: ${found.length}/${EXPECTED.length}`);
for (const r of found) console.log(`  ✓  ${r.slug}  → ${r.display_name}`);

if (missing.length > 0) {
  console.log(`\nMissing: ${missing.length}`);
  for (const slug of missing) {
    // Pull the slug's last name token, search for similar names in people.
    const lastName = slug.split('-').pop() ?? slug;
    const fuzzy = await db.execute<{ slug: string; display_name: string }>(sql`
      SELECT slug, display_name FROM people
      WHERE LOWER(display_name) LIKE ${'%' + lastName + '%'}
         OR slug ILIKE ${'%' + lastName + '%'}
      ORDER BY display_name
      LIMIT 5
    `);
    console.log(`  ✗  ${slug}`);
    if (fuzzy.length === 0) console.log(`     (no fuzzy matches on "${lastName}")`);
    for (const f of fuzzy) console.log(`     fuzzy → ${f.slug}: ${f.display_name}`);
  }
}
process.exit(0);
