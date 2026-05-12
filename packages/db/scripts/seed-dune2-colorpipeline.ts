// E-24 demo seed — Dune: Part Two production-default color pipeline.
// ARRI ALEXA 65 LogC3 → ARRI Wide Gamut 3 → ACEScct working →
// Rec.709 D65 SDR / Rec.2020 PQ HDR-10 deliverables.
import { db, sql } from '../src/index.ts';

const r = await db.execute<{ id: number }>(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT
    p.id, NULL, 'ACES with ARRI WG3 IDT (Greig Fraser)',
    'LogC3 (EI 1600 base)', 'ARRI Wide Gamut 3',
    'ACES IDT.ARRI.LogC3.EI1600', 'ACEScct',
    'ACES Output Transform — Rec.709 D65',
    'Rec.709 SDR (theatrical 35mm + Dolby Vision HDR pass for streaming)',
    'Greig Fraser graded with Picture Shop''s Steve Bodner; uses a custom show LUT layered on the ACES Output Transform.'
  FROM productions p
  WHERE p.slug = 'dune-part-two-2024'
  ON CONFLICT (production_id) WHERE scene_id IS NULL DO UPDATE
    SET pipeline_name = EXCLUDED.pipeline_name,
        camera_log = EXCLUDED.camera_log,
        camera_gamut = EXCLUDED.camera_gamut,
        idt = EXCLUDED.idt,
        working_space = EXCLUDED.working_space,
        odt = EXCLUDED.odt,
        deliverable = EXCLUDED.deliverable,
        notes = EXCLUDED.notes
  RETURNING id
`);
if (r.length === 0) {
  console.log('production not found');
  process.exit(1);
}
console.log(`seeded color pipeline id=${r[0]!.id} on dune-part-two-2024`);
process.exit(0);
