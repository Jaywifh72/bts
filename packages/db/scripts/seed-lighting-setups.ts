// Editorial seed for lighting_setups — per-scene lighting plots
// for marquee curated scenes. Each row carries a setup_name, the
// motivation that drove the lighting designer's choice, and notes
// covering the technical execution.
//
// Fixtures (the actual key / fill / back light units) are
// deliberately skipped here; they require equipment_usage rows
// which need their own scene-specific seeding pass. The setups
// themselves are the editorially-significant artifact and render
// usefully without per-fixture detail.
//
// Idempotent on (scene_id, setup_name) — re-running refreshes
// editorial fields without duplicating rows.
import { db, sql } from '../src/index.ts';

type Setup = {
  productionSlug: string;
  sceneSlug: string;
  setupName: string;
  motivation: string;
  notes: string;
};

const SETUPS: Setup[] = [
  {
    productionSlug: 'oppenheimer-2023',
    sceneSlug: 'trinity-test',
    setupName: 'Pre-detonation desert dawn',
    motivation:
      'Hoyte van Hoytema specified a single-source key motivated by the bunker\'s vertical observation slits, with no fill — the underexposed shadow side reads as the silence before the blast. The IMAX 65mm negative\'s latitude carries the sodium-lamp ambient bleed on the practical observation-bunker tubing.',
    notes:
      'The detonation flash itself was a practical multi-cell propane manifold rigged 200 feet from the camera, with the shockwave-delay timing locked to the camera operator\'s slate-clap. No DI augmentation on the flash — the brightness latitude needed careful exposure metering through ND9 glass.',
  },
  {
    productionSlug: 'oppenheimer-2023',
    sceneSlug: 'fission-visions',
    setupName: 'Single-source B&W subjective interior',
    motivation:
      'Inside Oppenheimer\'s head — an unmotivated single hot key from frame-right with no fill, casting hard chiaroscuro. The 65mm Double-X 5222 stock\'s contrast curve does the work; the Light Iron grade preserves the toe-roll into pure black.',
    notes:
      'Hoytema lit the subjective close-ups separately from the dialogue cover, swapping in a tighter beam pattern for the abstract physics-vision interludes. The B&W mag was prepared by Kodak as a custom run — 65mm B&W had been out of manufacture for decades.',
  },
  {
    productionSlug: 'the-batman-2022',
    sceneSlug: 'opening-rooftop',
    setupName: 'Sodium-vapor Gotham overhead',
    motivation:
      'Greig Fraser\'s signature for the production: no traditional studio key, the entire plate motivated by the city\'s sodium-vapor street-lamps. The high-pressure sodium emission curve produces a narrow-spectrum orange that grades into the show-LUT\'s magenta highlight rolloff.',
    notes:
      'Fraser\'s gaffer rigged real high-pressure sodium fixtures off-camera at Pinewood; the ALEXA Mini LF\'s LogC3 captures the narrow spectrum cleanly, and the show-LUT pulls the magenta-cyan complementary into Gotham\'s rain-streaked night look.',
  },
  {
    productionSlug: 'the-batman-2022',
    sceneSlug: 'iceberg-lounge-club',
    setupName: 'Iceberg Lounge red wash',
    motivation:
      'Practical motivation: the club\'s ceiling rig of red theatrical lights spilling onto every surface. Fraser pushed the practicals two stops above key and used minimal fill, letting the LogC3 latitude hold both the hot reds and the deep underexposed shadows.',
    notes:
      'The club set was built with a fully-functional ceiling rig — not VFX. Practical incandescent + LED fixtures dimmed to chase the action. The ALEXA Mini LF rated to EI 1600 to expose into the shadows.',
  },
  {
    productionSlug: 'the-batman-2022',
    sceneSlug: 'batmobile-chase',
    setupName: 'Highway sodium + practical headlamp',
    motivation:
      'Highway-lamp sodium for the ambient + Batmobile\'s afterburner rear-emitter as the dominant direct source. Fraser ran no traditional movie lighting on the chase — the cars were lit by themselves and by the rigged road sodium. The show-LUT does the colour heavy-lifting.',
    notes:
      'The ALEXA Mini LF on a Black Bird tow rig with Russian-arm follow; 800 ISO base ratings; rain-streak elements added optically via fly-rigged dump tanks above frame.',
  },
  {
    productionSlug: 'dune-part-two-2024',
    sceneSlug: 'arrakis-walking-sequence',
    setupName: 'Arrakis solar-zenith',
    motivation:
      'Direct top-down sun simulating Arrakis\'s harsh desert noon. Fraser blocked all bounce + fill — the underexposed shadow side reads as the planet\'s unforgiving environmental scale. The show-LUT pushes saturation into the warm tones.',
    notes:
      'Shot on location in Wadi Rum + Abu Dhabi; supplemental SkyPanel S360-C arrays overhead provided fill on close coverage when the sun moved past the working window.',
  },
  {
    productionSlug: 'dune-part-two-2024',
    sceneSlug: 'imax-bw-arena',
    setupName: 'Giedi Prime IR + B&W arena',
    motivation:
      'A custom monochrome look produced via IR-pass + visible-light separation rather than a colour-grade desaturation. The Giedi Prime sun is a blue dwarf — the IR plate captures the heat-signature-style monochrome the script calls for.',
    notes:
      'Fraser worked with an IR-modified ALEXA LF for the arena; the result was processed alongside the conventional B&W IMAX 65mm pulls during the Light Iron DI.',
  },
  {
    productionSlug: 'killers-of-the-flower-moon-2023',
    sceneSlug: 'osage-prairie-dawn',
    setupName: 'Period-emulation prairie dawn',
    motivation:
      'Rodrigo Prieto wanted a low-contrast period-photographic feel for the Osage prairie scenes — single soft sunrise key with naturally-occurring atmospheric haze providing the global fill. No movie-light supplementation on the wide shots.',
    notes:
      'Shot on Kodak Vision3 5219 negative; Company 3 colour applied a custom film-emulation LUT mimicking 1920s photochemical contact-print output.',
  },
  {
    productionSlug: '1917-2019',
    sceneSlug: 'flare-night-running',
    setupName: 'Flare-only motivated night',
    motivation:
      'Roger Deakins\'s most-discussed setup of the production: the entire night sequence motivated solely by the burning ruined-village flares. Practical fires + hand-held flare units provided the working illumination; no fixed key.',
    notes:
      'The single-take perception meant the flares had to be timed to the actor\'s blocking; Deakins\'s gaffer rigged a propane-bar timing system to ignite each flare at a calibrated frame.',
  },
  {
    productionSlug: 'tar-2022',
    sceneSlug: 'conducting-rehearsal',
    setupName: 'Berlin Philharmonic stage daylight wash',
    motivation:
      'Florian Hoffmeister and the Berlin Philharmonic in-situ — a wash of cold daylight-balanced overhead concert lighting recolored to read as cinematic key. Hoffmeister deliberately worked with the existing rig rather than rebuilding it.',
    notes:
      'Tár\'s orchestra-stage scenes used the actual Berliner Philharmonie venue lights, white-balanced to the LogC3 plate at the colour stage; minimal supplemental fill.',
  },
  {
    productionSlug: 'inception-2010',
    sceneSlug: 'zero-gravity-hotel',
    setupName: 'Rotating-corridor practical wall fixtures',
    motivation:
      'The 100-foot rotating-corridor practical set was built with its own integrated wall-mounted fixtures that rotated with it. Wally Pfister specified that no movie-lighting could be added externally — the corridor had to be self-illuminating throughout the rotation.',
    notes:
      'Practical sconces and ceiling fluorescents pre-baked into the set wiring; their rotation meant the apparent key direction shifted continuously as the camera held the standing performer in frame.',
  },
];

console.log(`seed-lighting-setups — ${SETUPS.length} setups`);

let inserted = 0;
let updated = 0;
let skipped = 0;

for (const s of SETUPS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO lighting_setups (scene_id, setup_name, motivation, notes)
    SELECT sc.id, ${s.setupName}, ${s.motivation}, ${s.notes}
    FROM scenes sc
    JOIN productions p ON p.id = sc.production_id
    WHERE p.slug = ${s.productionSlug} AND sc.slug = ${s.sceneSlug}
    ON CONFLICT (scene_id, setup_name) DO UPDATE SET
      motivation = EXCLUDED.motivation,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  if (r.length === 0) {
    skipped++;
    console.log(`  [!] ${s.productionSlug}/${s.sceneSlug} :: ${s.setupName} — scene not found`);
    continue;
  }
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    inserted++;
    console.log(`  [+] ${s.productionSlug.padEnd(40)} :: ${s.sceneSlug.padEnd(35)} ${s.setupName}`);
  } else {
    updated++;
    console.log(`  [~] ${s.productionSlug.padEnd(40)} :: ${s.sceneSlug.padEnd(35)} refreshed`);
  }
}

console.log(`\nseeded — ${inserted} new + ${updated} refreshed + ${skipped} skipped`);
process.exit(0);
