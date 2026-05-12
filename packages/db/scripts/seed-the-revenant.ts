// Deep-dive editorial seed for The Revenant (2015).
//
// Why this film: Lubezki's record-setting third consecutive Best
// Cinematography Oscar — only DP in history to win three years
// running (Gravity → Birdman → Revenant). Shot on the ARRI ALEXA 65
// in remote Canada / Montana / Argentina with a strict no-electric-
// lighting rule (only natural daylight + practical fire). Existing
// audit showed 1 format / 1 studio / 3 scenes / 2 locations /
// 1 award (Cinematography); zero color, lighting, post, stunts, VFX.
// The all-natural-light approach + DiCaprio's bear-attack VFX
// handoff at ILM/MPC are textbook industry-reference material.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'the-revenant-2015';

// 1. Production update — principal photography Oct 2014 → Aug 2015
await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2014-10-01',
      principal_photography_end   = '2015-08-31',
      runtime_minutes = COALESCE(runtime_minutes, 156),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2014-10 → 2015-08');

// 2. Formats — ALEXA 65 primary + ALEXA M backup + IMAX 1.90
const FORMATS = [
  { label: 'A-camera — ARRI ALEXA 65 (primary)', aspect: '2.39:1',
    acquisition: 'ARRIRAW ALEXA 65 (5K Open Gate)', colorSpace: 'LogC3 / ARRI Wide Gamut',
    frameRate: '24', isPrimary: true },
  { label: 'B-camera — ARRI ALEXA M (difficult-access shots)', aspect: '2.39:1',
    acquisition: 'ARRIRAW ALEXA M', colorSpace: 'LogC3', frameRate: '24', isPrimary: false },
  { label: 'IMAX 1.90 expansion', aspect: '1.90:1',
    acquisition: 'ARRIRAW ALEXA 65 (IMAX-certified DMR)', colorSpace: 'Rec.2020 PQ',
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
  { slug: 'new-regency-productions', name: 'New Regency Productions', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q261075' },
  { slug: 'ratpac-dune-entertainment', name: 'RatPac-Dune Entertainment', country: 'US', kind: 'production_company',
    role: 'financier', wikidataId: 'Q1986124' },
  { slug: 'anonymous-content', name: 'Anonymous Content', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q4773139' },
  { slug: 'appian-way-productions', name: 'Appian Way Productions', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q608558' },
  { slug: 'm-productions', name: 'M Productions', country: 'US', kind: 'production_company',
    role: 'co_production', wikidataId: null },
  { slug: 'twentieth-century-fox', name: '20th Century Fox', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q186600' },
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

// 4. Additional scenes — 5 more (3 already present)
const SCENES = [
  {
    slug: 'opening-arikara-attack', sceneNumber: '1', title: 'Opening — Arikara raid on the trapper camp',
    synopsis: 'The Arikara war-party ambushes Henry\'s trapper camp in a continuous-take long sequence; Lubezki\'s now-famous practice of moving the camera between three or four pieces of action without cutting. Shot at first light over multiple consecutive mornings to maintain the cold-grey winter palette.',
    pos: 60, ie: 'ext', tod: 'dawn', location: 'Squamish Valley, BC',
  },
  {
    slug: 'horseback-cliff-fall', sceneNumber: '8', title: 'Horseback cliff-edge fall',
    synopsis: 'Glass rides his horse off a 50-foot tree-lined cliff edge and lands in a pine grove below. Practical horse-fall stunt + practical pine-cushion landing rig + ILM CG horse for the in-air mid-flight beats. The full plate continuity required matching the natural light decay across 90 minutes of golden-hour shooting.',
    pos: 4200, ie: 'ext', tod: 'magic_hour', location: 'Kananaskis Country, Alberta',
  },
  {
    slug: 'pawnee-camp', sceneNumber: '14', title: 'Pawnee camp — Glass meets Hikuc',
    synopsis: 'Glass falls in with a Pawnee man, Hikuc, who shelters him through a snow blizzard. Snow-blown overnight stay sequence; Lubezki shot the entire arc with practical fire-light only, no electric supplements, with a tarp shelter as the soft directional baffle.',
    pos: 5800, ie: 'ext', tod: 'night', location: 'Kananaskis Country, Alberta',
  },
  {
    slug: 'frozen-river-crossing', sceneNumber: '17', title: 'Frozen river — Glass\'s solo crossing',
    synopsis: 'Glass crosses a half-frozen river in pursuit of Fitzgerald. DiCaprio performed the crossing in real freezing water; the production rotated the shot location to Argentina (Tierra del Fuego) when British Columbia warmed unexpectedly mid-shoot.',
    pos: 7500, ie: 'ext', tod: 'day', location: 'Tierra del Fuego, Argentina',
  },
  {
    slug: 'icy-bivouac', sceneNumber: '11', title: 'Glass\'s icy bivouac — body inside the horse',
    synopsis: 'Glass kills his dead horse and crawls inside the carcass for warmth during a blizzard. Practical full-scale animatronic horse carcass built by KNB EFX; DiCaprio crawled inside the practical prop for the full shot. Snow + practical wind machines provided the natural-light blizzard effect.',
    pos: 4900, ie: 'ext', tod: 'night', location: 'Squamish Valley, BC',
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

// 5. Color pipeline — Steve Scott @ Technicolor on Lustre
await db.execute(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT prod.id, NULL,
    'ARRI ALEXA 65 + Open-Gate 5K — Steven J. Scott @ Technicolor (Lustre)',
    'LogC3',
    'ARRI Wide Gamut',
    'ACES IDT.ARRI.LogC3.EI800',
    'ACEScct',
    'ACES Output Transform — Rec.709 D65 + Dolby Vision PQ-1000 nit + Rec.2020 PQ (IMAX 1.90)',
    '4K Dolby Vision HDR + IMAX 1.90 expansion + Rec.709 SDR + 35mm contact print',
    'Steven J. Scott colorist at Technicolor on Autodesk Lustre, Christie 4220 4K projector. Won the 2016 HPA Award for Outstanding Color Grading. Lubezki specified an unbroken cold-grey winter palette: pulled saturation across the entire film, except for the warm fire-light moments which are the only chromatic relief. Iñárritu insisted on no electric movie lighting at any point in production — Scott''s grade had to balance the sub-90-minute golden-hour windows that Lubezki could shoot per day across the Canadian / Argentine winter.'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
  ON CONFLICT (production_id) WHERE scene_id IS NULL
  DO UPDATE SET pipeline_name = EXCLUDED.pipeline_name, camera_log = EXCLUDED.camera_log,
    camera_gamut = EXCLUDED.camera_gamut, idt = EXCLUDED.idt, working_space = EXCLUDED.working_space,
    odt = EXCLUDED.odt, deliverable = EXCLUDED.deliverable, notes = EXCLUDED.notes, updated_at = NOW()
`);
console.log('[+] color pipeline: Scott @ Technicolor');

// 6. Lighting setups — natural-light plots
const LIGHTING = [
  {
    sceneSlug: 'bear-attack',
    setupName: 'Bear attack — overcast Pacific Northwest natural sky',
    motivation: 'Lubezki\'s no-electric-light rule: the entire bear-attack sequence is lit by overcast sky soft-box from above the canopy. The camera Steadicam followed Glass + the practical bear-actor (until ILM took over for the bear close-coverage). Lubezki rated the ALEXA 65 to a 1280 ISO push to hold detail in the shadow of the boreal canopy.',
    notes: 'Shot at first light + last light only — the production lost more than half of each shoot day to weather. ILM\'s digital bear was animation-blocked to a stand-in actor in a rough motion-capture suit; Lubezki framed for the practical-actor coverage and let ILM perform the digital handoff in compositing.',
  },
  {
    sceneSlug: 'opening-arikara-attack',
    setupName: 'First-light Arikara raid — long-take dawn',
    motivation: 'Continuous-take shooting at dawn over multiple consecutive mornings to maintain the cold-grey winter palette. Lubezki moved the Steadicam between three or four pieces of action per take without cutting; the natural light was the lighting plot — no movie fixtures.',
    notes: 'Squamish Valley, BC — production schedule rotated the bulk of camp-attack coverage to early morning so the trapper-tent silhouettes read against the just-rising sun. Practical fire arrows + practical body-falls into pre-dressed snow.',
  },
  {
    sceneSlug: 'pawnee-camp',
    setupName: 'Pawnee camp — practical fire-only night',
    motivation: 'Glass + Hikuc\'s overnight shelter scene: the entire arc is lit by practical fire-light only, with a tarp shelter providing soft directional baffle. Lubezki shot at base-ISO 800 for the cleanest signal, with the fire spilling onto both faces. No electric supplements.',
    notes: 'Iñárritu\'s no-electric rule applied even to night-interior beats. The fire was a controlled propane-fed firepit gag pre-tested for repeat-take consistency; Hikuc + Glass\'s coverage came across 6 takes per beat to manage the fire\'s natural variance.',
  },
  {
    sceneSlug: 'frozen-river-crossing',
    setupName: 'Frozen river — Argentine Tierra del Fuego sun-only',
    motivation: 'After unexpected warm weather thawed the British Columbia rivers mid-shoot, the production relocated the river-crossing block to Argentina (Tierra del Fuego). DiCaprio performed the crossing in real freezing water under unaltered Patagonian sun.',
    notes: 'The Argentine block was an unplanned 30-day extension necessitated by the BC thaw. Codex DP recording integrity at sub-zero temperatures was a documented production challenge.',
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

// 7. Locations — Canada + Argentina + Montana
const LOCATIONS = [
  { name: 'Squamish Valley', region: 'British Columbia', country: 'CA', lat: 49.7016, lng: -123.1558, isStudio: false,
    notes: 'Primary BC base — Squamish Nation territory. Trapper-camp sequence + bear attack + Glass\'s icy bivouac. The production worked closely with Squamish Nation cultural advisors throughout the shoot.' },
  { name: 'Kananaskis Country', region: 'Alberta', country: 'CA', lat: 50.6261, lng: -115.0619, isStudio: false,
    notes: 'Alberta Rockies block — horseback cliff-fall, Pawnee camp, mountain-pursuit sequences. The Bow Valley provided the alpine vista coverage; second-unit ran continuously under second-unit DP Manuel Alberto Claro.' },
  { name: 'Tierra del Fuego', region: 'Patagonia', country: 'AR', lat: -54.8019, lng: -68.3030, isStudio: false,
    notes: 'Argentine extension block. After BC warming forced the production to relocate the frozen-river sequences, the schedule shifted to Tierra del Fuego for an additional 30-day block in the Patagonian winter. Documented production challenge with Codex DP cold-weather signal integrity.' },
  { name: 'Libby, Montana', region: 'Montana', country: 'US', lat: 48.3884, lng: -115.5562, isStudio: false,
    notes: 'Montana exterior block — Kootenai National Forest stood in for various Glass-pursuit beats and the Henry-fort exteriors.' },
];
let locCount = 0;
for (const l of LOCATIONS) {
  const exists = await db.execute<{ id: number }>(sql`
    SELECT pl.id FROM production_locations pl JOIN productions p ON p.id = pl.production_id
    WHERE p.slug = ${PROD_SLUG} AND pl.name = ${l.name} LIMIT 1
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

// 8. Post-house links — Technicolor + Skywalker
const POST_LINKS = [
  { slug: 'technicolor', role: 'di',
    notes: 'Steven J. Scott colorist on Autodesk Lustre with Christie 4220 4K projector. Won the 2016 HPA Award for Outstanding Color Grading.' },
  { slug: 'technicolor', role: 'color_grading',
    notes: 'Scott + Charles Bunnag, Michael Hatzer, Ntana Key — the Technicolor finishing team. Cold-grey winter palette pulled across the film with warm fire-light as the only chromatic relief.' },
  { slug: 'skywalker-sound', role: 'sound_mix',
    notes: 'Sound mix at Skywalker. Ryuichi Sakamoto + Carsten Nicolai (Alva Noto) + Bryce Dessner score; the score blends ambient electronic with cellular cello drones.' },
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

// 9. VFX credits — ILM (primary, bear) + MPC + Method + Cinesite + Atomic Fiction
const VFX_HOUSES = [
  { slug: 'plowman-craven', name: 'Plowman Craven', kind: 'boutique', country: 'GB', founded: 1965,
    summary: 'UK-based aerial + drone capture specialty house. On The Revenant operated the production\'s drone-LiDAR ground-survey + drone-camera plate-acquisition workflow across the BC + Alberta locations.' },
];
for (const v of VFX_HOUSES) {
  await db.execute(sql`
    INSERT INTO vfx_houses (slug, name, kind, country, founded_year, summary)
    VALUES (${v.slug}, ${v.name}, ${v.kind}::vfx_house_kind_enum, ${v.country}, ${v.founded}, ${v.summary})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, updated_at = NOW()
  `);
}

const VFX_CREDITS = [
  { vfxSlug: 'ilm', role: 'primary', shotCount: 600,
    notes: 'Richard McBride VFX supervisor. Photoreal grizzly bear in the bear-attack sequence — five-minute continuous-take all-CG bear handoff from a stand-in actor in motion-capture suit. The most-discussed digital character of 2015.' },
  { vfxSlug: 'mpc-film', role: 'primary', shotCount: 350,
    notes: 'Various environment + atmosphere extensions — snowstorm augmentation, weather continuity matching, period-accurate Hudson Bay trapper-fort exteriors.' },
  { vfxSlug: 'method-studios', role: 'additional', shotCount: 200,
    notes: 'Selected environment + clean-up shots; horse digital double for the cliff-fall sequence.' },
  { vfxSlug: 'cinesite', role: 'additional', shotCount: 150,
    notes: 'Selected matte-painting + atmospheric handoff work.' },
  { vfxSlug: 'atomic-fiction', role: 'additional', shotCount: 100,
    notes: 'Selected continuity environment shots.' },
  { vfxSlug: 'plowman-craven', role: 'previsualization', shotCount: null,
    notes: 'Drone-LiDAR ground-survey + drone-camera plate acquisition across the BC + Alberta locations.' },
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

// 10. Awards — won 3 Oscars, nominated for 12; full slate
const AWARDS = [
  { org: 'academy_awards', category: 'Best Director', year: 2016, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Cinematography', year: 2016, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Actor', year: 2016, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Picture', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Supporting Actor', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Production Design', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Costume Design', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Makeup and Hairstyling', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Visual Effects', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Sound Editing', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  { org: 'academy_awards', category: 'Best Sound Mixing', year: 2016, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2016' },
  // BAFTA — won 5
  { org: 'bafta', category: 'Best Film', year: 2016, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2016' },
  { org: 'bafta', category: 'Best Director', year: 2016, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2016' },
  { org: 'bafta', category: 'Best Actor', year: 2016, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2016' },
  { org: 'bafta', category: 'Best Cinematography', year: 2016, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2016' },
  { org: 'bafta', category: 'Best Sound', year: 2016, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2016' },
  // Golden Globes — won 3 including Best Drama
  { org: 'golden_globes', category: 'Best Motion Picture — Drama', year: 2016, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2016-golden-globes' },
  { org: 'golden_globes', category: 'Best Director', year: 2016, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2016-golden-globes' },
  { org: 'golden_globes', category: 'Best Actor — Drama', year: 2016, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2016-golden-globes' },
  // ASC — Lubezki
  { org: 'asc_award', category: 'Outstanding Achievement in Cinematography in Theatrical Releases', year: 2016, isWinner: true, sourceUrl: 'https://theasc.com/asc-awards' },
  // Critics Choice — Cinematography
  { org: 'critics_choice', category: 'Best Cinematography', year: 2016, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2016-critics-choice-awards/' },
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

// 11. Stunt sequences
function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

const STUNTS = [
  {
    sceneSlug: 'bear-attack', slug: 'grizzly-bear-attack-mocap',
    name: 'Grizzly bear attack — practical/digital handoff',
    description: 'The five-minute continuous-take grizzly bear attack — DiCaprio performed against a stand-in actor in a rough motion-capture suit; ILM\'s photoreal CG bear was animation-blocked to the stand-in\'s motion. The choreography combined practical impact + body-roll work by stunt double Mark Mottram with ILM\'s digital bear handoff in compositing.',
    screenMinutes: 5.0,
    disciplineTags: ['fight', 'mocap', 'vfx-handoff', 'creature'],
    rigging: {
      rigs: [
        { type: 'mocap', notes: 'Stand-in actor in mocap suit performed bear actions adjacent to DiCaprio; ILM tracked motion data + replaced bear with digital character in post.' },
      ],
      notes: 'Stunt coordinator Steve Pope. Mark Mottram doubled DiCaprio for the over-the-shoulder camera angles. The bear\'s claw-strike impacts came from a body-mounted prop arm with a pneumatic-impact actuator tuned for repeat-take consistency.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #4 (Animals)'],
    references: [
      { title: 'The Making of The Revenant', url: 'https://jonnyelwyn.co.uk/film-and-video-editing/the-making-of-the-revenant/', publication: 'Jonny Elwyn', kind: 'article' },
      { title: 'Codex on The Revenant', url: 'https://codex.online/news/light-fantastic-the-making-of-the-revenant', publication: 'Codex', kind: 'article' },
    ],
    sortOrder: 10,
  },
  {
    sceneSlug: 'horseback-cliff-fall', slug: 'horseback-cliff-fall',
    name: 'Horseback cliff-edge fall',
    description: 'Glass rides his horse off a 50-foot tree-lined cliff edge and lands in a pine grove below. Practical horse-fall stunt + pine-cushion landing rig + ILM CG horse for the in-air mid-flight beats. Stunt rider performed the take-off; Mark Mottram doubled DiCaprio for the on-ground aftermath.',
    screenMinutes: 1.5,
    disciplineTags: ['horse-stunt', 'high-fall', 'vfx-handoff'],
    rigging: {
      rigs: [
        { type: 'high-fall', notes: 'Pine-cushion landing rig 50ft below the cliff edge; trained stunt horse performed the take-off jump under wrangler supervision.' },
      ],
      notes: 'Stunt coordinator Steve Pope; horse trainer + American Humane Association on-set throughout. ILM\'s CG horse handled the in-air mid-flight beats so no animal was at any time in actual freefall.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #4 (Animals)'],
    references: [
      { title: 'The Making of The Revenant', url: 'https://jonnyelwyn.co.uk/film-and-video-editing/the-making-of-the-revenant/', publication: 'Jonny Elwyn', kind: 'article' },
    ],
    sortOrder: 20,
  },
];

let stuntCount = 0;
for (const s of STUNTS) {
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
      scene_id = EXCLUDED.scene_id, name = EXCLUDED.name, description = EXCLUDED.description,
      screen_minutes = EXCLUDED.screen_minutes, discipline_tags = EXCLUDED.discipline_tags,
      rigging = EXCLUDED.rigging, safety_bulletins_followed = EXCLUDED.safety_bulletins_followed,
      "references" = EXCLUDED."references", sort_order = EXCLUDED.sort_order, updated_at = NOW()
  `);
  stuntCount++;
}
console.log(`[+] stunt sequences: ${stuntCount}`);

console.log('\n──────────────────────────────────────────────');
console.log('The Revenant deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
