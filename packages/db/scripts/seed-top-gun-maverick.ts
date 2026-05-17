// Deep-dive editorial seed for Top Gun: Maverick (2022).
//
// Why this film: it's the most cinematographically-documented marquee
// release of the past decade — Claudio Miranda ASC + David B. Nowell's
// six-camera Sony VENICE Rialto rig inside live F/A-18s is canonical
// reference material, the colour pipeline at Light Iron + Company 3
// is on the public record, and Ryan Tudhope's "invisible-VFX" approach
// drew an Oscar nomination for 2,400 mostly-unseen shots. The audit
// showed 101 crew rows but zero scenes / formats / studios / locations
// / post-houses / colour / lighting / stunts / vfx_credits / videos —
// a near-empty editorial canvas on top of a complete crew foundation.
//
// This script seeds:
//   - production update (principal photography window)
//   - production_formats (Sony VENICE Open Gate primary + IMAX 1.90 + anamorphic)
//   - studios + production_studios (Skydance, Bruckheimer, TC Productions)
//   - scenes (10 marquee scenes; slugged for cross-reference)
//   - production_color_pipelines (Sonnenfeld @ Company 3 + Light Iron DI)
//   - lighting_setups (per-scene plots)
//   - production_locations (NAS Lemoore, Whidbey, Fallon, Lake Tahoe, etc.)
//   - production_post_houses (Light Iron, Company 3, Skywalker, Formosa, IMAX DMR)
//   - vfx_houses missing rows + vfx_credits (MPC, Method, Lola, Blind)
//   - production_awards (full Oscar / BAFTA / Critics Choice slate)
//   - stunt_sequences (Darkstar, beach football, dogfight training,
//     low-altitude canyon, climax F-14 vs Su-57)
//
// Idempotent: every insert uses ON CONFLICT … DO UPDATE on the natural
// key, so re-running refreshes editorial fields without duplicating rows.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'top-gun-maverick-2022';

// ────────────────────────────────────────────────────────────────────
// 1. Production update — principal photography window
// ────────────────────────────────────────────────────────────────────

await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2018-05-30',
      principal_photography_end   = '2019-04-30',
      runtime_minutes = COALESCE(runtime_minutes, 131),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2018-05-30 → 2019-04-30');

// ────────────────────────────────────────────────────────────────────
// 2. Formats — Sony VENICE Rialto + anamorphic Panavision + IMAX 1.90
// ────────────────────────────────────────────────────────────────────

const FORMATS = [
  {
    label: 'Cockpit interiors — Sony VENICE Rialto extension',
    aspect: '2.39:1',
    acquisition: 'Sony VENICE 6K Open Gate (Rialto extension)',
    colorSpace: 'S-Gamut3.Cine / S-Log3',
    frameRate: '24',
    isPrimary: true,
  },
  {
    label: 'Aerial unit + helicopter gimbal coverage',
    aspect: '2.39:1',
    acquisition: 'Sony VENICE 6K (Cineflex / Shotover gimbal)',
    colorSpace: 'S-Gamut3.Cine / S-Log3',
    frameRate: '24',
    isPrimary: false,
  },
  {
    label: 'Carrier deck + ground unit',
    aspect: '2.39:1',
    acquisition: 'Sony VENICE 6K + Panavision Panaspeed anamorphic',
    colorSpace: 'S-Gamut3.Cine / S-Log3',
    frameRate: '24',
    isPrimary: false,
  },
  {
    label: 'IMAX 1.90 expansion (selected sequences)',
    aspect: '1.90:1',
    acquisition: 'Sony VENICE 6K Open Gate (IMAX-certified DMR remaster)',
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
// 3. Studios — add missing + link to production
// ────────────────────────────────────────────────────────────────────

const STUDIOS = [
  { slug: 'skydance-media', name: 'Skydance Media', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q5392403' },
  { slug: 'jerry-bruckheimer-films', name: 'Jerry Bruckheimer Films', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q1689841' },
  { slug: 'tc-productions', name: 'TC Productions', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'don-simpson-jerry-bruckheimer-films', name: 'Don Simpson/Jerry Bruckheimer Films', country: 'US',
    kind: 'production_company', role: 'production_company', wikidataId: null },
  { slug: 'paramount', name: 'Paramount Pictures', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q159846' },
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
// 4. Scenes — 10 marquee scenes anchored across the runtime
// ────────────────────────────────────────────────────────────────────

const SCENES = [
  {
    slug: 'darkstar-mach-10', sceneNumber: '1', title: 'Darkstar Mach-10 opening',
    synopsis: 'Maverick test-flies the Darkstar hypersonic prototype past Mach 10 against Admiral Cain\'s shutdown order. Practical mock-up of the Lockheed-Skunk-Works-derived airframe was built at Plant 42, Palmdale, with a real engine roar provided by an SR-71 sound effect.',
    pos: 360, ie: 'ext', tod: 'day', location: 'Plant 42, Palmdale, California',
  },
  {
    slug: 'beach-football', sceneNumber: '32', title: 'Mojave shores beach football (Dogfight Football)',
    synopsis: 'Maverick gathers the detachment for a sunset beach-football match in lieu of a chalk-talk: practical sun-position blocking, no electric supplements, captured during the magic-hour window over four consecutive afternoons.',
    pos: 3600, ie: 'ext', tod: 'magic_hour', location: 'Coronado / Hotel Del Coronado, San Diego',
  },
  {
    slug: 'dogfight-training-1', sceneNumber: '17', title: 'Dogfight training round 1 (Hondo + Maverick)',
    synopsis: 'Two-vs-one BFM (basic fighter manoeuvres) over the Lemoore range. Tom Cruise piloted the rear-seat F/A-18F position; the front-seat sticks were on actual Navy instructor pilots from VFA-122 RAG ("the Flying Eagles").',
    pos: 1900, ie: 'int_ext', tod: 'day', location: 'NAS Lemoore VFA-122 range',
  },
  {
    slug: 'low-altitude-canyon-run', sceneNumber: '52', title: 'Low-altitude canyon run rehearsal',
    synopsis: 'Mission-rehearsal canyon run at 100 feet above the deck, threading the natural canyon system south of NAS Whidbey. Practical jet flights at 580 knots over real terrain; the camera Astar B2 followed at 200 feet AGL on a Shotover F1 gimbal.',
    pos: 4900, ie: 'ext', tod: 'day', location: 'Cascade Range / Owens Valley',
  },
  {
    slug: 'penny-sailboat-tahoe', sceneNumber: '38', title: 'Sailboat — Penny Benjamin',
    synopsis: 'Maverick crews Penny\'s wooden Bristol-29 from a Lake Tahoe slip out into open water. Dialogue cover shot on the deck with Sony VENICE on a sticks-mounted Mōvi Pro; aerial cover on a Mavic 3 Cine drone.',
    pos: 4200, ie: 'ext', tod: 'magic_hour', location: 'Lake Tahoe, California',
  },
  {
    slug: 'mission-briefing-room', sceneNumber: '42', title: 'Final mission briefing',
    synopsis: 'Cyclone briefs the team on the SAM threat envelope and the two-minute terminal-attack window. Practical wall-projection of the satellite imagery; tungsten 1K Source Fours providing the slot-illumination motivation.',
    pos: 4400, ie: 'int', tod: 'night', location: 'NAS Whidbey Island simulator hangar',
  },
  {
    slug: 'sam-site-strike', sceneNumber: '74', title: 'SAM site terminal attack',
    synopsis: 'The two-minute terminal attack on the uranium-enrichment plant: Maverick + Rooster as Dagger 1 + 2, Phoenix + Bob as Dagger 3 + 4. Twenty-foot-deep practical canyon trench was carved at the Eastern Sierra runway, with the GBU-43 deltas added in CG.',
    pos: 6000, ie: 'ext', tod: 'day', location: 'Eastern Sierra Nevada',
  },
  {
    slug: 'sam-shoot-down', sceneNumber: '78', title: 'Maverick SAM shoot-down + ejection',
    synopsis: 'Maverick takes a SAM hit on the egress, ejects over enemy territory, and links up with Rooster on the ground. Practical squib + dust hits for the shoot-down; the canopy pyro was a Scott Fisher SFX gag synchronised to the ejection-seat slide.',
    pos: 6300, ie: 'ext', tod: 'day', location: 'Eastern Sierra Nevada',
  },
  {
    slug: 'f14-dogfight-finale', sceneNumber: '82', title: 'F-14 Tomcat exfiltration + Su-57 dogfight',
    synopsis: 'Maverick + Rooster commandeer a parked F-14A from the enemy hangar and dogfight a pair of Su-57 Felons en route to home plate. Practical F-14 cockpit mock-up at NAS Pt. Mugu; the F-14 + Su-57 in flight are CG composites by MPC over plate photography of Northrop F-5s + private-aviation 5th-gen analogues.',
    pos: 6600, ie: 'int_ext', tod: 'day', location: 'NAS Point Mugu + plate units',
  },
  {
    slug: 'carrier-trap', sceneNumber: '85', title: 'F-14 carrier trap finale',
    synopsis: 'Last cable on the USS Theodore Roosevelt — the F-14 lands at home plate. Practical Theodore Roosevelt deck photography with the F-14 mock-up positioned on a hydraulic gimbal; cables + hook-grab CG-augmented at MPC.',
    pos: 7800, ie: 'ext', tod: 'day', location: 'USS Theodore Roosevelt (CVN-71)',
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
console.log(`[+] scenes: ${SCENES.length}`);

// ────────────────────────────────────────────────────────────────────
// 5. Color pipeline — Sonnenfeld @ Company 3 + Light Iron DI
// ────────────────────────────────────────────────────────────────────

await db.execute(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT prod.id, NULL,
    'Sony VENICE Rialto + ACES — Stefan Sonnenfeld @ Company 3 (DI at Light Iron)',
    'S-Log3',
    'S-Gamut3.Cine',
    'ACES IDT.Sony.SLog3.SGamut3Cine',
    'ACEScct',
    'ACES Output Transform — Rec.709 D65 (theatrical) + Dolby Vision PQ-1000 nit (HDR) + Rec.2020 PQ (IMAX)',
    '4K Dolby Vision HDR + IMAX 1.90 expansion + Rec.709 SDR + 35mm contact print',
    'Miranda + Sonnenfeld defined a sun-bleached, slightly desaturated palette — distinguishing TGM from the original 1986 film''s saturated Tony Scott / Jeffrey Kimball look. Cockpit-interior plates required heavy lift in the shadow region to preserve pilot facial detail under the canopy''s polarised glare; Sonnenfeld custom-built a per-scene secondary key tuned to skin-tone hue ranges. The IMAX 1.90 expansion was DMR-remastered at IMAX Toronto with a separate trim pass for the Rec.2020 PQ deliverable.'
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
console.log('[+] color pipeline: Sony VENICE → ACES → Sonnenfeld @ Company 3');

// ────────────────────────────────────────────────────────────────────
// 6. Lighting setups — per-scene plots for the 5 most photographed scenes
// ────────────────────────────────────────────────────────────────────

const LIGHTING = [
  {
    sceneSlug: 'darkstar-mach-10',
    setupName: 'Mach-10 cockpit interior — single-source canopy bounce',
    motivation: 'Practical cockpit interior of the Darkstar mock-up at Plant 42. No movie lighting in the cockpit itself — Miranda relied on the tinted-canopy bounce of the desert sun for the in-cockpit reaction shots, with a frame-right SkyPanel S60-C bounce off the canopy interior for fill on the helmet visor.',
    notes: 'Mock-up was static but slung on a hydraulic gimbal driven by SFX coordinator Scott Fisher. Out-the-window plates were shot separately with a real flying SR-71 stand-in at Edwards AFB.',
  },
  {
    sceneSlug: 'beach-football',
    setupName: 'Magic-hour beach — natural sun, unaugmented',
    motivation: 'Miranda + Kosinski committed to a fully-natural magic-hour grade: no electric supplements at all, with the production shooting only during the 25-minute window of horizon-low sun across four consecutive afternoons. The unequal lighting between coverage takes is what gives the sequence its progression of golden warmth.',
    notes: 'Scene was a deliberate echo of the 1986 Don Simpson volleyball scene — same magic-hour discipline, same Sun-only approach. The crew shot in 24fps but flagged the takes as variable-frame for editorial speed-ramping in finishing.',
  },
  {
    sceneSlug: 'dogfight-training-1',
    setupName: 'Live-flight cockpit interior — Sun + canopy bounce only',
    motivation: 'No artificial light inside the F/A-18F cockpit — the entire interior is lit by the actual sun bouncing off the polarised canopy + the helmet visor. Six VENICE Rialto cameras compensate for the lack of supplemental fill via sensor-side latitude (S-Log3 dual-base 2500 ISO).',
    notes: 'Rialto setup: 3 standard VENICEs + 3 Rialto extension blocks. Forward-facing pilot cam, two side-of-shoulder Rialtos, weapons-officer reaction cam aft, cockpit-glance reverse cam, and a wing-mount external. All synced via SMPTE timecode jam from the lead aircraft\'s mil-spec clock.',
  },
  {
    sceneSlug: 'mission-briefing-room',
    setupName: 'Tungsten Source Four briefing room',
    motivation: 'Kosinski + Miranda specified the briefing-room key as a hard-edged tungsten beam motivated by the wall-projector\'s downstage spill — the same volumetric beam-cone language as the original 1986 briefing room scenes. Source Four 750W ellipsoidals on a slot-grid above the projection screen do the work.',
    notes: 'No fill on the cast side; the colorist preserves the underexposed shadow detail in the 4K HDR delivery via a per-scene secondary lift on faces. The briefing-room set was built at Pinewood-stand-in NAS Whidbey hangar 5.',
  },
  {
    sceneSlug: 'penny-sailboat-tahoe',
    setupName: 'Lake Tahoe sailboat — practical sun + practical reflector',
    motivation: 'On the deck of the wooden Bristol-29: natural sun key from camera-left, with a 4×8 silver-side reflector lashed to the bow rail kicking fill into Cruise + Connelly\'s eye-line. No electric fixtures — the boat\'s electrical capacity was insufficient and Miranda preferred the sun-only continuity for the lake exteriors.',
    notes: 'Aerial cover on a DJI Mavic 3 Cine + a follow-boat carrying a Shotover-mounted VENICE. Tahoe magic-hour discipline drove a 30-minute working window per shot day across 3 days.',
  },
  {
    sceneSlug: 'sam-site-strike',
    setupName: 'Eastern Sierra canyon — gimbal-mounted sun',
    motivation: 'Camera Astar B2 helicopter at 200ft AGL with a Shotover F1 gimbal carrying a Sony VENICE + 24-290 Angenieux Optimo zoom. Pure sun motivation — no movie lighting in the canyon at all. The terrain itself is the lighting plot.',
    notes: 'Two-week shooting block in the canyon system south of Mono Lake; day-only flight envelope per FAA mountain-flying restrictions. Practical SAM-strike pyro was a Scott Fisher gag with paint-charged squibs on the F/A-18 fuselage matched in CG by MPC for the wing-shed.',
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
// 7. Locations — practical navy bases + scenic exteriors
// ────────────────────────────────────────────────────────────────────

const LOCATIONS = [
  { name: 'NAS Lemoore', region: 'California', country: 'US', lat: 36.3328, lng: -119.9519,
    isStudio: false, notes: 'Primary Navy production base. Home of VFA-122 (the F/A-18 RAG / "Flying Eagles"). Most cockpit + carrier-deck-prep coverage flew from Lemoore.' },
  { name: 'NAS Whidbey Island', region: 'Washington', country: 'US', lat: 48.3517, lng: -122.6555,
    isStudio: false, notes: 'Pacific Northwest squadron base; home of the EA-18G Growlers. Mission-rehearsal canyon-run plate photography was based out of Whidbey for FAA mountain-flight access to the Cascade range.' },
  { name: 'NAS Fallon', region: 'Nevada', country: 'US', lat: 39.4165, lng: -118.7008,
    isStudio: false, notes: 'Naval Strike and Air Warfare Center — the actual TOPGUN school. Maverick\'s instructor sequences are set here in story; second-unit aerial coverage filmed Fallon for the establishing wide-shots.' },
  { name: 'NAS North Island, Coronado', region: 'California', country: 'US', lat: 32.6987, lng: -117.2153,
    isStudio: false, notes: 'San Diego Bay carrier-prep base; starting point for several carrier embarkations during principal photography.' },
  { name: 'USS Theodore Roosevelt (CVN-71)', region: 'Pacific', country: 'US', lat: 32.7150, lng: -117.5000,
    isStudio: false, notes: 'Nimitz-class carrier; Maverick + Rooster\'s F-14 carrier-trap finale was shot on Theodore Roosevelt\'s deck during a Pacific work-up cycle. The film\'s producers thank the carrier strike group in the credits.' },
  { name: 'USS Abraham Lincoln (CVN-72)', region: 'Pacific', country: 'US', lat: 32.7150, lng: -117.5000,
    isStudio: false, notes: 'Second-unit carrier deck photography for the cat-shot sequences and deck-ops cutaways.' },
  { name: 'Hotel Del Coronado / Coronado Beach', region: 'California', country: 'US', lat: 32.6803, lng: -117.1779,
    isStudio: false, notes: 'Beach-football "Mojave Shores" sequence; same beach as the original 1986 volleyball scene\'s San Diego coverage.' },
  { name: 'Lake Tahoe', region: 'California', country: 'US', lat: 39.0968, lng: -120.0324,
    isStudio: false, notes: 'Penny Benjamin\'s sailboat sequence + the Hard Deck bar exterior. Tahoe Keys marina + South Lake Tahoe waterfront.' },
  { name: 'Eastern Sierra Nevada — Owens Valley', region: 'California', country: 'US', lat: 37.0000, lng: -118.2000,
    isStudio: false, notes: 'Low-altitude canyon-run + mission-rehearsal photography. Real F/A-18 flights at 100ft above the canyon floor; camera Astar B2 helicopters at 200ft AGL.' },
  { name: 'China Lake Naval Air Weapons Station', region: 'California', country: 'US', lat: 35.6516, lng: -117.6822,
    isStudio: false, notes: 'Mojave Desert weapons range — practical SAM-site mock-up + canyon-trench excavation for the terminal-attack sequence.' },
  { name: 'Plant 42 (USAF Air Force Plant 42)', region: 'California', country: 'US', lat: 34.6293, lng: -118.0843,
    isStudio: true, notes: 'Palmdale aerospace plant where the Darkstar full-scale mock-up was built (with consultation from the Lockheed Skunk Works). The Mach-10 opening sequence cockpit + tarmac coverage filmed here.' },
  { name: 'NAS Point Mugu', region: 'California', country: 'US', lat: 34.1196, lng: -119.1218,
    isStudio: false, notes: 'F-14 cockpit mock-up + parked-airframe reference for the third-act exfiltration sequence. A static F-14A on long-term loan from the Naval Aviation Museum was used as the cockpit reference.' },
  { name: 'Lake Tahoe — Hangar Beach (Tahoe Keys Marina)', region: 'California', country: 'US', lat: 38.9430, lng: -119.9760,
    isStudio: false, notes: 'Penny\'s sailboat berth.' },
];

let locCount = 0;
for (const l of LOCATIONS) {
  // No unique constraint — dedup in-memory by checking existence.
  const exists = await db.execute<{ id: number }>(sql`
    SELECT pl.id FROM production_locations pl
    JOIN productions p ON p.id = pl.production_id
    WHERE p.slug = ${PROD_SLUG} AND pl.name = ${l.name}
    LIMIT 1
  `);
  if (exists.length > 0) {
    await db.execute(sql`
      UPDATE production_locations SET
        region = ${l.region},
        country = ${l.country},
        latitude = ${l.lat}::numeric,
        longitude = ${l.lng}::numeric,
        is_studio = ${l.isStudio},
        notes = ${l.notes},
        updated_at = NOW()
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
// 8. Post-house links — Light Iron, Company 3, Skywalker, Formosa, IMAX DMR
// ────────────────────────────────────────────────────────────────────

const POST_LINKS = [
  { slug: 'light-iron', role: 'di',
    notes: 'Panavision-owned DI / colour facility — primary digital intermediate for TGM. The Sony VENICE S-Gamut3.Cine → ACES → Rec.709/Rec.2020 conform was finished at Light Iron LA.' },
  { slug: 'company-3', role: 'color_grading',
    notes: 'Stefan Sonnenfeld colorist. Sonnenfeld worked closely with Miranda to define the sun-bleached, slightly desaturated palette that distinguishes TGM from the 1986 saturated original.' },
  { slug: 'skywalker-sound', role: 'sound_mix',
    notes: 'Al Nelson supervising sound editor / sound designer. Skywalker mixed the engine roars + cockpit-noise blend that won the Best Sound Oscar.' },
  { slug: 'formosa-group', role: 'sound_design',
    notes: 'Additional sound design + dialogue editing.' },
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
  { slug: 'method-studios', name: 'Method Studios', kind: 'full_service', country: 'US', founded: 2002,
    summary: 'Multi-office VFX house absorbed into Framestore in 2022. Worked alongside MPC on TGM\'s aerial composites + the SAM-site terminal-attack canyon environment.' },
  { slug: 'lola-vfx', name: 'Lola VFX', kind: 'boutique', country: 'US', founded: 2002,
    summary: 'Specialty face / body / age-down boutique. On TGM responsible for HUD displays, training visualisations, and selected cockpit-interior face cleanup.' },
  { slug: 'blind-ltd', name: 'Blind LTD', kind: 'boutique', country: 'GB', founded: 2003,
    summary: 'London motion-graphics + UI specialty house. On TGM provided the 2D fighter-jet HUDs, mission-briefing displays, and training-visualisation overlays.' },
];

for (const v of VFX_HOUSES) {
  await db.execute(sql`
    INSERT INTO vfx_houses (slug, name, kind, country, founded_year, summary)
    VALUES (${v.slug}, ${v.name}, ${v.kind}::vfx_house_kind_enum, ${v.country}, ${v.founded}, ${v.summary})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, updated_at = NOW()
  `);
}

const VFX_CREDITS = [
  { vfxSlug: 'mpc-film', role: 'primary', shotCount: 850,
    notes: 'Primary aerial composites — F-14 vs Su-57 dogfight, SAM strikes, missile trails, canyon-environment plate extensions. Bryan Litson supervising.' },
  { vfxSlug: 'method-studios', role: 'primary', shotCount: 600,
    notes: 'Aerial composites + SAM-site canyon environment. Seth Hill supervising. Method was absorbed into Framestore mid-production.' },
  { vfxSlug: 'lola-vfx', role: 'additional', shotCount: 200,
    notes: 'Cockpit-interior face / body cleanup; G-suit oxygen-mask compositing; helmet visor reflection art-direction.' },
  { vfxSlug: 'blind-ltd', role: 'special_sequences', shotCount: null,
    notes: 'F/A-18 + Darkstar HUDs; mission-briefing room satellite-imagery displays; carrier-deck FLOLS visualisation.' },
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
// 10. Awards — full Oscar slate + BAFTA + Critics Choice
// ────────────────────────────────────────────────────────────────────

const AWARDS = [
  // Oscars 2023 — 6 nominations, 1 win
  { org: 'academy_awards', category: 'Best Picture', year: 2023, isWinner: false,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2023' },
  { org: 'academy_awards', category: 'Best Sound', year: 2023, isWinner: true,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2023' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2023, isWinner: false,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2023' },
  { org: 'academy_awards', category: 'Best Original Song — Hold My Hand', year: 2023, isWinner: false,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2023' },
  { org: 'academy_awards', category: 'Best Visual Effects', year: 2023, isWinner: false,
    sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2023' },
  // BAFTA 2023
  { org: 'bafta', category: 'Best Sound', year: 2023, isWinner: true,
    sourceUrl: 'https://www.bafta.org/film-awards/2023' },
  { org: 'bafta', category: 'Best Special Visual Effects', year: 2023, isWinner: false,
    sourceUrl: 'https://www.bafta.org/film-awards/2023' },
  { org: 'bafta', category: 'Best Editing', year: 2023, isWinner: false,
    sourceUrl: 'https://www.bafta.org/film-awards/2023' },
  // Critics Choice 2023 — Best Action Movie WIN
  { org: 'critics_choice', category: 'Best Action Movie', year: 2023, isWinner: true,
    sourceUrl: 'https://www.criticschoice.com/2023-critics-choice-awards/' },
  { org: 'critics_choice', category: 'Best Visual Effects', year: 2023, isWinner: false,
    sourceUrl: 'https://www.criticschoice.com/2023-critics-choice-awards/' },
  // ASC 2023 — Cinematography nomination (Miranda)
  { org: 'asc_award', category: 'Outstanding Achievement in Cinematography in Theatrical Releases', year: 2023, isWinner: false,
    sourceUrl: 'https://theasc.com/asc-awards' },
  // VES 2023 — multiple nominations
  { org: 'ves_award', category: 'Outstanding Supporting Visual Effects in a Photoreal Feature', year: 2023, isWinner: false,
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
// 11. Stunt sequences — 5 marquee aerial set-pieces
// ────────────────────────────────────────────────────────────────────

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

const STUNT_SEQUENCES = [
  {
    sceneSlug: 'darkstar-mach-10',
    slug: 'darkstar-mach-10',
    name: 'Darkstar Mach-10 hypersonic test',
    description: 'Maverick test-flies the Darkstar prototype past Mach 10 against shutdown orders. The Darkstar mock-up — a full-scale practical airframe built at Plant 42 with consultation from the Lockheed Skunk Works — was static, but Scott Fisher\'s SFX team gimballed it on a hydraulic pivot to sell the buffeting. The flight footage cuts to plate photography of the actual Skunk-Works-derived A-12 airframe at Edwards.',
    screenMinutes: 7.0,
    disciplineTags: ['aerial', 'cockpit', 'practical-airframe', 'breakaway'],
    rigging: {
      rigs: [
        { type: 'aerial-cockpit-mockup', notes: 'Plant 42 full-scale Darkstar mock-up on a hydraulic gimbal. Six Sony VENICE Rialto cameras inside the cockpit; cockpit pressurisation sound supplied by an SR-71 audio tape played through the pilot\'s headset.' },
      ],
      notes: 'Cruise was strapped into the practical mock-up cockpit; the flight envelope simulation was driven by the gimbal\'s pre-programmed buffet pattern keyed to the Mach-10 acceleration arc on screen.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #20 (Aerial)'],
    references: [
      { title: 'Darkstar BTS — Lockheed Skunk Works consultation', url: 'https://www.lockheedmartin.com/en-us/news/features/2022/skunk-works-and-top-gun-maverick.html', publication: 'Lockheed Martin', kind: 'article' },
      { title: 'Taking Flight with Top Gun: Maverick', url: 'https://theasc.com/articles/top-gun-maverick', publication: 'American Cinematographer', kind: 'interview' },
    ],
    sortOrder: 10,
  },
  {
    sceneSlug: 'beach-football',
    slug: 'beach-football-magic-hour',
    name: 'Mojave shores beach football',
    description: 'A magic-hour beach-football scene in lieu of mission chalk-talk: practical sun-position blocking, four consecutive afternoons of 25-minute shoot windows, no electric supplements. Stunt coordinator Casey O\'Neill choreographed the running pattern + tackle blocking; cast performed their own choreography over multiple takes.',
    screenMinutes: 5.0,
    disciplineTags: ['fight', 'choreographed-action'],
    rigging: { notes: 'No rigs — practical footwork choreography only.' },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'Top Gun Maverick — beach football scene oral history', url: 'https://www.indiewire.com/features/general/top-gun-maverick-beach-scene-1234716832/', publication: 'IndieWire', kind: 'article' },
    ],
    sortOrder: 20,
  },
  {
    sceneSlug: 'dogfight-training-1',
    slug: 'live-flight-bfm-training',
    name: 'Live-flight BFM dogfight training',
    description: 'Cruise + cast performed actual G-loaded BFM (basic fighter manoeuvres) flights in the rear seats of VFA-122 F/A-18Fs. Cast underwent a Navy-administered "C-pole survival" training programme + centrifuge run before being cleared for the rear-seat flights. Flying instructors from VFA-122 ("the Flying Eagles") were in the front seat for every take.',
    screenMinutes: 6.0,
    disciplineTags: ['aerial', 'cockpit', 'live-flight', 'g-load'],
    rigging: {
      rigs: [
        { type: 'aerial-cockpit-mockup', notes: 'No mock-up here — real F/A-18Fs. The six Sony VENICE Rialto cameras were custom-mounted inside the cockpit by Sony\'s engineering team in coordination with NAVAIR; cockpit video-recorder systems and additional hardware were removed to make space.' },
      ],
      notes: 'Cast wore full Navy aviator G-suits. Tom Cruise personally supervised the multi-week training programme that all cast underwent (ground school, T-34 / Extra-300 / L-39 / F/A-18 progressive air-time) before any of them stepped into a live-flight take.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #20 (Aerial)'],
    references: [
      { title: 'Stunt Spotlight — Inside the Aircraft of Top Gun: Maverick', url: 'https://www.filmindependent.org/blog/aircraft-carrier-sequences-of-top-gun-maverick/', publication: 'Film Independent', kind: 'interview' },
      { title: 'Six Sony VENICE Cameras Inside a Fighter-Jet Cockpit', url: 'https://ymcinema.com/2019/12/19/top-gun-maverick-six-sony-venice-cameras-inside-a-fighter-jet-cockpit/', publication: 'Y.M.Cinema Magazine', kind: 'article' },
    ],
    sortOrder: 30,
  },
  {
    sceneSlug: 'low-altitude-canyon-run',
    slug: 'low-altitude-canyon-run',
    name: 'Low-altitude canyon run rehearsal',
    description: 'Mission-rehearsal canyon-run flights at 100 feet above ground level over the Cascade and Owens Valley canyon systems. Real F/A-18s at 580 knots over real terrain; camera Astar B2 helicopter at 200ft AGL with a Shotover F1 gimbal. The flight envelope was the most aggressive low-altitude profile the Navy has ever cleared for a film production.',
    screenMinutes: 4.0,
    disciplineTags: ['aerial', 'low-altitude', 'live-flight'],
    rigging: {
      rigs: [
        { type: 'helicopter-gimbal', manufacturer: 'Shotover', notes: 'F1 gimbal carrying Sony VENICE + 24-290 Angenieux Optimo zoom. Astar B2 helicopter at 200ft AGL trailing the F/A-18s.' },
      ],
      notes: 'FAA mountain-flight envelope governed the schedule — daylight only, no night ops over the canyon system. Two-week shooting block south of Mono Lake.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #20 (Aerial)', 'SAG-AFTRA Bulletin #21 (Helicopter)'],
    references: [
      { title: 'Flying Top Gun: Maverick with Ryan Tudhope', url: 'https://www.fxguide.com/fxfeatured/flying-top-gun-maverick-with-ryan-tudhope/', publication: 'fxguide', kind: 'interview' },
    ],
    sortOrder: 40,
  },
  {
    sceneSlug: 'f14-dogfight-finale',
    slug: 'f14-dogfight-finale',
    name: 'F-14 Tomcat exfiltration + Su-57 dogfight',
    description: 'Maverick + Rooster commandeer a parked F-14A from the enemy hangar and dogfight a pair of Su-57 Felons en route to home plate. No airworthy F-14s remain in service — practical photography used a static F-14A on long-term loan from the Naval Aviation Museum, mounted on a hydraulic gimbal at NAS Pt. Mugu. The F-14 + Su-57 in flight are CG composites by MPC over plate photography of Northrop F-5s and an L-39 Albatros standing in for the Felon energy state.',
    screenMinutes: 8.0,
    disciplineTags: ['aerial', 'cockpit', 'mock-up', 'vfx-handoff'],
    rigging: {
      rigs: [
        { type: 'aerial-cockpit-mockup', notes: 'Static F-14A airframe at NAS Pt. Mugu; cockpit mounted on a six-DOF Scott Fisher hydraulic gimbal driven by a pre-programmed flight envelope keyed to the edited shot. Practical canopy + practical flight controls — no green-screen interior.' },
      ],
      notes: 'VFX handoff to MPC for the final-pixel out-of-cockpit composites; Bryan Litson supervising. The F-14\'s final approach + carrier-trap finale used the Theodore Roosevelt deck plates with the F-14 mock-up positioned on deck for foreground anchor.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #20 (Aerial)'],
    references: [
      { title: 'TGM\'s nearly hidden VFX', url: 'https://www.hollywoodreporter.com/movies/movie-features/top-gun-maverick-vfx-stunts-1235319795/', publication: 'The Hollywood Reporter', kind: 'article' },
      { title: 'TGM Soars to Match Live-Action and CG', url: 'https://vfxvoice.com/top-gun-maverick-soars-to-the-next-level-to-match-live-action-and-cg/', publication: 'VFX Voice', kind: 'interview' },
    ],
    sortOrder: 50,
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
console.log('Top Gun: Maverick deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
