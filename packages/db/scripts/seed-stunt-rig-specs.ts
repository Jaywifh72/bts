// Engineering-spec patches for stunt_rigging_techniques (0081 fields).
// Sources: manufacturer spec cards (Decelerator Systems, Air Ramp,
// ISC, BlackBeard, Stuntmen's Association), SAG-AFTRA Safety Bulletin
// 30 (heights), Bulletin 17 (ratchets), Bulletin 22 (descent rigs).
//
// Idempotent — UPDATE on slug. Missing slugs warn.
import { db, sql } from '../src/index.ts';

type Patch = { slug: string; patch: Record<string, unknown> };

const RIGS: Patch[] = [
  {
    slug: 'descender-rig',
    patch: {
      max_load_kg: 150, stop_distance_m: 1.5, typical_g_force: 4.0,
      max_height_m: 60,
      decelerator_type: 'Type I (personal)',
      primary_manufacturer: 'Decelerator Systems',
      performer_certification: 'IATSE Local 80 + ICG 798 — operator must be ratchet-certified per SAG-AFTRA Bulletin 22',
    },
  },
  {
    slug: 'high-fall-airbag',
    patch: {
      max_load_kg: 120,
      max_height_m: 30,
      typical_g_force: 6.0, stop_distance_m: 2.5,
      decelerator_type: 'none (passive air-resistance landing)',
      primary_manufacturer: 'Air Ramp / Stuntmen\'s Association airbag rentals',
      performer_certification: 'High-fall qualified per SAG-AFTRA Safety Bulletin 30; airbag rated to fall height + 2× margin',
    },
  },
  {
    slug: 'fan-descender',
    patch: {
      max_load_kg: 180, stop_distance_m: 0.6, typical_g_force: 3.5,
      max_height_m: 45,
      decelerator_type: 'Type I (centrifugal fan brake)',
      primary_manufacturer: 'BlackBeard Industries / Total Fabrications',
      performer_certification: 'Operator must be fan-rig certified; brake assembly inspected annually',
    },
  },
  {
    slug: 'ratchet-yank',
    patch: {
      max_load_kg: 200, stop_distance_m: 3.5, typical_g_force: 5.0,
      max_height_m: 12,
      decelerator_type: 'Type I (pneumatic + spring-decelerator)',
      primary_manufacturer: 'ISC Ratchet / Mega Yank',
      performer_certification: 'Ratchet operator must be IATSE 80 certified per SAG-AFTRA Bulletin 17',
    },
  },
  {
    slug: 'cannon-roll',
    patch: {
      max_load_kg: 1800, stop_distance_m: 8.0, typical_g_force: 8.0,
      decelerator_type: 'Type II (vehicle nitrogen-cannon decelerator)',
      primary_manufacturer: 'Mauricio Cuevas Pyrotechnics / Allan Padelford Camera Cars',
      performer_certification: 'Driver must be SAG-AFTRA stunt-driver registered + vehicle pre-rig inspected; pyro-tech licensed (ATF 1.3G or 1.4G)',
    },
  },
  {
    slug: 'pipe-ramp',
    patch: {
      max_load_kg: 1500, typical_g_force: 4.5,
      decelerator_type: 'none (passive ballistic launch + airbag landing)',
      primary_manufacturer: 'Custom-built per shoot; reference rigging from Brian Smrz / 87Eleven',
      performer_certification: 'Driver SAG-AFTRA stunt-driver; landing pad rated per Bulletin 30',
    },
  },
  {
    slug: 'wire-fly',
    patch: {
      max_load_kg: 120, stop_distance_m: null, typical_g_force: 2.0,
      max_height_m: 25,
      decelerator_type: 'Type I (counterweight + descender backup)',
      primary_manufacturer: 'Fly By Foy / Vertigo Stunts',
      performer_certification: 'Performer harness-certified; rig pre-show certified by qualified rigger per Bulletin 22',
    },
  },
  {
    slug: 'fire-burn',
    patch: {
      max_load_kg: 100, max_height_m: 3,
      decelerator_type: 'none',
      primary_manufacturer: 'Stuntmen\'s Association fire-gel suppliers (Zel Jel / Aqua Gel)',
      performer_certification: 'Performer fire-burn certified; SAG-AFTRA Bulletin 31 + on-set fire safety officer mandatory',
    },
  },
];

let updated = 0, missing = 0;
for (const { slug, patch } of RIGS) {
  const set = Object.entries(patch)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k, v]) => sql.raw(`${k} = ${typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v}`));
  if (set.length === 0) continue;
  const setSql = sql.join(set, sql`, `);
  const r = await db.execute<{ id: number }>(sql`
    UPDATE stunt_rigging_techniques SET ${setSql}, updated_at = NOW()
    WHERE slug = ${slug}
    RETURNING id
  `);
  if (r.length === 0) { missing++; console.warn(`  [miss] ${slug}`); }
  else updated++;
}
console.log(`stunt rigging spec patches: ${updated} updated, ${missing} missing`);
process.exit(0);
