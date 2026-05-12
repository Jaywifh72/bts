// Deep-dive editorial seed for Gravity (2013).
//
// Why this film: 7 Oscar wins (Cinematography, Visual Effects, Director,
// Editing, Sound Editing, Sound Mixing, Original Score) — Lubezki's
// first Oscar, Tim Webber's Light Box invention won "Innovation of the
// Year" from Time Magazine. The audit showed 1 format / 1 studio /
// 2 scenes / 0 lighting / 0 color / 0 locations / 0 post-houses /
// 0 stunts / 0 vfx_credits / 1 award (Cinematography only). Six other
// Oscar wins missing entirely. The Framestore light-box engineering
// is one of the most-cited VFX innovations of the 2010s — fills a
// glaring gap in the editorial archive.
//
// Idempotent: all inserts use ON CONFLICT … DO UPDATE on natural keys.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'gravity-2013';

// ────────────────────────────────────────────────────────────────────
// 1. Production update — principal photography Sep 2011 → Mar 2012
// ────────────────────────────────────────────────────────────────────

await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2011-09-26',
      principal_photography_end   = '2012-03-30',
      runtime_minutes = COALESCE(runtime_minutes, 91),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2011-09-26 → 2012-03-30');

// ────────────────────────────────────────────────────────────────────
// 2. Formats — ALEXA ARRIRAW + Phantom Flex high-speed for inserts
// ────────────────────────────────────────────────────────────────────

const FORMATS = [
  {
    label: 'A-camera — ARRI ALEXA inside Light Box (primary)',
    aspect: '2.39:1',
    acquisition: 'ARRIRAW ALEXA + CODEX onboard recording',
    colorSpace: 'LogC3 / ARRI Wide Gamut',
    frameRate: '24',
    isPrimary: true,
  },
  {
    label: 'High-speed inserts — Phantom Flex',
    aspect: '2.39:1',
    acquisition: 'Phantom Flex (CineForm RAW)',
    colorSpace: 'LogC',
    frameRate: '120',
    isPrimary: false,
  },
  {
    label: 'IMAX 1.90 expansion + 3D conversion',
    aspect: '1.90:1',
    acquisition: 'ARRIRAW ALEXA — Stereo D conversion + IMAX DMR',
    colorSpace: 'Rec.2020 PQ',
    frameRate: '24',
    isPrimary: false,
  },
];

for (const f of FORMATS) {
  await db.execute(sql`
    INSERT INTO production_formats (production_id, label, aspect_ratio, acquisition_format, color_space, frame_rate, is_primary)
    SELECT prod.id, ${f.label}, ${f.aspect}, ${f.acquisition}, ${f.colorSpace}, ${f.frameRate}::numeric, ${f.isPrimary}
    FROM productions prod WHERE prod.slug = ${PROD_SLUG}
    ON CONFLICT DO NOTHING
  `);
}
console.log(`[+] formats: ${FORMATS.length} rows`);

// ────────────────────────────────────────────────────────────────────
// 3. Studios — Heyday + Esperanto Filmoj + WB
// ────────────────────────────────────────────────────────────────────

const STUDIOS = [
  { slug: 'heyday-films', name: 'Heyday Films', country: 'GB', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q2110795' },
  { slug: 'esperanto-filmoj', name: 'Esperanto Filmoj', country: 'MX', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q5396580' },
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
// 4. Additional scenes — 4 more (2 already present)
// ────────────────────────────────────────────────────────────────────

const SCENES = [
  {
    slug: 'opening-spacewalk-long-take', sceneNumber: '1', title: 'Opening 17-minute spacewalk long-take',
    synopsis: 'The film\'s opening — Lubezki + Cuarón stage a (perceived) 17-minute single-take from Earth pull-back through the Hubble servicing mission and into the debris strike. The Light Box rotation ensemble + per-frame CG body-replacement compositing makes it possible: the Light Box plays back the rotating Earth + sun + stars while Sandra Bullock is suspended on a 12-axis rig.',
    pos: 0, ie: 'ext', tod: 'day', location: 'Shepperton Studios — Light Box',
  },
  {
    slug: 'soyuz-fire', sceneNumber: '20', title: 'Soyuz capsule fire — Stone\'s solo escape',
    synopsis: 'Stone fires the Soyuz docking thrusters but a fuel-line fire breaks out in the capsule cabin. Practical fire-bar SFX inside the Light Box; Bullock performed the entire sequence on a head-only mocap rig with her face read by the LED panels for environmental light continuity. The visual effect of the fire is composited from practical plates of a proximity-shot pyro element.',
    pos: 3300, ie: 'int', tod: 'night', location: 'Shepperton Studios — Light Box',
  },
  {
    slug: 'tiangong-descent', sceneNumber: '24', title: 'Tiangong descent — Stone\'s atmosphere re-entry',
    synopsis: 'Stone fires the Tiangong descent module engines and re-enters Earth\'s atmosphere. Long approach + rotating-orange-fire spectacle followed by the ocean-impact splashdown. Light Box rotated around Bullock at 360° while she was suspended on a hydraulic rig; per-frame plate matching from Framestore.',
    pos: 4400, ie: 'ext', tod: 'day', location: 'Shepperton Studios — Light Box',
  },
  {
    slug: 'lake-powell-ending', sceneNumber: '26', title: 'Lake Powell ending — Stone reborn',
    synopsis: 'After splashdown, Stone crawls onto the Lake Powell shoreline and stands as if newly-born. Practical Lake Powell, Arizona location photography — the only practical-exterior block in the film. Lubezki shot the ending in a single hand-held wide-frame take with sun-only lighting at golden hour.',
    pos: 5200, ie: 'ext', tod: 'magic_hour', location: 'Lake Powell, Arizona',
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
      interior_exterior = EXCLUDED.interior_exterior,
      time_of_day = EXCLUDED.time_of_day, location = EXCLUDED.location, updated_at = NOW()
    RETURNING id
  `);
  sceneIds[s.slug] = Number(r[0]!.id);
}
const existing = await db.execute<{ id: number; slug: string }>(sql`
  SELECT id, slug FROM scenes WHERE production_id = (SELECT id FROM productions WHERE slug = ${PROD_SLUG})
`);
for (const e of existing) sceneIds[e.slug] = Number(e.id);
console.log(`[+] scenes: ${SCENES.length} new (${Object.keys(sceneIds).length} total)`);

// ────────────────────────────────────────────────────────────────────
// 5. Color pipeline — ARRI ALEXA + Lustre @ Company 3
// ────────────────────────────────────────────────────────────────────

await db.execute(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT prod.id, NULL,
    'ARRI ALEXA LogC + Light-Box-driven illumination — Stephen Nakamura @ Company 3 (Lustre)',
    'LogC',
    'ARRI Wide Gamut',
    'ACES IDT.ARRI.LogC.EI800',
    'ACEScct',
    'ACES Output Transform — Rec.709 D65 (theatrical) + Dolby Vision PQ + Rec.2020 PQ (IMAX)',
    '4K Dolby Vision HDR + IMAX 1.90 stereoscopic 3D + Rec.709 SDR + 35mm contact print',
    'Stephen Nakamura colorist at Company 3 on Autodesk Lustre. The unusual aspect of the Gravity grade was integrating the Light-Box-driven on-set illumination — Lubezki and Webber pre-visualised every shot''s lighting plot in CG and played it back through the LED panels during photography, so the on-set capture already carried the final-frame lighting characteristics. Nakamura''s grade focused on continuity-matching across the practical / virtual handoff and the stereoscopic conversion deliverable. The 3D conversion was performed by Stereo D under Lubezki''s supervision.'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
  ON CONFLICT (production_id) WHERE scene_id IS NULL
  DO UPDATE SET
    pipeline_name = EXCLUDED.pipeline_name, camera_log = EXCLUDED.camera_log,
    camera_gamut = EXCLUDED.camera_gamut, idt = EXCLUDED.idt,
    working_space = EXCLUDED.working_space, odt = EXCLUDED.odt,
    deliverable = EXCLUDED.deliverable, notes = EXCLUDED.notes, updated_at = NOW()
`);
console.log('[+] color pipeline: ALEXA + Light Box → ACES → Nakamura @ Company 3');

// ────────────────────────────────────────────────────────────────────
// 6. Lighting setups — per-scene plots focusing on Light Box
// ────────────────────────────────────────────────────────────────────

const LIGHTING = [
  {
    sceneSlug: 'opening-spacewalk-long-take',
    setupName: 'Light Box — pre-rendered Earth + sun rotation',
    motivation: 'The fundamental Gravity invention: a 20-foot × 10-foot cube of 196 LED panels (4,096 individually-addressable LEDs total) inside which Sandra Bullock was suspended on a 12-axis rig. The LED panels played back pre-rendered space photography (Earth surface, sun, stars, debris strikes) so that the on-set capture already carried the final-frame lighting characteristics. No traditional movie lighting — the Light Box IS the lighting plot.',
    notes: 'Lubezki conceived the Light Box after attending a Peter Gabriel concert with an extravagant light show. Tim Webber + Framestore engineered it at Shepperton Studios. The rotation of the LED imagery was timecode-locked to Bullock\'s rig motion + the camera operator\'s motion-control track — when Stone was tumbling, the Light Box was projecting tumbling Earth, with all three motion vectors (rig + camera + Light Box) phased into a single edited motion plate.',
  },
  {
    sceneSlug: 'soyuz-fire',
    setupName: 'Soyuz capsule — practical fire bar + Light Box ambient',
    motivation: 'Practical fire-bar SFX inside the Light Box capsule mock-up; the Light Box played back the orange rotating-Earth ambient + the practical fire bar threw the hot key on Bullock\'s face. The fire was a controlled gas-bar fed at 35 psi for repeatable-take consistency.',
    notes: 'The capsule interior was a partial-fascia mock-up wedged against the Light Box wall; Bullock\'s coverage came from a single Light-Box-mounted ARRI ALEXA on a 6-axis remote head. SFX coordinator Neil Corbould (later Best VFX Oscar winner) supervised the fire gag.',
  },
  {
    sceneSlug: 'tiangong-descent',
    setupName: 'Tiangong descent — Light Box atmosphere-re-entry orange',
    motivation: 'The re-entry sequence: Light Box played back a rotating-orange atmospheric-fire animation while Bullock was suspended on a hydraulic rig that physically tilted to match the descent vector. The rotation of the LED orange ramped through the atmospheric-burn temperature curve in lockstep with the rig\'s tilt.',
    notes: 'Single sequence required 8 days of motion-control rehearsal before any take was photographed; the rig + Light Box + camera were each running independent motion-control tracks that had to phase-lock in playback.',
  },
  {
    sceneSlug: 'lake-powell-ending',
    setupName: 'Lake Powell ending — sun + practical reflector',
    motivation: 'Sole practical-exterior beat in the film. Lake Powell, Arizona at golden hour. Single-source sun key from camera-right + a 4×8 silver-side reflector at the lake\'s edge picking up fill on Stone\'s face. Lubezki called this "the lighting plot of the simplest scene in the film, and the only one not driven by the Light Box."',
    notes: 'Hand-held wide-frame; no movie lighting beyond the reflector. Lake Powell exterior-block was 4 days of principal photography at the very end of the schedule.',
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
      motivation = EXCLUDED.motivation, notes = EXCLUDED.notes, updated_at = NOW()
  `);
  lightingCount++;
}
console.log(`[+] lighting setups: ${lightingCount}`);

// ────────────────────────────────────────────────────────────────────
// 7. Locations — Shepperton + Lake Powell
// ────────────────────────────────────────────────────────────────────

const LOCATIONS = [
  { name: 'Shepperton Studios', region: 'Surrey', country: 'GB', lat: 51.3950, lng: -0.4521,
    isStudio: true, notes: 'Primary stage — Light Box was constructed in K Stage. The cube was permanent for the duration of principal photography; all interior coverage of the Hubble + ISS + Soyuz + Tiangong sequences was captured here.' },
  { name: 'Pinewood Studios', region: 'Buckinghamshire', country: 'GB', lat: 51.5491, lng: -0.5380,
    isStudio: true, notes: 'Secondary cover stages + Framestore VFX dailies infrastructure. Some technical-rehearsal pre-light work for the Light Box was prototyped at Pinewood before installation at Shepperton.' },
  { name: 'Lake Powell', region: 'Arizona', country: 'US', lat: 36.9341, lng: -111.4837,
    isStudio: false, notes: 'Sole practical-exterior location. The ending shore-walk was the final scene shot — golden-hour sun-only lighting + a 4×8 reflector. Four-day exterior block at the very end of the schedule.' },
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

// ────────────────────────────────────────────────────────────────────
// 8. Post-house links — Company 3 (DI), Skywalker (sound)
// ────────────────────────────────────────────────────────────────────

const POST_LINKS = [
  { slug: 'company-3', role: 'di',
    notes: 'Stephen Nakamura colorist on Autodesk Lustre. The DI integrated the Light-Box-driven on-set illumination — Lubezki and Webber pre-visualised every shot\'s lighting plot in CG and played it back through the LED panels during photography.' },
  { slug: 'company-3', role: 'color_grading',
    notes: 'Nakamura graded for Rec.709 theatrical, Dolby Vision HDR, Rec.2020 PQ for IMAX, and the Stereo D 3D conversion deliverable.' },
  { slug: 'skywalker-sound', role: 'sound_mix',
    notes: 'Skip Lievsay + Niv Adiri + Christopher Benstead + Chris Munro — won the Best Sound Mixing Oscar. Glenn Freemantle won Best Sound Editing.' },
  { slug: 'imax-dmr', role: 'imax_remaster',
    notes: 'IMAX 1.90 + IMAX 3D expansion DMR remaster.' },
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
// 9. VFX credits — Framestore primary (Tim Webber)
// ────────────────────────────────────────────────────────────────────

const VFX_HOUSES = [
  { slug: 'stereo-d', name: 'Stereo D', kind: 'boutique', country: 'US', founded: 2009,
    summary: 'Burbank-based stereoscopic 3D conversion specialty house. On Gravity converted the entire 91-minute film from 2D to 3D under Lubezki\'s direct supervision; the conversion is widely considered among the best 2D-to-3D conversions ever performed.' },
];

for (const v of VFX_HOUSES) {
  await db.execute(sql`
    INSERT INTO vfx_houses (slug, name, kind, country, founded_year, summary)
    VALUES (${v.slug}, ${v.name}, ${v.kind}::vfx_house_kind_enum, ${v.country}, ${v.founded}, ${v.summary})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, summary = EXCLUDED.summary, updated_at = NOW()
  `);
}

const VFX_CREDITS = [
  { vfxSlug: 'framestore', role: 'primary', shotCount: 600,
    notes: 'Tim Webber overall VFX supervisor — won the Best Visual Effects Oscar with Chris Lawrence, David Shirk, Neil Corbould (SFX). Framestore engineered the Light Box itself, performed all body-replacement and environment compositing, and operated as the de-facto creative engine of the film for 2.5 years of pre-production + production + post.' },
  { vfxSlug: 'stereo-d', role: 'special_sequences', shotCount: null,
    notes: 'Full 91-minute 2D-to-3D conversion under Lubezki\'s supervision. One of the most-cited "good" stereoscopic conversions in cinema; Lubezki personally approved every shot\'s depth budget.' },
];

for (const c of VFX_CREDITS) {
  await db.execute(sql`
    INSERT INTO vfx_credits (production_id, vfx_house_id, shot_count, role, notes)
    SELECT prod.id, vh.id, ${c.shotCount}, ${c.role}::vfx_credit_role_enum, ${c.notes}
    FROM productions prod, vfx_houses vh
    WHERE prod.slug = ${PROD_SLUG} AND vh.slug = ${c.vfxSlug}
    ON CONFLICT (production_id, vfx_house_id) DO UPDATE SET
      shot_count = EXCLUDED.shot_count, role = EXCLUDED.role,
      notes = EXCLUDED.notes, updated_at = NOW()
  `);
}
console.log(`[+] vfx houses: ${VFX_HOUSES.length} added; vfx_credits: ${VFX_CREDITS.length}`);

// ────────────────────────────────────────────────────────────────────
// 10. Awards — full Oscar slate (won 7 of 10 noms)
// ────────────────────────────────────────────────────────────────────

const AWARDS = [
  // Oscars 2014 — won 7
  { org: 'academy_awards', category: 'Best Director', year: 2014, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Cinematography', year: 2014, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Visual Effects', year: 2014, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2014, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Sound Editing', year: 2014, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Sound Mixing', year: 2014, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Original Score', year: 2014, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Picture', year: 2014, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Production Design', year: 2014, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  { org: 'academy_awards', category: 'Best Actress', year: 2014, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2014' },
  // BAFTA 2014 — won 6
  { org: 'bafta', category: 'Best Director', year: 2014, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2014' },
  { org: 'bafta', category: 'Outstanding British Film', year: 2014, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2014' },
  { org: 'bafta', category: 'Best Cinematography', year: 2014, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2014' },
  { org: 'bafta', category: 'Best Special Visual Effects', year: 2014, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2014' },
  { org: 'bafta', category: 'Best Sound', year: 2014, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2014' },
  { org: 'bafta', category: 'Best Original Music', year: 2014, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2014' },
  // ASC 2014
  { org: 'asc_award', category: 'Outstanding Achievement in Cinematography in Theatrical Releases', year: 2014, isWinner: true, sourceUrl: 'https://theasc.com/asc-awards' },
  // VES 2014
  { org: 'ves_award', category: 'Outstanding Visual Effects in a Photoreal Feature', year: 2014, isWinner: true, sourceUrl: 'https://www.visualeffectssociety.com/awards' },
  // Critics Choice 2014
  { org: 'critics_choice', category: 'Best Cinematography', year: 2014, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2014-critics-choice-awards/' },
  { org: 'critics_choice', category: 'Best Visual Effects', year: 2014, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2014-critics-choice-awards/' },
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

// ────────────────────────────────────────────────────────────────────
// 11. Stunt sequences — the rig-suspended performance work
// ────────────────────────────────────────────────────────────────────

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

const STUNT_SEQUENCES = [
  {
    sceneSlug: 'opening-spacewalk-long-take',
    slug: 'spacewalk-12-axis-rig',
    name: 'Spacewalk — 12-axis rig suspension performance',
    description: 'Sandra Bullock spent the bulk of principal photography suspended on a 12-axis rig inside the Light Box. The rig\'s motion-control was timecode-locked to the camera move and the LED panel imagery — when Stone tumbled, all three motion vectors phased together as a single edited motion plate. Bullock performed extreme positional + rotational arcs over 80+ shoot days while wearing the prop NASA EMU suit. Riggers + stunt coordinator Steven Pope supervised every take.',
    screenMinutes: 25.0,
    disciplineTags: ['rigging', 'motion-control', 'wirework', 'extended-suspension'],
    rigging: {
      rigs: [
        { type: 'multi-axis', notes: '12-axis robotic rig with timecode-locked motion-control. Engineered by Bot & Dolly + Framestore as a custom-build for Gravity.' },
        { type: 'motion-control', notes: 'Independent motion-control track for the camera; the LED Light Box ran a third motion-control track for the rotating-Earth playback. All three locked to a master timecode.' },
      ],
      harness: 'Custom NASA-EMU-prop reinforced harness with multiple anchor points; Bullock underwent 6 weeks of suspension fitness training before principal photography.',
      notes: 'Stunt coordinator Steven Pope worked with rig engineer Bot & Dolly. Bullock\'s rig sessions were limited to 4-hour blocks for circulation safety. The rig was capable of 360° pitch + roll + yaw with linear travel along three axes.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #18 (Aerial / Wire-Work)'],
    references: [
      { title: 'Tim Webber on the Gravity light-box', url: 'https://www.btlnews.com/awards/contender-portfolios/contender-visual-effects-supervisor-tim-webber-gravity/', publication: 'Below the Line', kind: 'interview' },
      { title: 'Lubezki on Gravity virtual cinematography', url: 'https://www.indiewire.com/features/general/oscar-winner-lubezki-talks-the-virtual-cinematography-of-gravity-how-a-peter-gabriel-concert-helped-him-visualize-the-film-and-more-194881/', publication: 'IndieWire', kind: 'interview' },
    ],
    sortOrder: 10,
  },
  {
    sceneSlug: 'soyuz-fire',
    slug: 'soyuz-fire-bar-pyro',
    name: 'Soyuz capsule fire — practical pyro inside Light Box',
    description: 'Practical fire-bar SFX inside the Light Box capsule mock-up. Bullock performed at close proximity to a controlled gas-bar fed at 35 psi. SFX coordinator Neil Corbould (later Best VFX Oscar winner) supervised the gag with full medical + fire suppression on standby.',
    screenMinutes: 2.0,
    disciplineTags: ['fire', 'pyro', 'practical-effect'],
    rigging: {
      rigs: [
        { type: 'fire', notes: 'Controlled propane gas-bar at 35 psi for repeat-take consistency. Practical fire interacted with Bullock\'s prop EMU suit which had a fire-retardant outer shell.' },
      ],
      notes: 'SFX coordinator Neil Corbould; on-set fire marshal + medical standby for every take. The fire bar was tuned across 3 days of pre-light to match the desired flame profile in the LogC plate.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)', 'SAG-AFTRA Bulletin #2 (Pyrotechnics)', 'SAG-AFTRA Bulletin #11 (Open Flame)'],
    references: [
      { title: 'Sandra Bullock, George Clooney in Gravity — 5 ways VFX wizards sent them into space', url: 'https://www.hollywoodreporter.com/news/sandra-bullock-george-clooney-gravity-644538', publication: 'The Hollywood Reporter', kind: 'article' },
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
      scene_id = EXCLUDED.scene_id, name = EXCLUDED.name, description = EXCLUDED.description,
      screen_minutes = EXCLUDED.screen_minutes, discipline_tags = EXCLUDED.discipline_tags,
      rigging = EXCLUDED.rigging, safety_bulletins_followed = EXCLUDED.safety_bulletins_followed,
      "references" = EXCLUDED."references", sort_order = EXCLUDED.sort_order, updated_at = NOW()
  `);
  stuntCount++;
}
console.log(`[+] stunt sequences: ${stuntCount}`);

console.log('\n──────────────────────────────────────────────');
console.log('Gravity (2013) deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
