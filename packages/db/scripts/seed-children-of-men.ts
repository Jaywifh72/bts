// Deep-dive editorial seed for Children of Men (2006).
//
// Why this film: Lubezki's first major Best Cinematography nomination
// (he didn't win) — this is where his celebrated long-take aesthetic
// emerged. The car ambush sequence (~4 min single-take) was shot in
// six sections at four locations stitched via DNEG digital transitions;
// the Bexhill refugee-camp battle is one of the most-cited long takes
// in cinema. Tim Webber (Framestore CFC) handled the CG newborn baby
// for the birth scene — same Webber who later won the Best VFX Oscar
// for Gravity. Steven J. Scott colorist (same Scott who did The
// Revenant). Survey showed only CR + SC + LI + KF + AW present.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'children-of-men-2006';

// 1. Production update
await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2005-09-12',
      principal_photography_end   = '2006-01-13',
      runtime_minutes = COALESCE(runtime_minutes, 109),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2005-09 → 2006-01');

// 2. Formats — Arricam 35mm spherical Panavision
const FORMATS = [
  { label: 'A-camera — Arricam LT 35mm Panavision spherical', aspect: '1.85:1',
    acquisition: 'Kodak 35mm 4-perf (Panavision spherical)', colorSpace: 'Photochemical',
    frameRate: '24', isPrimary: true },
  { label: 'B-camera + handheld — Arricam ST', aspect: '1.85:1',
    acquisition: 'Kodak 35mm 4-perf', colorSpace: 'Photochemical',
    frameRate: '24', isPrimary: false },
  { label: 'Digital intermediate deliverables', aspect: '1.85:1',
    acquisition: '35mm scan → DI', colorSpace: 'Cineon log → Rec.709',
    frameRate: '24', isPrimary: false },
];
for (const f of FORMATS) {
  await db.execute(sql`
    INSERT INTO production_formats (production_id, label, aspect_ratio, acquisition_format, color_space, frame_rate, is_primary)
    SELECT prod.id, ${f.label}, ${f.aspect}, ${f.acquisition}, ${f.colorSpace}, ${f.frameRate}::numeric, ${f.isPrimary}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT DO NOTHING
  `);
}
console.log(`[+] formats: ${FORMATS.length}`);

// 3. Studios
const STUDIOS = [
  { slug: 'strike-entertainment', name: 'Strike Entertainment', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q7622974' },
  { slug: 'hit-and-run-productions', name: 'Hit & Run Productions', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'ingenious-film-partners', name: 'Ingenious Film Partners', country: 'GB', kind: 'production_company',
    role: 'financier', wikidataId: 'Q4712023' },
  { slug: 'toho-towa', name: 'Toho-Towa', country: 'JP', kind: 'production_company',
    role: 'co_production', wikidataId: 'Q11531484' },
  { slug: 'universal-pictures', name: 'Universal Pictures', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q35509' },
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
    FROM productions prod, studios st WHERE prod.slug = ${PROD_SLUG} AND st.slug = ${s.slug}
    ON CONFLICT DO NOTHING
  `);
}
console.log(`[+] studios: ${STUDIOS.length}`);

// 4. Scenes — the most-photographed long-take sequences
const SCENES = [
  {
    slug: 'opening-coffee-shop-explosion', sceneNumber: '1', title: 'Opening — coffee shop explosion',
    synopsis: 'The film opens on a TV news broadcast announcing the death of "Baby Diego," the youngest person on earth at age 18. Theo walks past the broadcast into a London coffee shop; a bomb detonates behind him as he leaves. Lubezki shot the explosion in a single handheld take with practical pyro by SFX coordinator Joss Williams.',
    pos: 60, ie: 'ext', tod: 'day', location: 'London — Fleet Street',
  },
  {
    slug: 'car-ambush-long-take', sceneNumber: '8', title: 'Car ambush — 4-minute long take',
    synopsis: 'Theo, Julian, Kee, and Miriam are ambushed by an armed militia on a forest road. Lubezki\'s celebrated 4-minute single-take handheld inside the moving car was shot in six sections at four different locations across one week; DNEG\'s Frazer Churchill and Andy Lockley stitched the sections via five seamless digital transitions. The camera body itself was a custom Doggicam rig that allowed 360° interior coverage.',
    pos: 1500, ie: 'int_ext', tod: 'day', location: 'UK forest exterior — multi-location stitch',
  },
  {
    slug: 'kee-birth-long-take', sceneNumber: '14', title: 'Kee\'s birth — 3.5-minute long take',
    synopsis: 'Theo helps Kee deliver her baby in a refugee-camp hideout. Tim Webber at Framestore CFC handled the CG newborn baby — choreographed alongside the practical performance, with the baby seamlessly composited frame-by-frame across the 3.5-minute single take. The long take was shot in two sections joined via a single hidden cut.',
    pos: 4200, ie: 'int', tod: 'night', location: 'Bexhill refugee camp set',
  },
  {
    slug: 'bexhill-refugee-camp-battle', sceneNumber: '17', title: 'Bexhill refugee camp battle — 7-minute long take',
    synopsis: 'The climactic battle sequence: Theo carries Kee + the newborn through the besieged Bexhill refugee camp as British military forces engage the Fishes. The 7-minute handheld single take is one of the most-cited long takes in cinema. The famous accident shot — a real blood splatter from a practical squib hitting the camera lens — was kept in the final cut.',
    pos: 5400, ie: 'ext', tod: 'day', location: 'Bexhill-on-Sea + Hampshire warehouse builds',
  },
  {
    slug: 'battersea-power-station-fortress', sceneNumber: '5', title: 'Nigel\'s Battersea Power Station fortress',
    synopsis: 'Theo visits his cousin Nigel\'s government residence inside Battersea Power Station — repurposed as a museum-fortress for the British state\'s last cultural treasures (Picasso\'s Guernica, Michelangelo\'s David). Practical Battersea exterior + interior set builds; the floating "Pink Pig" inflatable above the building is a deliberate Pink Floyd Animals album-cover homage.',
    pos: 1200, ie: 'int_ext', tod: 'day', location: 'Battersea Power Station, London',
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
      scene_number = EXCLUDED.scene_number, title = EXCLUDED.title, synopsis = EXCLUDED.synopsis,
      position_in_runtime_seconds = EXCLUDED.position_in_runtime_seconds,
      interior_exterior = EXCLUDED.interior_exterior, time_of_day = EXCLUDED.time_of_day,
      location = EXCLUDED.location, updated_at = NOW()
    RETURNING id
  `);
  sceneIds[s.slug] = Number(r[0]!.id);
}
const existing = await db.execute<{ id: number; slug: string }>(sql`
  SELECT id, slug FROM scenes WHERE production_id = (SELECT id FROM productions WHERE slug = ${PROD_SLUG})
`);
for (const e of existing) sceneIds[e.slug] = Number(e.id);
console.log(`[+] scenes: ${SCENES.length} new (${Object.keys(sceneIds).length} total)`);

// 5. Color pipeline — Steve Scott DI colorist (same colorist as The Revenant)
await db.execute(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT prod.id, NULL,
    'Kodak 35mm 4-perf + DI — Steven J. Scott digital colorist',
    'Photochemical Kodak Vision2 negative',
    'Photochemical (no digital sensor primary)',
    'Cineon-based scan IDT (35mm DI)',
    'Cineon log working space',
    'Rec.709 ODT for digital deliverables; 35mm contact-print pass for theatrical',
    '35mm contact print + Blu-ray HD + DCP',
    'Lubezki + Cuarón specified a desaturated, grey-overcast palette emphasising the bleak post-apocalyptic London. Steven J. Scott handled the digital intermediate (same colorist who later did The Revenant); Jim Passon was color timer for the photochemical contact-print pass; Ntana Bantu Key was digital colorist assist. The grade preserved the practical handheld documentary aesthetic — no per-shot secondary keys, no skin-tone correction, no atmospheric haze adjustment.'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
  ON CONFLICT (production_id) WHERE scene_id IS NULL
  DO UPDATE SET pipeline_name = EXCLUDED.pipeline_name, camera_log = EXCLUDED.camera_log,
    camera_gamut = EXCLUDED.camera_gamut, idt = EXCLUDED.idt, working_space = EXCLUDED.working_space,
    odt = EXCLUDED.odt, deliverable = EXCLUDED.deliverable, notes = EXCLUDED.notes, updated_at = NOW()
`);
console.log('[+] color pipeline: Scott DI');

// 6. Lighting setups
const LIGHTING = [
  {
    sceneSlug: 'car-ambush-long-take',
    setupName: 'Car ambush — practical natural daylight + custom Doggicam rig',
    motivation: 'Lubezki shot the entire 4-minute take with practical natural daylight — no movie fixtures. The custom Doggicam interior rig allowed 360° rotation of the camera operator inside the moving car without breaking the take. Six sections were shot at four different locations over one week; DNEG\'s seamless digital transitions hid the section boundaries.',
    notes: 'The car interior was constructed with a removable roof panel + side pop-out so the camera operator could rotate around all four passenger positions during the unbroken take. The Doggicam rig is a Lubezki + camera-engineering team innovation; later cited as the inspiration for the Mexican-cinema "tracking shot" school.',
  },
  {
    sceneSlug: 'kee-birth-long-take',
    setupName: 'Birth scene — practical hideout fluorescents + Tim Webber CG baby',
    motivation: 'Kee\'s birth was shot with practical fluorescent fixtures inside the refugee-camp hideout set. No supplemental movie lighting; Lubezki rated the 35mm stock to push +1 to hold the dim practicals. Tim Webber at Framestore composited the CG newborn baby frame-by-frame across the 3.5-minute take.',
    notes: 'Webber later supervised the Gravity light-box innovation — same VFX supervisor. The CG-baby work on Children of Men was a proof-of-concept for the per-frame photoreal compositing that became Webber\'s signature technique.',
  },
  {
    sceneSlug: 'bexhill-refugee-camp-battle',
    setupName: 'Bexhill battle — practical streetlight + handheld natural daylight',
    motivation: 'Practical natural daylight + practical streetlight + practical pyro for the entire 7-minute handheld take. No movie lighting at any point. The famous accidental blood-splatter on the camera lens (from a practical squib that misfired during a take) was kept in the final cut — Lubezki + Cuarón decided the unrepeatable accident worked in favour of the documentary aesthetic.',
    notes: 'Bexhill-on-Sea + Hampshire warehouse builds combined for the camp set. The handheld single-take was shot in two sections joined via a single hidden cut; the back-to-camera turn of the operator masks the join.',
  },
  {
    sceneSlug: 'battersea-power-station-fortress',
    setupName: 'Battersea fortress — practical museum lighting + Pink Pig matte',
    motivation: 'Practical museum-style overhead pin-spots on each art piece (Guernica, David); Lubezki shot the interior with no supplemental movie key, letting the artwork-spotlight system carry both the dramatic illumination and the visual grammar of the museum-fortress conceit.',
    notes: 'Battersea Power Station exteriors filmed practical; the floating Pink Pig inflatable above the station was a deliberate Pink Floyd Animals album-cover homage. The pig was a CG composite by DNEG over a real plate of the Battersea exterior.',
  },
];

let lightingCount = 0;
for (const ls of LIGHTING) {
  const sid = sceneIds[ls.sceneSlug];
  if (!sid) continue;
  await db.execute(sql`
    INSERT INTO lighting_setups (scene_id, setup_name, motivation, notes, sort_order)
    VALUES (${sid}, ${ls.setupName}, ${ls.motivation}, ${ls.notes}, 0)
    ON CONFLICT (scene_id, setup_name) DO UPDATE SET
      motivation = EXCLUDED.motivation, notes = EXCLUDED.notes, updated_at = NOW()
  `);
  lightingCount++;
}
console.log(`[+] lighting setups: ${lightingCount}`);

// 7. Locations
const LOCATIONS = [
  { name: 'Bexhill-on-Sea', region: 'East Sussex', country: 'GB', lat: 50.8401, lng: 0.4715, isStudio: false,
    notes: 'Primary location for the Bexhill refugee-camp battle finale. The seaside town stood in for a militarised internment camp; production shot the camp exteriors over multiple weeks of base-construction + dressing.' },
  { name: 'Battersea Power Station', region: 'London', country: 'GB', lat: 51.4816, lng: -0.1452, isStudio: false,
    notes: 'Nigel\'s government-residence + museum-fortress sequence. Practical Battersea exterior + interior coverage; the floating Pink Pig is a Pink Floyd Animals album-cover homage composited over the practical plate.' },
  { name: 'Pinewood Studios', region: 'Buckinghamshire', country: 'GB', lat: 51.5491, lng: -0.5380, isStudio: true,
    notes: 'Primary stage base — the refugee-camp interiors + Theo\'s cousin\'s residence + connecting set-pieces. Joss Williams\'s SFX team coordinated practical pyro from Pinewood facilities.' },
  { name: 'Hampshire warehouse builds', region: 'Hampshire', country: 'GB', lat: 51.0577, lng: -1.3081, isStudio: true,
    notes: 'Secondary build location for the Bexhill camp interiors that couldn\'t shoot at the East Sussex coast.' },
  { name: 'Fleet Street, London', region: 'London', country: 'GB', lat: 51.5142, lng: -0.1080, isStudio: false,
    notes: 'Opening coffee-shop-explosion sequence. Practical pyro by Joss Williams\'s SFX team.' },
];

let locCount = 0;
for (const l of LOCATIONS) {
  const exists = await db.execute<{ id: number }>(sql`
    SELECT pl.id FROM production_locations pl JOIN productions p ON p.id = pl.production_id
    WHERE p.slug = ${PROD_SLUG} AND pl.name = ${l.name} LIMIT 1
  `);
  if (exists.length > 0) {
    await db.execute(sql`
      UPDATE production_locations SET region = ${l.region}, country = ${l.country},
        latitude = ${l.lat}::numeric, longitude = ${l.lng}::numeric,
        is_studio = ${l.isStudio}, notes = ${l.notes}, updated_at = NOW() WHERE id = ${exists[0]!.id}
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

// 8. Post-house links
const POST_LINKS = [
  { slug: 'technicolor', role: 'di',
    notes: 'Steven J. Scott digital colorist; Jim Passon color timer for the photochemical contact-print; Ntana Bantu Key digital colorist assist.' },
  { slug: 'technicolor', role: 'finishing',
    notes: '35mm contact-print finishing for theatrical. Photochemical answer-print continuity matched against the digital DI for the Rec.709 deliverables.' },
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

// 9. VFX credits — DNEG primary (160 shots) + Framestore (CG baby)
const VFX_CREDITS = [
  { vfxSlug: 'dneg', role: 'primary', shotCount: 160,
    notes: 'Frazer Churchill VFX supervisor; David Vickery CG supervisor; Andy Lockley 2D supervisor. Primary VFX vendor — the car-ambush 4-min long take stitched from 6 sections via 5 seamless digital transitions; matte paintings; futuristic London compositing; Pink Pig over Battersea Power Station.' },
  { vfxSlug: 'framestore', role: 'special_sequences', shotCount: null,
    notes: 'Tim Webber VFX supervisor — the CG newborn baby for Kee\'s 3.5-minute birth long-take. Webber later supervised the Gravity light-box innovation; the per-frame photoreal compositing technique developed on Children of Men became his signature.' },
];

for (const c of VFX_CREDITS) {
  await db.execute(sql`
    INSERT INTO vfx_credits (production_id, vfx_house_id, shot_count, role, notes)
    SELECT prod.id, vh.id, ${c.shotCount}, ${c.role}::vfx_credit_role_enum, ${c.notes}
    FROM productions prod, vfx_houses vh
    WHERE prod.slug = ${PROD_SLUG} AND vh.slug = ${c.vfxSlug}
    ON CONFLICT (production_id, vfx_house_id) DO UPDATE SET
      shot_count = EXCLUDED.shot_count, role = EXCLUDED.role, notes = EXCLUDED.notes, updated_at = NOW()
  `);
}
console.log(`[+] vfx_credits: ${VFX_CREDITS.length}`);

// 10. Awards — nominated for 3 Oscars (won 0); BAFTA wins
const AWARDS = [
  { org: 'academy_awards', category: 'Best Cinematography', year: 2007, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2007' },
  { org: 'academy_awards', category: 'Best Adapted Screenplay', year: 2007, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2007' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2007, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2007' },
  { org: 'bafta', category: 'Best Cinematography', year: 2007, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2007' },
  { org: 'bafta', category: 'Best Production Design', year: 2007, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2007' },
  { org: 'asc_award', category: 'Outstanding Achievement in Cinematography in Theatrical Releases', year: 2007, isWinner: false, sourceUrl: 'https://theasc.com/asc-awards' },
];

let awardsCount = 0;
for (const a of AWARDS) {
  await db.execute(sql`
    INSERT INTO production_awards (production_id, award_org, category, year, is_winner, source_url)
    SELECT prod.id, ${a.org}::award_org_enum, ${a.category}, ${a.year}, ${a.isWinner}, ${a.sourceUrl}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT (production_id, award_org, category, year, recipient_person_id) DO UPDATE SET
      is_winner = EXCLUDED.is_winner, source_url = EXCLUDED.source_url, updated_at = NOW()
  `);
  awardsCount++;
}
console.log(`[+] awards: ${awardsCount}`);

console.log('\n──────────────────────────────────────────────');
console.log('Children of Men deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
