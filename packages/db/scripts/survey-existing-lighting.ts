import { db, sql } from '../src/index.ts';

const setups = await db.execute<{
  id: number;
  scene_slug: string;
  production_slug: string;
  setup_name: string;
  motivation: string | null;
  notes: string | null;
}>(sql`
  SELECT ls.id, s.slug AS scene_slug, p.slug AS production_slug,
         ls.setup_name, ls.motivation, ls.notes
  FROM lighting_setups ls
  JOIN scenes s ON s.id = ls.scene_id
  JOIN productions p ON p.id = s.production_id
`);
console.log(`existing lighting_setups: ${setups.length}`);
for (const s of setups) {
  console.log(`  ${s.production_slug}/${s.scene_slug} :: ${s.setup_name}`);
  console.log(`    motivation: ${s.motivation}`);
  console.log(`    notes: ${s.notes?.slice(0, 100)}`);
}

const fixtures = await db.execute<{
  setup_id: number;
  role: string;
  series_name: string;
  diffusion: string | null;
  color_temp_k: number | null;
  intensity_pct: number | null;
}>(sql`
  SELECT lsf.setup_id, lsf.role::text,
         es.name AS series_name,
         lsf.diffusion, lsf.color_temp_k, lsf.intensity_pct
  FROM lighting_setup_fixtures lsf
  JOIN equipment_usage eu ON eu.id = lsf.equipment_usage_id
  JOIN equipment_series es ON es.id = eu.equipment_series_id
`);
console.log(`\nexisting fixtures: ${fixtures.length}`);
for (const f of fixtures) console.log(`  setup=${f.setup_id} role=${f.role} series=${f.series_name} CT=${f.color_temp_k}K`);

process.exit(0);
