import { db, sql } from '../src/index.ts';

const lightingTotal = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM lighting_setups
`);
console.log(`lighting_setups rows: ${lightingTotal[0]!.n}`);

const fixtureTotal = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM lighting_setup_fixtures
`);
console.log(`lighting_setup_fixtures rows: ${fixtureTotal[0]!.n}`);

const scenesPerProduction = await db.execute<{
  production_slug: string;
  title: string;
  release_year: number | null;
  scene_count: number;
}>(sql`
  SELECT p.slug AS production_slug, p.title, p.release_year, COUNT(*)::int AS scene_count
  FROM scenes s
  JOIN productions p ON p.id = s.production_id
  GROUP BY p.slug, p.title, p.release_year
  ORDER BY scene_count DESC, p.release_year DESC NULLS LAST
  LIMIT 15
`);
console.log('\ntop films by scene count:');
for (const r of scenesPerProduction) console.log(`  ${r.scene_count.toString().padStart(3)}  ${r.production_slug.padEnd(45)} ${r.title}`);

const sampleScenes = await db.execute<{
  production_slug: string;
  scene_slug: string;
  title: string;
}>(sql`
  SELECT p.slug AS production_slug, s.slug AS scene_slug, s.title
  FROM scenes s
  JOIN productions p ON p.id = s.production_id
  WHERE p.slug IN ('oppenheimer-2023', 'the-batman-2022', 'dune-part-two-2024',
    'mad-max-fury-road-2015', '1917-2019', 'killers-of-the-flower-moon-2023',
    'tar-2022', 'the-revenant-2015', 'inception-2010', 'avengers-endgame-2019')
  ORDER BY p.slug, s.id
  LIMIT 30
`);
console.log('\nscenes on marquee films:');
for (const r of sampleScenes) console.log(`  ${r.production_slug.padEnd(40)} :: ${r.scene_slug.padEnd(35)} ${r.title}`);

process.exit(0);
