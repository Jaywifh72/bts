import { db, sql } from '../src/index.ts';

const companies = await db.execute<{ slug: string; name: string }>(sql`
  SELECT slug, name FROM stunt_companies ORDER BY slug
`);
console.log('--- Stunt companies ---');
for (const c of companies) console.log(`  ${c.slug.padEnd(32)} ${c.name}`);

const stuntPeople = await db.execute<{ slug: string; display_name: string; stunt_company_slug: string | null }>(sql`
  SELECT slug, display_name, stunt_company_slug FROM people
  WHERE COALESCE(array_length(stunt_disciplines, 1), 0) > 0
     OR stunt_company_slug IS NOT NULL
  ORDER BY display_name
`);
console.log(`\n--- Stunt people (${stuntPeople.length}) ---`);
for (const p of stuntPeople) console.log(`  ${p.slug.padEnd(32)} ${p.display_name.padEnd(28)} ${p.stunt_company_slug ?? ''}`);

// Some actors we'd want to use as doubled-person targets
const sampleActors = await db.execute<{ slug: string }>(sql`
  SELECT slug FROM people
  WHERE slug IN (
    'chris-hemsworth', 'tom-cruise', 'scarlett-johansson', 'keanu-reeves',
    'dwayne-johnson', 'angelina-jolie', 'harrison-ford', 'sean-connery',
    'lucy-lawless', 'uma-thurman', 'lynda-carter', 'christopher-reeve',
    'arnold-schwarzenegger', 'brandon-lee', 'brad-pitt', 'matt-damon',
    'henry-cavill', 'daniel-craig', 'pierce-brosnan', 'roger-moore'
  )
  ORDER BY slug
`);
console.log(`\n--- Found actor slugs (${sampleActors.length}) ---`);
for (const a of sampleActors) console.log(`  ${a.slug}`);

process.exit(0);
