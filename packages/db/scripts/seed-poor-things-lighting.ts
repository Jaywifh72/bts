// E-22 demo seed — one curated lighting setup on Poor Things' Lisbon
// rooftops scene. Idempotent (UPSERT on the unique key).
import { db, sql } from '../src/index.ts';

const target = await db.execute<{ scene_id: number; eu_id: number }>(sql`
  SELECT sc.id AS scene_id, eu.id AS eu_id
  FROM equipment_usage eu
  JOIN equipment_series es ON es.id = eu.equipment_series_id
  JOIN scenes sc ON sc.id = eu.scene_id
  JOIN productions p ON p.id = sc.production_id
  WHERE p.slug = 'poor-things-2023'
    AND es.category = 'lighting_fixture'
  LIMIT 1
`);
if (target.length === 0) {
  console.log('no lighting fixture on poor-things; skipping seed');
  process.exit(0);
}
const t = target[0]!;

const setupRows = await db.execute<{ id: number }>(sql`
  INSERT INTO lighting_setups (scene_id, setup_name, motivation, sort_order)
  VALUES (
    ${t.scene_id},
    'Rooftop master',
    'Soft daylight key motivated by a single bay window; gentle bounce fill from the white wall opposite.',
    0
  )
  ON CONFLICT (scene_id, setup_name) DO UPDATE SET motivation = EXCLUDED.motivation
  RETURNING id
`);
const setupId = setupRows[0]!.id;

await db.execute(sql`
  INSERT INTO lighting_setup_fixtures (setup_id, equipment_usage_id, role, diffusion, color_temp_k, intensity_pct, position_notes)
  VALUES (${setupId}, ${t.eu_id}, 'key', '1/2 Grid Cloth + 1/2 Hampshire Frost', 5600, 80, '12ft 9 o''clock high')
  ON CONFLICT (setup_id, equipment_usage_id) DO UPDATE
    SET diffusion = EXCLUDED.diffusion,
        color_temp_k = EXCLUDED.color_temp_k,
        intensity_pct = EXCLUDED.intensity_pct,
        position_notes = EXCLUDED.position_notes
`);
console.log(`seeded setup id=${setupId} on poor-things-2023`);
process.exit(0);
