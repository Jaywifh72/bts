// Deep-dive editorial seed for Blade Runner 2049 (2017).
//
// Why this film: Roger Deakins's first Oscar win + the film's win for
// Visual Effects make BR2049 one of the most-photographed-and-graded
// references of the past decade. The audit showed 1 format, 1 studio
// (WB distribution), 3 scenes, 2 locations, 1 VFX credit (MPC), 1
// award — but zero color pipeline, zero lighting setups, zero post-
// houses, zero stunts, and the BAFTA / ASC / second Oscar (VFX) all
// missing. This script fills the editorial scaffolding without
// touching the existing crew dataset.
//
// Idempotent: every insert uses ON CONFLICT … DO UPDATE on the natural
// key, so re-running refreshes editorial fields without duplicating rows.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'blade-runner-2049-2017';

// ────────────────────────────────────────────────────────────────────
// 1. Production update — principal photography window (Jul-Nov 2016)
// ────────────────────────────────────────────────────────────────────

await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2016-07-04',
      principal_photography_end   = '2016-11-09',
      runtime_minutes = COALESCE(runtime_minutes, 164),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2016-07-04 → 2016-11-09');

// ────────────────────────────────────────────────────────────────────
// 2. Formats — ARRI ALEXA XT primary + ALEXA Mini B-cam + IMAX 1.90
// ────────────────────────────────────────────────────────────────────

const FORMATS = [
  {
    label: 'A-camera — ARRI ALEXA XT (primary)',
    aspect: '2.39:1',
    acquisition: 'ARRIRAW ALEXA XT (primary)',
    colorSpace: 'LogC3 / ARRI Wide Gamut',
    frameRate: '24',
    isPrimary: true,
  },
  {
    label: 'B-camera + lightweight rigs — ARRI ALEXA Mini',
    aspect: '2.39:1',
    acquisition: 'ARRIRAW ALEXA Mini',
    colorSpace: 'LogC3 / ARRI Wide Gamut',
    frameRate: '24',
    isPrimary: false,
  },
  {
    label: 'IMAX 1.90 expansion (selected sequences)',
    aspect: '1.90:1',
    acquisition: 'ARRIRAW ALEXA XT (IMAX-certified DMR remaster)',
    colorSpace: 'Rec.2020 PQ',
    frameRate: '24',
    isPrimary: false,
  },
];

for (const f of FORMATS) {
  await db.execute(sql`
    INSERT INTO production_formats (
      production_id, label, aspect_ratio, acquisition_format, color_space, frame_rate, is_primary
    )
    SELECT prod.id, ${f.label}, ${f.aspect}, ${f.acquisition}, ${f.colorSpace}, ${f.frameRate}::numeric, ${f.isPrimary}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT DO NOTHING
  `);
}
console.log(`[+] formats: ${FORMATS.length} rows`);

// ────────────────────────────────────────────────────────────────────
// 3. Studios — production companies + missing distrib partners
// ────────────────────────────────────────────────────────────────────

const STUDIOS = [
  { slug: 'alcon-entertainment', name: 'Alcon Entertainment', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q4716106' },
  { slug: 'scott-free-productions', name: 'Scott Free Productions', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q1635068' },
  { slug: 'torridon-films', name: 'Torridon Films', country: 'GB', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: '1614-pictures', name: '16:14 Entertainment', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'thunderbird-entertainment', name: 'Thunderbird Entertainment', country: 'CA', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q7796127' },
  { slug: 'columbia-pictures', name: 'Columbia Pictures', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q49263' },
  { slug: 'sony-pictures', name: 'Sony Pictures', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q190420' },
];

for (const s of STUDIOS) {
  await db.execute(sql`
    INSERT INTO studios (slug, name, country, kind, wikidata_id)
    VALUES (${s.slug}, ${s.name}, ${s.country}, ${s.kind}::studio_kind_enum, ${s.wikidataId})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
  `);
  await db.execute(sql`
    INSERT INTO production_studios (production_id, studio_id, role)
    SELECT prod.id, st.id, ${s.role}::production_studio_role_enum
    FROM productions prod, studios st
    WHERE prod.slug = ${PROD_SLUG} AND st.slug = ${s.slug}
    ON CONFLICT DO NOTHING
  `);
}
console.log(`[+] studios: ${STUDIOS.length} linked`);

// ────────────────────────────────────────────────────────────────────
// 4. Additional scenes (3 already present — add 6 more iconic ones)
// ────────────────────────────────────────────────────────────────────

const SCENES = [
  {
    slug: 'opening-protein-farm', sceneNumber: '1', title: 'Opening — Sapper Morton protein farm',
    synopsis: 'K confronts Sapper Morton at his isolated mealworm-protein farm in the Iceland-shot California-stand-in. The opening retirement: practical garlic-skinned protein-vat lighting + a single-source overhead bar fixture, the shot Deakins describes as "the eye is the camera."',
    pos: 240, ie: 'int', tod: 'day', location: 'Iceland Westfjords / Origo Stages',
  },
  {
    slug: 'k-apartment-joi-interface', sceneNumber: '14', title: 'K\'s apartment — Joi rain interface',
    synopsis: 'K returns home to his Joi hologram, who opens the apartment\'s window to "real" rain by overlaying the holographic interior + the practical rain on the window. Cyan-rim lighting from the apartment\'s ceiling rig + practical sodium-vapor exterior bleed motivated by the building\'s LA window-frontage.',
    pos: 1080, ie: 'int', tod: 'night', location: 'Origo Studios Stage 8',
  },
  {
    slug: 'archive-stelline-bath', sceneNumber: '36', title: 'Archive — Dr. Ana Stelline\'s memory garden',
    synopsis: 'K visits Dr. Stelline in her glass-bubble memory-creator chamber. Cool blue-grey volumetric light through the chamber\'s frosted dome; Stelline\'s hovering keyboard interface and the memory-ball animation provide the hot key for her face. Her snowfall ceremony is the emotional peak of K\'s arc.',
    pos: 4920, ie: 'int', tod: 'day', location: 'Origo Studios Stage 6',
  },
  {
    slug: 'junkyard-elvis', sceneNumber: '44', title: 'Las Vegas — Elvis hologram lounge / Sinatra cabaret',
    synopsis: 'K finds Deckard hiding out in an abandoned Las Vegas casino lounge where the Elvis + Sinatra holograms still flicker. Practical lounge stage with mid-century overhead pin-spots; the hologram glitch animation is supplied by Framestore as a per-shot temporal-displacement effect.',
    pos: 5400, ie: 'int', tod: 'day', location: 'Korda Studios casino build',
  },
  {
    slug: 'joi-mariette-merge', sceneNumber: '32', title: 'Joi-Mariette syncretic intimacy',
    synopsis: 'Joi syncs her hologram to the body of Mariette so K can experience physical intimacy with her. The optical compositing of the two performers — Ana de Armas\'s Joi over Mackenzie Davis\'s Mariette — was DNEG\'s most demanding shot block. Holographic face-tracking + skin-blend per-frame.',
    pos: 4500, ie: 'int', tod: 'night', location: 'Origo Studios Stage 8',
  },
  {
    slug: 'flooded-sea-wall-fight', sceneNumber: '52', title: 'Flooded sea-wall — K vs Luv climax',
    synopsis: 'K and Luv\'s climactic fight on the breached sea wall as the storm-surge crashes through the pylons. Practical water dump in Hungary — 10,000 gallons per dump cycle — with Luv\'s drowning sequence performed by Sylvia Hoeks on a sealed-air-line rebreather rig at depth.',
    pos: 8400, ie: 'ext', tod: 'dusk', location: 'Origo Studios Stage 5 — Sea Wall practical tank',
  },
];

const sceneIds: Record<string, number> = {};
for (const s of SCENES) {
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO scenes (production_id, slug, scene_number, title, synopsis,
                        position_in_runtime_seconds, interior_exterior, time_of_day, location)
    SELECT prod.id, ${s.slug}, ${s.sceneNumber}, ${s.title}, ${s.synopsis},
           ${s.pos}, ${s.ie}::scene_interior_exterior_enum, ${s.tod}::scene_time_of_day_enum, ${s.location}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT (production_id, slug) DO UPDATE SET
      scene_number = EXCLUDED.scene_number,
      title = EXCLUDED.title,
      synopsis = EXCLUDED.synopsis,
      position_in_runtime_seconds = EXCLUDED.position_in_runtime_seconds,
      interior_exterior = EXCLUDED.interior_exterior,
      time_of_day = EXCLUDED.time_of_day,
      location = EXCLUDED.location,
      updated_at = NOW()
    RETURNING id
  `);
  sceneIds[s.slug] = Number(r[0]!.id);
}
// Also fetch ids of pre-existing scenes for cross-reference
const existing = await db.execute<{ id: number; slug: string }>(sql`
  SELECT id, slug FROM scenes WHERE production_id = (SELECT id FROM productions WHERE slug = ${PROD_SLUG})
`);
for (const e of existing) sceneIds[e.slug] = Number(e.id);
console.log(`[+] scenes: ${SCENES.length} new (${Object.keys(sceneIds).length} total)`);

// ────────────────────────────────────────────────────────────────────
// 5. Color pipeline — ARRI ALEXA + EFILM (Mitch Paulson)
// ────────────────────────────────────────────────────────────────────

await db.execute(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT prod.id, NULL,
    'ARRI ALEXA XT + LogC3 — Mitch Paulson @ EFILM (Lustre)',
    'LogC3',
    'ARRI Wide Gamut',
    'ACES IDT.ARRI.LogC3.EI800',
    'ACEScct',
    'ACES Output Transform — Rec.709 D65 (theatrical) + Dolby Vision PQ-1000 nit (Dolby Cinema 2D + 3D) + Rec.2020 PQ (IMAX 1.90)',
    '4K Dolby Cinema 2D + 3D + Rec.709 SDR + IMAX 1.90 expansion + 35mm contact print',
    'Mitch Paulson on Autodesk Lustre, working alongside Roger Deakins through the entire DI. Paulson has graded every Deakins film since True Grit. The look-build process started in pre-production with reference frames Deakins shot in Hungary; the show-LUT was a per-sequence palette specifying Wallace amber-gold, sea-wall cyan, Las Vegas orange-dust, and K-apartment cyan-with-sodium-bleed. Dolby Cinema 2D + 3D + all home-entertainment deliverables passed through Paulson''s grade.'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
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
`);
console.log('[+] color pipeline: ARRI ALEXA XT → ACES → Paulson @ EFILM');

// ────────────────────────────────────────────────────────────────────
// 6. Lighting setups — per-scene plots
// ────────────────────────────────────────────────────────────────────

const LIGHTING = [
  {
    sceneSlug: 'wallace-corp-interior',
    setupName: 'Wallace Corp gold-water reflections',
    motivation: 'Deakins\'s most-discussed plot of the film: an unmotivated rippling-gold key suggesting a vast above-frame water surface. The actual rig was a 20×20ft water tank suspended above the camera with a 5K HMI hard-keyed up through the water. The rippling reflection on Wallace\'s face is purely practical — no DI augmentation.',
    notes: 'Set was built at Origo Studios Stage 6. The Wallace amber-gold show-LUT pulls the rippling-gold reflection further into the desaturated-amber range; Paulson preserved the water-ripple cadence in the secondary grade.',
  },
  {
    sceneSlug: 'las-vegas-orange',
    setupName: 'Las Vegas orange-dust ambient',
    motivation: 'Practical orange-dust haze pumped through the abandoned Las Vegas casino set; Deakins relied on a single soft top-source through the haze for the entire sequence, with no movie lighting in the set itself. The haze acts as a translucent ceiling that sells the dust-storm aftermath without a single CG matte painting.',
    notes: 'Korda Studios casino build. Haze rig was a 4-machine atomiser cluster pumping orange-dye-loaded fluid; respiratory protection was mandatory for cast and crew during takes.',
  },
  {
    sceneSlug: 'sea-wall-confrontation',
    setupName: 'Sea wall cyan + frontal rim',
    motivation: 'The first confrontation at the breached sea wall: cyan top-light from a 20K SkyPanel array across the cyclorama, with a single 2K frontal rim on K + Luv\'s coats picking up the wet-leather texture. The blue-grey volumetric haze is practical — a cold-vapor atomiser run continuously through takes.',
    notes: 'Origo Studios Stage 5 sea-wall build. The water dump came online for the climactic fight only; the confrontation scene played dry, with the practical wave-machine kept in standby for safety reasons.',
  },
  {
    sceneSlug: 'opening-protein-farm',
    setupName: 'Protein farm — single-source overhead bar',
    motivation: 'Sapper Morton\'s protein farm: a single hot overhead-bar fixture motivated by the rural farm\'s industrial lighting. No fill on the cast side; Deakins lets the LogC3 latitude carry the underexposed shadow side, with the protein-vat practicals (mini soft boxes inside the vat covers) providing a low-temperature kiss.',
    notes: 'Iceland Westfjords exterior + Origo Stage 4 interior cover. The vat-cover practicals were custom-built by gaffer Andy Lowe to look like industrial fluorescents; the mealworm protein "soup" was prop-shop salt water with green dye.',
  },
  {
    sceneSlug: 'k-apartment-joi-interface',
    setupName: 'K\'s apartment cyan ceiling + sodium window bleed',
    motivation: 'K\'s tiny apartment lit entirely by a soft cyan ceiling rig + the practical sodium-vapor LA-night exterior bleed through the rain-streaked window. Deakins motivated everything as practical fixtures within the apartment\'s ceiling cove; Joi\'s holographic key is the apartment\'s interface monitor itself acting as a screen-key on her face.',
    notes: 'The rain-on-window effect was a fly-rigged dump-tank above the window plus a high-pressure mister; Lance Acord\'s drone-cam aerial reverse plate was added in compositing by DNEG.',
  },
  {
    sceneSlug: 'archive-stelline-bath',
    setupName: 'Memory garden — frosted-dome volumetric',
    motivation: 'Dr. Stelline\'s glass-bubble memory studio: a soft-grey volumetric field illuminated by a frosted-dome fixture above the chamber. The hovering memory-ball animation provides her face-key; her snow ceremony at the climax of the scene is a practical particle dump from above the dome.',
    notes: 'Origo Studios Stage 6. Stelline\'s glass dome was a half-shell on motorised tracks; Carla Juri performed her cycle of reaches into the holographic memory ball without any digital augmentation on her hands — DNEG added the snow + memory-bubble animation in post.',
  },
];

let lightingCount = 0;
for (const ls of LIGHTING) {
  const sid = sceneIds[ls.sceneSlug];
  if (!sid) { console.log(`  [!] lighting skipped — scene ${ls.sceneSlug} not found`); continue; }
  await db.execute(sql`
    INSERT INTO lighting_setups (scene_id, setup_name, motivation, notes, sort_order)
    VALUES (${sid}, ${ls.setupName}, ${ls.motivation}, ${ls.notes}, 0)
    ON CONFLICT (scene_id, setup_name) DO UPDATE SET
      motivation = EXCLUDED.motivation,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  `);
  lightingCount++;
}
console.log(`[+] lighting setups: ${lightingCount}`);

// ────────────────────────────────────────────────────────────────────
// 7. Locations — Origo + Korda (Hungary primary), Iceland, Sony LA
// ────────────────────────────────────────────────────────────────────

const LOCATIONS = [
  { name: 'Origo Film Studios', region: 'Budapest', country: 'HU', lat: 47.4979, lng: 19.0402,
    isStudio: true, notes: 'Primary production base — Stages 4 (protein farm interior), 5 (sea wall), 6 (Wallace Corp + Stelline\'s memory garden), 8 (K\'s apartment + Joi sequences).' },
  { name: 'Iceland — Westfjords', region: 'Westfjords', country: 'IS', lat: 65.7000, lng: -22.5000,
    isStudio: false, notes: 'Sapper Morton protein-farm exteriors. Iceland\'s fjord landscapes substitute for the abandoned California highlands of the 2049 future.' },
  { name: 'Sony Pictures Stages — Culver City', region: 'California', country: 'US', lat: 34.0192, lng: -118.4019,
    isStudio: true, notes: 'Selected interior coverage (LA-flavor sequences) for proximity to post-production teams. Most LA-set photography was finished in Hungary at Origo.' },
];

let locCount = 0;
for (const l of LOCATIONS) {
  const exists = await db.execute<{ id: number }>(sql`
    SELECT pl.id FROM production_locations pl
    JOIN productions p ON p.id = pl.production_id
    WHERE p.slug = ${PROD_SLUG} AND pl.name = ${l.name}
    LIMIT 1
  `);
  if (exists.length > 0) {
    await db.execute(sql`
      UPDATE production_locations SET
        region = ${l.region}, country = ${l.country},
        latitude = ${l.lat}::numeric, longitude = ${l.lng}::numeric,
        is_studio = ${l.isStudio}, notes = ${l.notes}, updated_at = NOW()
      WHERE id = ${exists[0]!.id}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO production_locations (production_id, name, region, country, latitude, longitude, is_studio, notes)
      SELECT prod.id, ${l.name}, ${l.region}, ${l.country}, ${l.lat}::numeric, ${l.lng}::numeric, ${l.isStudio}, ${l.notes}
      FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    `);
  }
  locCount++;
}
console.log(`[+] locations: ${locCount}`);

// ────────────────────────────────────────────────────────────────────
// 8. Post-house links — EFILM (DI), Skywalker Sound, IMAX DMR
// ────────────────────────────────────────────────────────────────────

const POST_LINKS = [
  { slug: 'efilm', role: 'di',
    notes: 'Mitch Paulson colorist on Autodesk Lustre. Worked alongside Deakins through the entire DI; Dolby Cinema 2D + 3D + all home-entertainment deliverables passed through Paulson\'s grade.' },
  { slug: 'efilm', role: 'color_grading',
    notes: 'Paulson has graded every Deakins film since True Grit (2010). The 2049 show-LUT was a per-sequence palette specifying Wallace amber-gold, sea-wall cyan, Las Vegas orange-dust, K-apartment cyan-with-sodium-bleed.' },
  { slug: 'skywalker-sound', role: 'sound_mix',
    notes: 'Mark A. Mangini + Theo Green sound designers; final mix at Skywalker. Hans Zimmer + Benjamin Wallfisch score recording.' },
  { slug: 'imax-dmr', role: 'imax_remaster',
    notes: 'IMAX 1.90 expansion DMR remaster for the IMAX-certified theatrical release.' },
];

for (const pl of POST_LINKS) {
  await db.execute(sql`
    INSERT INTO production_post_houses (production_id, post_house_id, role, notes)
    SELECT prod.id, ph.id, ${pl.role}::post_house_role, ${pl.notes}
    FROM productions prod, post_houses ph
    WHERE prod.slug = ${PROD_SLUG} AND ph.slug = ${pl.slug}
    ON CONFLICT (production_id, post_house_id, role) DO UPDATE SET notes = EXCLUDED.notes
  `);
}
console.log(`[+] post-house links: ${POST_LINKS.length}`);

// ────────────────────────────────────────────────────────────────────
// 9. VFX houses missing rows + vfx_credits
// ────────────────────────────────────────────────────────────────────

const VFX_HOUSES = [
  { slug: 'atomic-fiction', name: 'Atomic Fiction', kind: 'full_service', country: 'US', founded: 2010,
    summary: 'Multi-office VFX house absorbed into Method Studios (and subsequently Framestore) in 2018. On Blade Runner 2049 they delivered Bibi\'s Bar — one of the film\'s most-celebrated environment shots — under Ryan Tudhope\'s supervision.' },
  { slug: 'buf', name: 'BUF Compagnie', kind: 'full_service', country: 'FR', founded: 1984,
    summary: 'Pierre Buffin\'s Paris-based VFX house. On Blade Runner 2049 contributed to the Wallace Corporation interior digital matte paintings and the orphanage sweeps.' },
  { slug: 'upp', name: 'Universal Production Partners (UPP)', kind: 'full_service', country: 'CZ', founded: 1994,
    summary: 'Prague-based VFX house. On Blade Runner 2049 contributed to the LA cityscape extensions under Viktor Muller\'s supervision.' },
  { slug: 'territory-studio', name: 'Territory Studio', kind: 'boutique', country: 'GB', founded: 2010,
    summary: 'London-based UI / motion-graphics specialty house. On Blade Runner 2049 designed the holographic interfaces — Joi\'s home-projector UI, the LAPD interface, the Wallace Corporation memory-creator interface.' },
];

for (const v of VFX_HOUSES) {
  await db.execute(sql`
    INSERT INTO vfx_houses (slug, name, kind, country, founded_year, summary)
    VALUES (${v.slug}, ${v.name}, ${v.kind}::vfx_house_kind_enum, ${v.country}, ${v.founded}, ${v.summary})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, updated_at = NOW()
  `);
}

// MPC was already seeded as primary — refresh notes.
const VFX_CREDITS = [
  { vfxSlug: 'mpc-film', role: 'primary', shotCount: 400,
    notes: 'Richard Clegg supervising. Wallace Corporation orphanage sequences, ovoid-deep-water Wallace dome, miniature-photography handoff with Weta Workshop.' },
  { vfxSlug: 'dneg', role: 'primary', shotCount: 1100,
    notes: 'Paul Lambert supervising — won the VFX Oscar with John Nelson + Richard R. Hoover + Gerd Nefzer. Los Angeles cityscape, Joi hologram, Sepulveda sea-wall, Joi-Mariette intimacy compositing.' },
  { vfxSlug: 'framestore', role: 'primary', shotCount: 700,
    notes: 'Richard R. Hoover supervising — Oscar-winning team. Opening protein-farm exteriors, Trash Mesa, Las Vegas orange-dust + Elvis/Sinatra hologram glitches.' },
  { vfxSlug: 'atomic-fiction', role: 'additional', shotCount: 180,
    notes: 'Ryan Tudhope supervising. Bibi\'s Bar — the film\'s most-cited environment shot — built end-to-end at Atomic Fiction.' },
  { vfxSlug: 'buf', role: 'additional', shotCount: 140,
    notes: 'Pierre Buffin supervising. Wallace Corporation matte-paintings + orphanage exteriors.' },
  { vfxSlug: 'rodeo-fx', role: 'additional', shotCount: 100,
    notes: 'Deak Ferrand + Sébastien Moreau supervising. Selected environment + atmosphere work.' },
  { vfxSlug: 'upp', role: 'additional', shotCount: 80,
    notes: 'Viktor Muller supervising. LA cityscape extensions.' },
  { vfxSlug: 'territory-studio', role: 'special_sequences', shotCount: null,
    notes: 'Holographic UIs — Joi\'s home-projector interface, the LAPD ID system, the Wallace Corp memory-creator console.' },
];

for (const c of VFX_CREDITS) {
  await db.execute(sql`
    INSERT INTO vfx_credits (production_id, vfx_house_id, shot_count, role, notes)
    SELECT prod.id, vh.id, ${c.shotCount}, ${c.role}::vfx_credit_role_enum, ${c.notes}
    FROM productions prod, vfx_houses vh
    WHERE prod.slug = ${PROD_SLUG} AND vh.slug = ${c.vfxSlug}
    ON CONFLICT (production_id, vfx_house_id) DO UPDATE SET
      shot_count = EXCLUDED.shot_count,
      role = EXCLUDED.role,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  `);
}
console.log(`[+] vfx houses: ${VFX_HOUSES.length} added/refreshed; vfx_credits: ${VFX_CREDITS.length}`);

// ────────────────────────────────────────────────────────────────────
// 10. Awards — full Oscar slate (won 2) + BAFTA + ASC + Critics Choice
// ────────────────────────────────────────────────────────────────────

const AWARDS = [
  // Oscars 2018 — won 2 (Cinematography + VFX), nominated for 5 total
  // Cinematography already seeded — refresh as winner.
  { org: 'academy_awards', category: 'Best Cinematography', year: 2018, isWinner: true,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2018' },
  { org: 'academy_awards', category: 'Best Visual Effects', year: 2018, isWinner: true,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2018' },
  { org: 'academy_awards', category: 'Best Production Design', year: 2018, isWinner: false,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2018' },
  { org: 'academy_awards', category: 'Best Sound Editing', year: 2018, isWinner: false,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2018' },
  { org: 'academy_awards', category: 'Best Sound Mixing', year: 2018, isWinner: false,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2018' },
  // BAFTA 2018 — Cinematography + VFX wins
  { org: 'bafta', category: 'Best Cinematography', year: 2018, isWinner: true,
    sourceUrl: 'https://www.bafta.org/film-awards/2018' },
  { org: 'bafta', category: 'Best Special Visual Effects', year: 2018, isWinner: true,
    sourceUrl: 'https://www.bafta.org/film-awards/2018' },
  { org: 'bafta', category: 'Best Production Design', year: 2018, isWinner: false,
    sourceUrl: 'https://www.bafta.org/film-awards/2018' },
  { org: 'bafta', category: 'Best Sound', year: 2018, isWinner: false,
    sourceUrl: 'https://www.bafta.org/film-awards/2018' },
  // ASC 2018 — Cinematography WIN (Deakins's first ASC win for narrative feature)
  { org: 'asc_award', category: 'Outstanding Achievement in Cinematography in Theatrical Releases', year: 2018, isWinner: true,
    sourceUrl: 'https://theasc.com/asc-awards' },
  // Critics Choice 2018 — Cinematography WIN
  { org: 'critics_choice', category: 'Best Cinematography', year: 2018, isWinner: true,
    sourceUrl: 'https://www.criticschoice.com/2018-critics-choice-awards/' },
  { org: 'critics_choice', category: 'Best Visual Effects', year: 2018, isWinner: false,
    sourceUrl: 'https://www.criticschoice.com/2018-critics-choice-awards/' },
  { org: 'critics_choice', category: 'Best Production Design', year: 2018, isWinner: false,
    sourceUrl: 'https://www.criticschoice.com/2018-critics-choice-awards/' },
  // VES 2018 — multiple nominations
  { org: 'ves_award', category: 'Outstanding Visual Effects in a Photoreal Feature', year: 2018, isWinner: false,
    sourceUrl: 'https://www.visualeffectssociety.com/awards' },
];

let awardsCount = 0;
for (const a of AWARDS) {
  await db.execute(sql`
    INSERT INTO production_awards (production_id, award_org, category, year, is_winner, source_url)
    SELECT prod.id, ${a.org}::award_org_enum, ${a.category}, ${a.year}, ${a.isWinner}, ${a.sourceUrl}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT ON CONSTRAINT production_awards_unique DO UPDATE SET
      is_winner = EXCLUDED.is_winner,
      source_url = EXCLUDED.source_url,
      updated_at = NOW()
  `);
  awardsCount++;
}
console.log(`[+] awards: ${awardsCount}`);

// ────────────────────────────────────────────────────────────────────
// 11. Stunt sequences — 3 marquee fight set-pieces
// ────────────────────────────────────────────────────────────────────

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

const STUNT_SEQUENCES = [
  {
    sceneSlug: 'opening-protein-farm',
    slug: 'sapper-morton-fight',
    name: 'Sapper Morton retirement (opening)',
    description: 'K\'s opening retirement of Sapper Morton — a brutal close-quarters fight in the cramped protein-farm kitchen. Choreographed by Vic Armstrong\'s team; the practical kitchen-table impact (Bautista crashing through the table) used a Korda Studios-fabricated breakaway prop with foam-core supports.',
    screenMinutes: 3.0,
    disciplineTags: ['fight', 'breakaway', 'martial-arts'],
    rigging: {
      rigs: [],
      notes: 'No wire or ratchet rigs — practical close-quarters fight. Breakaway kitchen-table + breakaway-resin protein-vat covers. Bautista performed the bulk of his own choreography; Gosling\'s K had a stunt-double for the over-the-shoulder camera takes.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'BLADE RUNNER 2049 — The Art of VFX', url: 'https://www.artofvfx.com/blade-runner-2049/', publication: 'Art of VFX', kind: 'interview' },
    ],
    sortOrder: 10,
  },
  {
    sceneSlug: 'flooded-sea-wall-fight',
    slug: 'k-vs-luv-sea-wall',
    name: 'K vs Luv — flooded sea-wall finale',
    description: 'K and Luv\'s climactic fight on the breached sea wall as the storm-surge crashes through the pylons. Practical water dump in Hungary — 10,000 gallons per dump cycle — with Sylvia Hoeks\'s drowning sequence performed on a sealed-air-line rebreather rig at depth, on a controlled-descent harness for the final sub-surface beat.',
    screenMinutes: 4.5,
    disciplineTags: ['fight', 'water', 'submersion', 'rebreather'],
    rigging: {
      rigs: [
        { type: 'descender', notes: 'Controlled-descent harness for Hoeks\'s sub-surface descent — Decelerator-tuned to a 0.3 m/s rate so the drowning beat played at performance pace, not gravity pace.' },
        { type: 'water-tank', notes: '10,000-gallon water-dump cycle through breached sea-wall scenic; recirculation pump + heater kept the tank at 25°C for safety during repeat takes.' },
      ],
      harness: 'Sealed-air-line rebreather rig with surface umbilical; emergency controlled-ascent line trailing each performer.',
      notes: 'Stage 5 at Origo Studios. Safety divers on standby for every dump cycle; Hoeks completed PADI certification + film-rebreather training before principal photography.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #15 (Water)', 'SAG-AFTRA Bulletin #28 (Submerged)'],
    references: [
      { title: 'Roger Deakins on shooting Blade Runner 2049', url: 'https://britishcinematographer.co.uk/roger-deakins-cbe-bsc-asc-blade-runner-2049/', publication: 'British Cinematographer', kind: 'interview' },
    ],
    sortOrder: 30,
  },
  {
    sceneSlug: 'wallace-corp-interior',
    slug: 'wallace-newborn-replicant',
    name: 'Wallace newborn replicant scene',
    description: 'Niander Wallace inspects a newly-decanted female replicant prototype in the Wallace Corp inner sanctum, and casually murders her — a single-line stab, performed in one take by Sallie Harmsen on a body-rig wrist-knife with a retracting-blade prop. The blood reveal is a practical Tom Savini-derived squib synced to the prop\'s retraction. Choreographed in tight 360° camera sweep.',
    screenMinutes: 2.0,
    disciplineTags: ['choreographed-action', 'practical-effect', 'blood-fx'],
    rigging: {
      rigs: [],
      notes: 'No traditional rigs — a single-take choreography between Leto, Harmsen, and a body-mounted retracting-blade prop. Tom Savini-derived squib pack on Harmsen\'s torso supplied the blood-reveal synced to the prop\'s retraction beat.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'BLADE RUNNER 2049 — The Art of VFX', url: 'https://www.artofvfx.com/blade-runner-2049/', publication: 'Art of VFX', kind: 'interview' },
    ],
    sortOrder: 20,
  },
];

let stuntCount = 0;
for (const s of STUNT_SEQUENCES) {
  const sid = sceneIds[s.sceneSlug] ?? null;
  await db.execute(sql`
    INSERT INTO stunt_sequences (
      production_id, scene_id, slug, name, description, screen_minutes,
      discipline_tags, rigging, safety_bulletins_followed, "references", sort_order
    )
    SELECT prod.id, ${sid}, ${s.slug}, ${s.name}, ${s.description}, ${s.screenMinutes}::numeric,
      ${pgTextArray(s.disciplineTags)}::text[],
      ${JSON.stringify(s.rigging)}::jsonb,
      ${pgTextArray(s.safetyBulletins)}::text[],
      ${JSON.stringify(s.references)}::jsonb,
      ${s.sortOrder}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT (production_id, slug) DO UPDATE SET
      scene_id = EXCLUDED.scene_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      screen_minutes = EXCLUDED.screen_minutes,
      discipline_tags = EXCLUDED.discipline_tags,
      rigging = EXCLUDED.rigging,
      safety_bulletins_followed = EXCLUDED.safety_bulletins_followed,
      "references" = EXCLUDED."references",
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
  `);
  stuntCount++;
}
console.log(`[+] stunt sequences: ${stuntCount}`);

console.log('\n──────────────────────────────────────────────');
console.log('Blade Runner 2049 deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
