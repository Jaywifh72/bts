import { db, sql } from '../src/index.ts';

// 1. How many films have ANY stunt info (sequences, doubling, or stunt crew_assignments)?
const coverage = await db.execute<{
  total_films: number;
  with_sequences: number;
  with_doubling: number;
  with_stunt_crew: number;
  with_stunt_videos: number;
  with_anything: number;
}>(sql`
  WITH film_stunts AS (
    SELECT
      p.id,
      EXISTS(SELECT 1 FROM stunt_sequences ss WHERE ss.production_id = p.id) AS has_seq,
      EXISTS(SELECT 1 FROM stunt_doubling_credits sdc WHERE sdc.production_id = p.id) AS has_doub,
      EXISTS(
        SELECT 1 FROM crew_assignments ca
        JOIN roles r ON r.id = ca.role_id
        WHERE ca.production_id = p.id AND r.category = 'stunts'
      ) AS has_crew,
      EXISTS(
        SELECT 1 FROM production_videos pv
        WHERE pv.production_id = p.id AND pv.category = 'stunts'
      ) AS has_video
    FROM productions p
  )
  SELECT
    COUNT(*)::int AS total_films,
    COUNT(*) FILTER (WHERE has_seq)::int AS with_sequences,
    COUNT(*) FILTER (WHERE has_doub)::int AS with_doubling,
    COUNT(*) FILTER (WHERE has_crew)::int AS with_stunt_crew,
    COUNT(*) FILTER (WHERE has_video)::int AS with_stunt_videos,
    COUNT(*) FILTER (WHERE has_seq OR has_doub OR has_crew OR has_video)::int AS with_anything
  FROM film_stunts
`);
console.log('--- Coverage across all films ---');
console.log(JSON.stringify(coverage[0], null, 2));

// 2. Sample stunt-crew counts per film (top by stunt headcount)
const topByCrewCount = await db.execute<{ slug: string; title: string; release_year: number | null; stunt_count: number }>(sql`
  SELECT p.slug, p.title, p.release_year,
         COUNT(*)::int AS stunt_count
  FROM productions p
  JOIN crew_assignments ca ON ca.production_id = p.id
  JOIN roles r ON r.id = ca.role_id
  WHERE r.category = 'stunts'
  GROUP BY p.id, p.slug, p.title, p.release_year
  ORDER BY stunt_count DESC
  LIMIT 12
`);
console.log('\n--- Top films by stunt-crew headcount ---');
for (const r of topByCrewCount) console.log(`  ${(r.release_year ?? '----').toString()} ${r.stunt_count.toString().padStart(4)} ${r.slug}`);

// 3. What stunt roles exist?
const stuntRoles = await db.execute<{ slug: string; name: string; n: number }>(sql`
  SELECT r.slug, r.name, COUNT(*)::int AS n
  FROM crew_assignments ca
  JOIN roles r ON r.id = ca.role_id
  WHERE r.category = 'stunts'
  GROUP BY r.slug, r.name
  ORDER BY n DESC
`);
console.log('\n--- Stunt-category roles in use ---');
for (const r of stuntRoles) console.log(`  ${r.n.toString().padStart(4)} ${r.slug.padEnd(32)} ${r.name}`);

// 4. Sample stunt crew on Avengers Endgame
const endgameCrew = await db.execute<{ display_name: string; role_name: string }>(sql`
  SELECT pp.display_name, r.name AS role_name
  FROM crew_assignments ca
  JOIN people pp ON pp.id = ca.person_id
  JOIN roles r ON r.id = ca.role_id
  JOIN productions p ON p.id = ca.production_id
  WHERE p.slug = 'avengers-endgame-2019' AND r.category = 'stunts'
  ORDER BY r.slug, pp.display_name
  LIMIT 30
`);
console.log('\n--- Sample stunt crew: Avengers Endgame ---');
for (const r of endgameCrew) console.log(`  ${r.role_name.padEnd(32)} ${r.display_name}`);

process.exit(0);
