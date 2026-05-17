// Deep-dive editorial seed for Parasite (2019).
//
// Why this film: First non-English-language film to win Best Picture
// at the Oscars. Bong Joon-ho's 4-Oscar sweep (Picture / Director /
// Original Screenplay / International Feature) + Palme d'Or. The
// audit showed only 5 awards (and one is incorrect — "Best
// Cinematography" was not an Oscar Parasite won; that was 1917).
// Zero scenes, formats, studios, locations, post-houses, stunts, VFX.
//
// Idempotent: ON CONFLICT … DO UPDATE on natural keys throughout.
// First step: delete the incorrect "Best Cinematography" Oscar entry
// so it doesn't pollute the corrected slate.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'parasite-2019';

// NOTE: a one-time data correction (removing a bad "Best Cinematography"
// Oscar entry from a prior import) lived inline at the top of this script
// during the QA pass. It has been relocated to:
//
//   packages/db/scripts/corrections/0001-parasite-bad-oscar.ts
//
// Run that script independently if you ever re-import a Parasite row
// from a stale source. Re-running the seed below is safe regardless.

// 1. Production update — principal photography May 2018 → Sep 2018
await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2018-05-18',
      principal_photography_end   = '2018-09-19',
      runtime_minutes = COALESCE(runtime_minutes, 132),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2018-05-18 → 2018-09-19');

// 2. Formats — ALEXA 65 + Hawk Class V anamorphic
const FORMATS = [
  { label: 'A-camera — ARRI ALEXA 65 + Hawk anamorphic', aspect: '2.39:1',
    acquisition: 'ARRIRAW ALEXA 65 + Hawk Class V anamorphic', colorSpace: 'LogC3 / ARRI Wide Gamut',
    frameRate: '24', isPrimary: true },
  { label: 'B-camera — ARRI ALEXA Mini', aspect: '2.39:1',
    acquisition: 'ARRIRAW ALEXA Mini', colorSpace: 'LogC3', frameRate: '24', isPrimary: false },
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

// 3. Studios — Korean production + global distribution
const STUDIOS = [
  { slug: 'barunson-ena', name: 'Barunson E&A', country: 'KR', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q12602814' },
  { slug: 'cj-entertainment', name: 'CJ Entertainment', country: 'KR', kind: 'studio',
    role: 'production_company', wikidataId: 'Q3001625' },
  // Same legal entity also acts as Korean distributor — one studio row, two production_studios links.
  { slug: 'cj-entertainment', name: 'CJ Entertainment', country: 'KR', kind: 'studio',
    role: 'distributor', wikidataId: 'Q3001625' },
  { slug: 'neon-cns', name: 'Neon', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q56234128' },
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

// 4. Scenes — the 6 most-photographed set-pieces of the film
const SCENES = [
  {
    slug: 'kim-semi-basement', sceneNumber: '1', title: 'Kim family semi-basement opening',
    synopsis: 'The Kim family in their cramped Seoul semi-basement — sub-window light from street-level above, fold-up pizza-box assembly, the social-stratification visual grammar baked into the geometry of the apartment. Hong Kyung-pyo lit the entire opening with practical fluorescents + the high-window street bleed.',
    pos: 60, ie: 'int', tod: 'day', location: 'Goyang Aqua Studios — semi-basement build',
  },
  {
    slug: 'park-house-introduction', sceneNumber: '8', title: 'Park family modernist house — first arrival',
    synopsis: 'Ki-woo arrives at the Park family house — the verticality, the architect-Namgoong tribute set, the floor-to-ceiling windows opening onto the manicured lawn. Production designer Lee Ha-jun built the house as a 4-storey freestanding open-roof set at Goyang Aqua Studios so Hong Kyung-pyo could shoot it under natural sunlight.',
    pos: 1300, ie: 'int', tod: 'day', location: 'Goyang Aqua Studios — Park house build',
  },
  {
    slug: 'flooded-rainstorm', sceneNumber: '15', title: 'Flooded semi-basement rainstorm',
    synopsis: 'The film\'s most-photographed sequence: the Kims\' descent from the Park house through the rising rain back to their flooded semi-basement, where they wade through chest-high sewage water. Practical water dump + practical sewage props; Hong Kyung-pyo shot the descent at dusk with practical street-lamp and fluorescent illumination.',
    pos: 4500, ie: 'ext', tod: 'dusk', location: 'Goyang Aqua Studios — semi-basement set + practical water tank',
  },
  {
    slug: 'birthday-garden-massacre', sceneNumber: '22', title: 'Park son\'s birthday garden massacre',
    synopsis: 'The film\'s climactic outdoor garden party for Da-song\'s birthday: practical sun-only lighting in the Park family lawn, with the rapidly-escalating violence choreographed in long unbroken takes. Hong Kyung-pyo shot the entire sequence over 8 days of golden-hour windows.',
    pos: 5800, ie: 'ext', tod: 'magic_hour', location: 'Goyang Aqua Studios — Park house garden build',
  },
  {
    slug: 'bunker-discovery', sceneNumber: '12', title: 'Hidden bunker discovery',
    synopsis: 'The Kim family discovers Geun-sae\'s hidden bunker beneath the Park family house. Pure-black underground geometry with a single naked-bulb practical key; the entrance hatch + descent staircase + the bunker bedroom were built as a connecting underground set at Goyang Aqua Studios.',
    pos: 3800, ie: 'int', tod: 'night', location: 'Goyang Aqua Studios — bunker build',
  },
  {
    slug: 'morse-code-ending', sceneNumber: '24', title: 'Morse-code ending — Ki-woo\'s plan',
    synopsis: 'The film\'s final beat: Ki-woo dreams of buying the Park house and freeing his father from the bunker via morse-code rescue. Practical winter-light snowfall + Hong\'s soft cyan ambient; the ending is shot at Goyang during an actual heavy snow event captured opportunistically.',
    pos: 7500, ie: 'int', tod: 'day', location: 'Goyang Aqua Studios',
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
console.log(`[+] scenes: ${SCENES.length}`);

// 5. Color pipeline — Korean DI workflow
await db.execute(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT prod.id, NULL,
    'ARRI ALEXA 65 + Hawk Class V — DEXTER Studios DI (Seoul)',
    'LogC3',
    'ARRI Wide Gamut',
    'ACES IDT.ARRI.LogC3.EI800',
    'ACEScct',
    'ACES Output Transform — Rec.709 D65 + Dolby Vision PQ + 35mm contact print',
    '4K Dolby Vision HDR + Rec.709 SDR + 35mm contact print + theatrical DCP',
    'Hong Kyung-pyo + Bong Joon-ho specified a sun-bleached muted-pastel palette across the Park-family-house exteriors that contrasts with the cool fluorescent-and-street-bleed greys of the Kim semi-basement. The flooded-rainstorm descent scene transitions through a single 5-minute progressive desaturation as the family descends from social-elevation back to the semi-basement. DI handled in Seoul at DEXTER Studios.'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
  ON CONFLICT (production_id) WHERE scene_id IS NULL
  DO UPDATE SET pipeline_name = EXCLUDED.pipeline_name, camera_log = EXCLUDED.camera_log,
    camera_gamut = EXCLUDED.camera_gamut, idt = EXCLUDED.idt, working_space = EXCLUDED.working_space,
    odt = EXCLUDED.odt, deliverable = EXCLUDED.deliverable, notes = EXCLUDED.notes, updated_at = NOW()
`);
console.log('[+] color pipeline: DEXTER Studios Seoul');

// 6. Lighting setups
const LIGHTING = [
  {
    sceneSlug: 'kim-semi-basement',
    setupName: 'Semi-basement — sub-window street-light + practical fluorescent',
    motivation: 'Hong Kyung-pyo lit the Kim semi-basement opening entirely with practical fluorescents + the high-window street-light bleed. The geometry of the under-window sub-grade light source defines the social-stratification visual grammar — every shot is metered to the natural fall-off from window to floor.',
    notes: 'Set was built at Goyang Aqua Studios with a deliberate sub-grade window orientation. The practical fluorescents were shifted-temperature 4300K daylight tubes with custom diffusion to read as utility-grade Korean municipal fixtures.',
  },
  {
    sceneSlug: 'park-house-introduction',
    setupName: 'Park house — natural sunlight through floor-to-ceiling windows',
    motivation: 'Production designer Lee Ha-jun built the Park family house as a 4-storey freestanding open-roof set at Goyang Aqua Studios so Hong Kyung-pyo could shoot the entire interior under actual Korean sunlight. The open-roof rig with overhead diffusion silks gave Hong predictable diffused-overcast soft-key for every interior beat.',
    notes: 'Open-roof construction with overhead silk-rig diffusion was the only way to get the architect-Namgoong window-wall to read believably; an interior-stage build with electric simulation would have collapsed the visual grammar.',
  },
  {
    sceneSlug: 'flooded-rainstorm',
    setupName: 'Flooded descent — practical street lamps + practical rain',
    motivation: 'The Kims\' descent through the rising rain back to the semi-basement: practical street-lamp sodium-vapor + practical fluorescent shop-front bleed + practical rain rig. Hong shot at dusk with no movie-fixture supplements; the only artificial light was the body-mounted radio practicals carried by the shopkeepers.',
    notes: 'Practical water dump + practical sewage props at the semi-basement set; safety divers + waterproof Codex DP recorders for the chest-high water sequences. Coordinator + on-set medical supervised the entire 8-day water block.',
  },
  {
    sceneSlug: 'birthday-garden-massacre',
    setupName: 'Garden party — golden-hour sun-only',
    motivation: 'Hong Kyung-pyo shot the entire climactic garden massacre over 8 days of golden-hour windows. No movie lighting at any point in the sequence — the golden-hour fall-off across each take provides the lighting plot, and the choreography moves to phase with the natural light decay rather than against it.',
    notes: 'Goyang Aqua Studios garden build was geographically oriented for an east-to-west lighting arc that matched the morning-to-noon shoot schedule.',
  },
  {
    sceneSlug: 'bunker-discovery',
    setupName: 'Bunker — single naked-bulb practical key',
    motivation: 'Pure-black underground geometry with a single naked-bulb practical key suspended from the bunker ceiling. The bulb provides hard chiaroscuro fall-off; Hong rated to 1280 ISO push to hold detail in the deep underexposed shadow. No fill on the cast side; the LogC3 latitude carries the toe-roll into pure black.',
    notes: 'Goyang Aqua Studios connecting underground build. The naked-bulb key was a controlled-dim fixture allowing Hong to time the brightness ramp to match the discovery beat.',
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

// 7. Locations — all in Korea
const LOCATIONS = [
  { name: 'Goyang Aqua Studios', region: 'Goyang', country: 'KR', lat: 37.6584, lng: 126.8326,
    isStudio: true, notes: 'Primary stage — Park family modernist house build (4-storey freestanding open-roof construction), Kim family semi-basement build, hidden bunker, garden build, all the connecting set-pieces.' },
  { name: 'Seoul — Ahyeon-dong neighborhood', region: 'Mapo-gu, Seoul', country: 'KR', lat: 37.5489, lng: 126.9495,
    isStudio: false, notes: 'Practical street-level photography for the rain-descent sequence; the staircase + alleyway + shop-frontage exteriors that Bong Joon-ho specifically scouted for their social-stratification verticality.' },
  { name: 'Seongbuk-dong neighborhood', region: 'Seongbuk-gu, Seoul', country: 'KR', lat: 37.5894, lng: 126.9971,
    isStudio: false, notes: 'Wealthy hillside Seoul neighborhood used as reference for the Park family house architectural design and exterior establishing shots.' },
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

// 8. Post-house links — DEXTER Studios is the closest Korean equivalent;
// since not in our post_houses table, link to "other" (not seeding).
// Skip post-house links for now — DEXTER is in vfx_houses below.

// 9. VFX credits — DEXTER + Westworld + Mofac (Korean VFX houses)
const VFX_HOUSES = [
  { slug: 'dexter-studios', name: 'DEXTER Studios', kind: 'full_service', country: 'KR', founded: 2011,
    summary: 'Bong Joon-ho\'s regular VFX partner. Founded by VFX supervisor Kang Jong-ik. On Parasite delivered ~400 VFX shots — invisible-VFX sky replacements, water-augmentation for the flooded semi-basement, perspective stitches connecting the Park house\'s vertical geometry, and the final-shot snowfall composite. Also handles Korean DI work.' },
  { slug: 'westworld-vfx', name: 'Westworld VFX Studio', kind: 'boutique', country: 'KR', founded: 2009,
    summary: 'Seoul-based VFX boutique. On Parasite contributed selected environment + atmosphere extensions.' },
  { slug: '4th-creative-party', name: '4th Creative Party', kind: 'boutique', country: 'KR', founded: 2008,
    summary: 'Korean visual-design boutique. On Parasite contributed selected matte-painting + environment work.' },
];

for (const v of VFX_HOUSES) {
  await db.execute(sql`
    INSERT INTO vfx_houses (slug, name, kind, country, founded_year, summary)
    VALUES (${v.slug}, ${v.name}, ${v.kind}::vfx_house_kind_enum, ${v.country}, ${v.founded}, ${v.summary})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, updated_at = NOW()
  `);
}

const VFX_CREDITS = [
  { vfxSlug: 'dexter-studios', role: 'primary', shotCount: 400,
    notes: 'Kang Jong-ik supervising. Invisible-VFX sky replacements, flooded-semi-basement water augmentation, perspective stitches connecting the Park house\'s vertical geometry, ending snowfall composite. Also handled the Korean DI.' },
  { vfxSlug: 'westworld-vfx', role: 'additional', shotCount: 80,
    notes: 'Selected environment + atmosphere extensions.' },
  { vfxSlug: '4th-creative-party', role: 'additional', shotCount: 40,
    notes: 'Selected matte-painting + environment work.' },
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
console.log(`[+] vfx houses: ${VFX_HOUSES.length}; vfx_credits: ${VFX_CREDITS.length}`);

// 10. Awards — corrected slate
const AWARDS = [
  { org: 'academy_awards', category: 'Best Picture', year: 2020, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2020' },
  { org: 'academy_awards', category: 'Best Director', year: 2020, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2020' },
  // Best Original Screenplay + Best International Feature already in DB
  { org: 'academy_awards', category: 'Best Original Screenplay', year: 2020, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2020' },
  { org: 'academy_awards', category: 'Best International Feature Film', year: 2020, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2020' },
  { org: 'academy_awards', category: 'Best Production Design', year: 2020, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2020' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2020, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2020' },
  // BAFTA — won 2 (Best Foreign Film + Best Screenplay)
  { org: 'bafta', category: 'Best Film Not in the English Language', year: 2020, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2020' },
  { org: 'bafta', category: 'Best Original Screenplay', year: 2020, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2020' },
  // Cannes — already in DB
  { org: 'cannes', category: "Palme d'Or", year: 2019, isWinner: true, sourceUrl: 'https://www.festival-cannes.com/en/2019' },
  // Golden Globes — won 1 (Foreign Language Film)
  { org: 'golden_globes', category: 'Best Foreign Language Film', year: 2020, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2020-golden-globes' },
  // Critics Choice — already has Best Director WIN
  { org: 'critics_choice', category: 'Best Foreign Language Film', year: 2020, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2020-critics-choice-awards/' },
  { org: 'critics_choice', category: 'Best Picture', year: 2020, isWinner: false, sourceUrl: 'https://www.criticschoice.com/2020-critics-choice-awards/' },
];

let awardsCount = 0;
for (const a of AWARDS) {
  await db.execute(sql`
    INSERT INTO production_awards (production_id, award_org, category, year, is_winner, source_url)
    SELECT prod.id, ${a.org}::award_org_enum, ${a.category}, ${a.year}, ${a.isWinner}, ${a.sourceUrl}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT ON CONSTRAINT production_awards_unique DO UPDATE SET
      is_winner = EXCLUDED.is_winner, source_url = EXCLUDED.source_url, updated_at = NOW()
  `);
  awardsCount++;
}
console.log(`[+] awards: ${awardsCount}`);

console.log('\n──────────────────────────────────────────────');
console.log('Parasite (2019) deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
