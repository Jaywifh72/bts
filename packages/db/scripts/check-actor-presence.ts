import { db, sql } from '../src/index.ts';

const actors = [
  'chris-hemsworth', 'scarlett-johansson', 'keanu-reeves',
  'dwayne-johnson', 'angelina-jolie', 'harrison-ford',
  'sean-connery', 'henry-cavill', 'daniel-craig',
  'lucy-lawless', 'uma-thurman', 'lynda-carter',
  'christopher-reeve', 'arnold-schwarzenegger', 'pierce-brosnan',
  'roger-moore', 'matthew-mcconaughey', 'leonardo-dicaprio',
  'ryan-gosling', 'tom-hardy',
];

for (const slug of actors) {
  const r = await db.execute<{ slug: string; display_name: string }>(sql`
    SELECT slug, display_name FROM people
    WHERE slug ILIKE ${slug + '%'} OR display_name ILIKE ${slug.replace(/-/g, ' ') + '%'}
    LIMIT 3
  `);
  if (r.length > 0) {
    console.log(`  ${slug.padEnd(28)} → ${r.map((x) => x.slug).join(', ')}`);
  } else {
    console.log(`  ${slug.padEnd(28)} → not found`);
  }
}

console.log('\n--- Productions matching famous franchises ---');
const productions = await db.execute<{ slug: string; title: string; release_year: number | null }>(sql`
  SELECT slug, title, release_year FROM productions
  WHERE title ILIKE 'thor%' OR title ILIKE 'matrix%' OR title ILIKE 'mission%impossible%'
     OR title ILIKE 'jurassic%' OR title ILIKE 'avengers%'
     OR title ILIKE 'mad max%' OR title ILIKE 'john wick%'
     OR title ILIKE 'kill bill%' OR title ILIKE 'fast%furious%' OR title ILIKE 'jumanji%'
     OR title ILIKE 'the matrix%' OR title ILIKE 'the crow%'
     OR title ILIKE 'tomb raider%' OR title ILIKE 'mr.%mrs.%smith%'
     OR title ILIKE 'spider-man%' OR title ILIKE 'dune%'
     OR title ILIKE 'fight club%' OR title ILIKE 'oppenheimer'
     OR title = 'The Batman' OR title ILIKE 'inception%'
     OR title ILIKE 'extraction%' OR title ILIKE 'black widow%'
     OR title ILIKE 'pirates%caribbean%'
  ORDER BY release_year DESC NULLS LAST, title
  LIMIT 60
`);
for (const p of productions) console.log(`  ${(p.release_year ?? '----').toString()} ${p.slug.padEnd(40)} ${p.title}`);

process.exit(0);
