// Editorial seed for production_color_pipelines — captures the
// camera-log → IDT → working-space → ODT → deliverable chain for
// ~10 marquee productions whose color science is well-documented
// in industry trade press, ASC interviews, and Cinematography
// Mailing-List threads.
//
// Each row is a per-production default (scene_id NULL); per-scene
// divergences (e.g. a Super-16 mag inserted into a digital shoot)
// can be added later as additional rows. Idempotent on
// (production_id) WHERE scene_id IS NULL via the existing unique
// partial index — re-running refreshes editorial fields.
import { db, sql } from '../src/index.ts';

type PipelineSeed = {
  productionSlug: string;
  pipelineName: string;
  cameraLog?: string;
  cameraGamut?: string;
  idt?: string;
  workingSpace?: string;
  odt?: string;
  deliverable?: string;
  notes?: string;
};

const PIPELINES: PipelineSeed[] = [
  {
    productionSlug: 'oppenheimer-2023',
    pipelineName: 'IMAX 65mm + 65mm B&W color reversal — ARRI / Hoyte van Hoytema',
    cameraLog: 'IMAX 65mm 5-perf negative + B&W 65mm Kodak Double-X 5222 stock',
    cameraGamut: 'Photochemical (no digital sensor primary)',
    idt: 'Custom Light Iron IDT for IMAX scans (Kodak Vision3 5219 negative scan)',
    workingSpace: 'ACEScct via Light Iron color pipeline; 16-bit DPX scan',
    odt: 'Rec.709 D65 for digital deliverables; photochemical contact-print for 70mm IMAX projection',
    deliverable: '70mm IMAX (15-perf) + 70mm 5-perf + 35mm + Dolby Vision HDR + Rec.709 SDR',
    notes:
      'Hoytema specified the B&W 65mm stock (custom-prepared by Kodak; 65mm B&W had not been manufactured for decades). The B&W sequences print to a separate composite reel. Light Iron handled the digital intermediate.',
  },
  {
    productionSlug: 'the-batman-2022',
    pipelineName: 'Sodium-vapor look on ALEXA LF / Mini LF (Greig Fraser)',
    cameraLog: 'LogC3 (EI 800 base; 1600 push for night exteriors)',
    cameraGamut: 'ARRI Wide Gamut',
    idt: 'ACES IDT.ARRI.LogC3.EI800',
    workingSpace: 'ACEScct',
    odt: 'ACES Output Transform — Rec.709 D65 (theatrical) + Dolby Vision PQ-2000 nit (HDR)',
    deliverable: '4K Dolby Vision HDR + Rec.709 SDR + 35mm contact print',
    notes:
      'Fraser specified the night-Gotham sodium-vapor look (orange shadows, magenta highlights) baked into a custom show-LUT applied at colour. The Batmobile chase sequences used a separate per-scene LUT for the rain-streaked windshield.',
  },
  {
    productionSlug: 'dune-part-two-2024',
    pipelineName: 'ACES with ARRI WG3 IDT (Greig Fraser)',
    cameraLog: 'LogC3 (EI 1600 base)',
    cameraGamut: 'ARRI Wide Gamut',
    idt: 'ACES IDT.ARRI.LogC3.EI1600',
    workingSpace: 'ACEScct',
    odt: 'ACES Output Transform — Rec.709 D65',
    deliverable: 'Rec.709 SDR (theatrical 35mm + Dolby Vision HDR pass for streaming)',
    notes:
      'Arrakis day exteriors graded toward an over-saturated tungsten warmth; Giedi Prime stadium sequences shot in IR + B&W.',
  },
  {
    productionSlug: 'mad-max-fury-road-2015',
    pipelineName: 'Heavy DI grade — orange-and-teal codified (John Seale + Eric Whipp)',
    cameraLog: 'ARRI ALEXA LogC3 + Canon EOS C500 LogC + Black Magic Cinema Camera ProRes',
    cameraGamut: 'ARRI Wide Gamut (primary unit) + Canon CinemaGamut (alt unit)',
    idt: 'ACES (multi-camera reconciled at Iloura DI in Melbourne)',
    workingSpace: 'ACEScc (pre-cct era)',
    odt: 'Custom Rec.709 ODT with extreme saturation push; theatrical D65 print pass',
    deliverable: '4K DCP + 35mm contact + Blu-ray HD',
    notes:
      'The orange-desert / teal-night-blue grade became the most-imitated DI look of the 2010s. Eric Whipp at Iloura graded the entire 2-hour film against a custom desaturation key for the chrome-plated war boys.',
  },
  {
    productionSlug: '1917-2019',
    pipelineName: 'Single-take perception — ARRI ALEXA LF (Roger Deakins)',
    cameraLog: 'LogC3',
    cameraGamut: 'ARRI Wide Gamut',
    idt: 'ACES IDT.ARRI.LogC3',
    workingSpace: 'ACEScct',
    odt: 'ACES Output Transform — Rec.709 D65',
    deliverable: '4K Dolby Vision HDR + Rec.709 SDR + 35mm contact print',
    notes:
      'Deakins worked closely with colourist Stefan Sonnenfeld on a unified day-to-night-to-flare grade that had to read continuous across the perceived single-take edit — there is no traditional reel-by-reel grade structure.',
  },
  {
    productionSlug: 'avengers-endgame-2019',
    pipelineName: 'ARRI ALEXA 65 + LF — multi-camera ACES (Trent Opaloch)',
    cameraLog: 'LogC3',
    cameraGamut: 'ARRI Wide Gamut',
    idt: 'ACES IDT.ARRI.LogC3.EI800',
    workingSpace: 'ACEScct',
    odt: 'ACES Output Transform — Rec.709 D65 + Dolby Vision PQ',
    deliverable: '4K Dolby Vision HDR + IMAX Laser DCP + Rec.709 SDR',
    notes:
      'Visual-effects-heavy production; the colour pipeline reconciles the ALEXA-shot photography with the multi-vendor VFX renders (ILM + Weta + Framestore) in a unified ACES space before the per-shot grade.',
  },
  {
    productionSlug: 'killers-of-the-flower-moon-2023',
    pipelineName: 'Kodak Vision3 35mm + ALEXA Mini LF — film-emulation grade (Rodrigo Prieto)',
    cameraLog: 'Kodak Vision3 5219 negative scan + LogC3',
    cameraGamut: 'Photochemical + ARRI Wide Gamut',
    idt: 'Custom Company 3 IDT for negative scan; ACES ARRI IDT for digital pass',
    workingSpace: 'ACEScct via Company 3 colour pipeline',
    odt: 'Rec.709 D65 + Dolby Vision HDR; photochemical look print for theatrical',
    deliverable: '4K Dolby Vision HDR + Rec.709 SDR + 35mm contact + 70mm 5-perf blow-up',
    notes:
      'Prieto + colourist Yvan Lucas at Company 3 designed a period-emulation grade; the 35mm and digital plates are matched within the ACES pipeline before the show-LUT.',
  },
  {
    productionSlug: 'tar-2022',
    pipelineName: 'Cool-baroque grade — ALEXA Mini LF (Florian Hoffmeister)',
    cameraLog: 'LogC3',
    cameraGamut: 'ARRI Wide Gamut',
    idt: 'ACES IDT.ARRI.LogC3.EI800',
    workingSpace: 'ACEScct',
    odt: 'ACES Output Transform — Rec.709 D65',
    deliverable: 'Rec.709 SDR + Dolby Vision HDR pass',
    notes:
      'Hoffmeister specified a cool, controlled grade for the orchestra-rehearsal interiors; the Berlin Philharmonic concert footage was integrated at the colour stage to match the photography.',
  },
  {
    productionSlug: 'spider-man-into-the-spider-verse-2018',
    pipelineName: 'CG-with-half-rate animation — custom show-LUT pipeline',
    cameraLog: 'CG renders (no on-set photography)',
    cameraGamut: 'Linear scene-referred from 3D renders',
    idt: 'Custom Sony Pictures Imageworks IDT translating linear render → ACES',
    workingSpace: 'ACEScg → ACEScct for grade',
    odt: 'Rec.709 D65 + Dolby Vision HDR',
    deliverable: '4K Dolby Vision HDR + Rec.709 SDR theatrical',
    notes:
      'The line-art and ben-day-dot comic-book look is baked into the render pipeline at Sony Pictures Imageworks; the colour grade applies a unified show-LUT on top of the per-character art-direction passes.',
  },
  {
    productionSlug: 'inception-2010',
    pipelineName: 'Photochemical + DI hybrid — 35mm + IMAX (Wally Pfister)',
    cameraLog: 'Kodak Vision3 5219 + 5207 negative; IMAX 65mm',
    cameraGamut: 'Photochemical',
    idt: 'Cineon-based scan IDT (Technicolor DI Park Road)',
    workingSpace: 'Cineon log working space (pre-ACES era)',
    odt: 'Rec.709 ODT for digital deliverables; photochemical answer-print for 35mm + 70mm',
    deliverable: '70mm IMAX 15-perf + 35mm contact + Blu-ray HD',
    notes:
      'Pfister + Pfister-era Nolan was committed to photochemical finishing; the DI was used primarily for VFX integration and the dream-architecture shots. The corridor-rotation hotel sequence was finished photochemically.',
  },
];

console.log(`seed-color-pipelines — ${PIPELINES.length} pipelines`);

let inserted = 0;
let updated = 0;
let skipped = 0;

for (const p of PIPELINES) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO production_color_pipelines (
      production_id, scene_id, pipeline_name,
      camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
    )
    SELECT prod.id, NULL,
      ${p.pipelineName},
      ${p.cameraLog ?? null},
      ${p.cameraGamut ?? null},
      ${p.idt ?? null},
      ${p.workingSpace ?? null},
      ${p.odt ?? null},
      ${p.deliverable ?? null},
      ${p.notes ?? null}
    FROM productions prod
    WHERE prod.slug = ${p.productionSlug}
    ON CONFLICT (production_id) WHERE scene_id IS NULL
    DO UPDATE SET
      pipeline_name = EXCLUDED.pipeline_name,
      camera_log = EXCLUDED.camera_log,
      camera_gamut = EXCLUDED.camera_gamut,
      idt = EXCLUDED.idt,
      working_space = EXCLUDED.working_space,
      odt = EXCLUDED.odt,
      deliverable = EXCLUDED.deliverable,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  if (r.length === 0) {
    skipped++;
    console.log(`  [!] ${p.productionSlug.padEnd(45)} — production not found, skipped`);
    continue;
  }
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    inserted++;
    console.log(`  [+] ${p.productionSlug.padEnd(45)} ${p.pipelineName}`);
  } else {
    updated++;
    console.log(`  [~] ${p.productionSlug.padEnd(45)} refreshed`);
  }
}

console.log(`\nseeded — ${inserted} new + ${updated} refreshed + ${skipped} skipped`);
process.exit(0);
