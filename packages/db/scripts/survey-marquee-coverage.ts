// Audit candidate films for the deep-dive: which marquee productions
// are in the DB and what editorial layers are already populated.
import { db, sql } from '../src/index.ts';

const candidates = [
  'top-gun-maverick-2022',
  'mission-impossible-dead-reckoning-part-one-2023',
  'mission-impossible-fallout-2018',
  'mission-impossible-rogue-nation-2015',
  'avatar-the-way-of-water-2022',
  'avatar-2-2022',
  'the-brutalist-2024',
  'anora-2024',
  'poor-things-2023',
  'the-northman-2022',
  'babylon-2022',
  'elvis-2022',
  'all-quiet-on-the-western-front-2022',
  'the-substance-2024',
  'blade-runner-2049-2017',
  'the-revenant-2015',
  'first-man-2018',
  'gravity-2013',
  'roma-2018',
  'parasite-2019',
  'the-tree-of-life-2011',
  'children-of-men-2006',
  'no-country-for-old-men-2007',
  'there-will-be-blood-2007',
  'the-power-of-the-dog-2021',
];

const found = await db.execute<{
  slug: string; title: string; release_year: number | null;
  has_crew: boolean; has_scenes: boolean;
  has_color: boolean; has_lighting: boolean;
  has_locations: boolean; has_post: boolean;
  has_stunts: boolean; has_doublings: boolean;
  has_videos: boolean; has_keyframes: boolean;
  has_awards: boolean; has_vfx: boolean;
}>(sql`
  SELECT
    p.slug, p.title, p.release_year,
    EXISTS(SELECT 1 FROM crew_assignments WHERE production_id = p.id) AS has_crew,
    EXISTS(SELECT 1 FROM scenes WHERE production_id = p.id) AS has_scenes,
    EXISTS(SELECT 1 FROM production_color_pipelines WHERE production_id = p.id) AS has_color,
    EXISTS(SELECT 1 FROM lighting_setups ls JOIN scenes s ON s.id = ls.scene_id WHERE s.production_id = p.id) AS has_lighting,
    EXISTS(SELECT 1 FROM production_locations WHERE production_id = p.id) AS has_locations,
    EXISTS(SELECT 1 FROM production_post_houses WHERE production_id = p.id) AS has_post,
    EXISTS(SELECT 1 FROM stunt_sequences WHERE production_id = p.id) AS has_stunts,
    EXISTS(SELECT 1 FROM stunt_doubling_credits WHERE production_id = p.id) AS has_doublings,
    EXISTS(SELECT 1 FROM production_videos WHERE production_id = p.id AND status = 'published') AS has_videos,
    EXISTS(SELECT 1 FROM production_keyframes WHERE production_id = p.id) AS has_keyframes,
    EXISTS(SELECT 1 FROM production_awards WHERE production_id = p.id) AS has_awards,
    EXISTS(SELECT 1 FROM vfx_credits WHERE production_id = p.id) AS has_vfx
  FROM productions p
  WHERE p.slug = ANY(${`{${candidates.join(',')}}`}::text[])
  ORDER BY p.release_year DESC NULLS LAST
`);

console.log('marquee candidate coverage:\n');
console.log('SLUG'.padEnd(50) + '  Y' + '  CR' + '  SC' + '  CO' + '  LI' + '  LO' + '  PO' + '  ST' + '  DB' + '  VD' + '  KF' + '  AW' + '  VX');
for (const r of found) {
  const sym = (b: boolean) => b ? '✓' : ' ';
  console.log(
    r.slug.padEnd(50) +
    `  ${(r.release_year ?? '----').toString()}` +
    `  ${sym(r.has_crew)} ` +
    `  ${sym(r.has_scenes)} ` +
    `  ${sym(r.has_color)} ` +
    `  ${sym(r.has_lighting)} ` +
    `  ${sym(r.has_locations)} ` +
    `  ${sym(r.has_post)} ` +
    `  ${sym(r.has_stunts)} ` +
    `  ${sym(r.has_doublings)} ` +
    `  ${sym(r.has_videos)} ` +
    `  ${sym(r.has_keyframes)} ` +
    `  ${sym(r.has_awards)} ` +
    `  ${sym(r.has_vfx)} `
  );
}

console.log(`\n${found.length} of ${candidates.length} candidates found in DB`);
console.log(`\nlegend: Y=year CR=crew SC=scenes CO=color LI=lighting LO=loc PO=post ST=stunts DB=doublings VD=videos KF=keyframes AW=awards VX=vfx`);

process.exit(0);
