// Deep-dive editorial seed for No Country for Old Men (2007).
//
// Why this film: Coen Brothers + Roger Deakins — won 4 Oscars (Best
// Picture, Best Director, Best Adapted Screenplay, Best Supporting
// Actor for Bardem). Deakins's first nomination as a Coens collaborator
// to be paired with a Best Picture win. Shot 35mm Panavision spherical
// in West Texas + New Mexico; deliberate non-DI aesthetic — Deakins
// + Coens specified a photochemical-finishing pass, no digital grade.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'no-country-for-old-men-2007';

await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2006-05-22',
      principal_photography_end   = '2006-08-15',
      runtime_minutes = COALESCE(runtime_minutes, 122),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2006-05 → 2006-08');

const FORMATS = [
  { label: 'A-camera — Arriflex 535B + 235 / 35mm Panavision spherical', aspect: '2.39:1',
    acquisition: 'Kodak 35mm 4-perf (Panavision spherical)', colorSpace: 'Photochemical',
    frameRate: '24', isPrimary: true },
  { label: 'B-camera — Arriflex 235 (handheld + tight rigs)', aspect: '2.39:1',
    acquisition: 'Kodak 35mm 4-perf', colorSpace: 'Photochemical',
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

const STUDIOS = [
  { slug: 'scott-rudin-productions', name: 'Scott Rudin Productions', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q7437005' },
  { slug: 'mike-zoss-productions', name: 'Mike Zoss Productions', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q6841969' },
  { slug: 'paramount-vantage', name: 'Paramount Vantage', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q1991767' },
  { slug: 'miramax', name: 'Miramax', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q172241' },
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

const SCENES = [
  {
    slug: 'opening-monologue', sceneNumber: '1', title: 'Sheriff Bell\'s opening monologue',
    synopsis: 'Tommy Lee Jones\'s Sheriff Bell delivers the film\'s opening voiceover monologue over a montage of West Texas landscape stills. Deakins shot the dawn-to-dusk landscape progression at multiple locations across Marfa, Big Bend, and Las Vegas NM over the course of one week.',
    pos: 60, ie: 'ext', tod: 'dawn', location: 'Marfa, TX + Big Bend National Park',
  },
  {
    slug: 'desert-discovery', sceneNumber: '3', title: 'Llewelyn discovers the drug-deal aftermath',
    synopsis: 'Llewelyn Moss stumbles upon the bullet-riddled aftermath of a drug deal gone wrong in the West Texas brush country, finds the satchel of $2 million, and takes it. Deakins shot the entire sequence in available natural daylight; the bodies + vehicles + practical squib effects were SFX coordinator Peter Chesney\'s practical work.',
    pos: 600, ie: 'ext', tod: 'day', location: 'Marfa, TX brush country',
  },
  {
    slug: 'gas-station-coin-toss', sceneNumber: '8', title: 'Gas-station coin toss',
    synopsis: 'Anton Chigurh stops at a small West Texas gas station and forces the elderly proprietor into an unspoken death-stakes coin toss. The single-take confrontation became one of the most-cited dialogue scenes of the 2000s. Practical fluorescent ceiling-tube lighting; Deakins added no supplemental movie key.',
    pos: 1500, ie: 'int', tod: 'day', location: 'Marfa, TX gas station',
  },
  {
    slug: 'desert-river-shootout', sceneNumber: '12', title: 'Desert river shootout',
    synopsis: 'Llewelyn flees Chigurh through the West Texas brush country, taking refuge in the Rio Grande. Practical natural-daylight photography; the dog tracking + river crossing + the final motel-balcony shot were captured over multiple consecutive shooting days under Peter Chesney\'s SFX direction.',
    pos: 3300, ie: 'ext', tod: 'magic_hour', location: 'Rio Grande, TX',
  },
  {
    slug: 'motel-corridor-stalking', sceneNumber: '17', title: 'Motel corridor stalking',
    synopsis: 'Chigurh stalks Llewelyn through the corridors of a Texas motel using the cattle-gun pneumatic captive-bolt to disable door locks. Practical tungsten ceiling fixtures + practical fluorescent corridor tubes; Deakins specified no movie lighting at all in the corridors — the practicals carry both the dramatic illumination and the stalking-suspense tension.',
    pos: 4500, ie: 'int', tod: 'night', location: 'Las Vegas, NM motel build',
  },
  {
    slug: 'final-monologue-dream', sceneNumber: '24', title: 'Bell\'s final dream monologue',
    synopsis: 'Sheriff Bell delivers the film\'s closing dream-recall monologue at his kitchen table. Practical natural light through the kitchen window; Deakins shot in a single take that spans the duration of Tommy Lee Jones\'s slow-paced delivery without coverage cuts.',
    pos: 7140, ie: 'int', tod: 'day', location: 'Bell home interior set, Las Vegas NM',
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

await db.execute(sql`
  INSERT INTO production_color_pipelines (
    production_id, scene_id, pipeline_name,
    camera_log, camera_gamut, idt, working_space, odt, deliverable, notes
  )
  SELECT prod.id, NULL,
    'Kodak 35mm 4-perf — photochemical finishing, no DI (Roger Deakins + Coens)',
    'Photochemical Kodak Vision2 negative',
    'Photochemical (no digital sensor primary)',
    'N/A — photochemical workflow only',
    'N/A — photochemical workflow only',
    'Photochemical answer-print → 35mm contact-print theatrical release',
    '35mm contact print + later DCP transfer',
    'Deliberate non-DI aesthetic — Deakins + the Coens specified photochemical finishing only, with the colour grade locked at the answer-print stage. The contemporary 2007 industry was already shifting to digital intermediate; this was a conscious throwback choice. The look is the LATER digital remaster (handled by FotoKem for the home-video deliverables) rather than a primary DI grade — the theatrical release print was a chemical contact print straight off the answer master.'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
  ON CONFLICT (production_id) WHERE scene_id IS NULL
  DO UPDATE SET pipeline_name = EXCLUDED.pipeline_name, camera_log = EXCLUDED.camera_log,
    camera_gamut = EXCLUDED.camera_gamut, idt = EXCLUDED.idt, working_space = EXCLUDED.working_space,
    odt = EXCLUDED.odt, deliverable = EXCLUDED.deliverable, notes = EXCLUDED.notes, updated_at = NOW()
`);
console.log('[+] color pipeline: photochemical only (Deakins + Coens)');

const LIGHTING = [
  {
    sceneSlug: 'gas-station-coin-toss',
    setupName: 'Gas station — practical fluorescent only',
    motivation: 'Practical fluorescent ceiling-tube lighting throughout the gas-station interior. Deakins added no supplemental movie key — the entire scene plays under the fluorescent fall-off, with Chigurh\'s shadow side underexposed against the practical window-bleed daylight from camera-right.',
    notes: 'Marfa, TX practical location. Deakins\' approach across the film was minimal-fixture: where a practical existed, he used it; where one didn\'t, he often refused to add a movie fixture in its place.',
  },
  {
    sceneSlug: 'desert-discovery',
    setupName: 'Desert discovery — full natural daylight',
    motivation: 'Available natural daylight at the West Texas brush-country location. No reflectors, no movie fixtures. The bodies + vehicles + practical squib effects were SFX coordinator Peter Chesney\'s practical work; the visual register is documentary-style, with Deakins choosing wide compositions over tight coverage.',
    notes: 'Marfa, TX brush country location. The contemporary desert-discovery cinematography became one of the most-imitated visual registers of the late-2000s independent crime-thriller cycle.',
  },
  {
    sceneSlug: 'motel-corridor-stalking',
    setupName: 'Motel corridor — practical tungsten + fluorescent only',
    motivation: 'Practical tungsten ceiling fixtures in the rooms + practical fluorescent corridor tubes. Deakins specified no movie lighting at all in the corridors — the practicals carry both the dramatic illumination and the stalking-suspense tension. The cattle-gun captive-bolt door-lock disabling effect was a practical Peter Chesney SFX gag with an air-pressure squib synced to the bolt action.',
    notes: 'Las Vegas, NM motel build. The corridor practicals were custom-spaced to give Chigurh a hard-shadow advance pattern; the bedside-lamp practical was a tungsten 60W given two stops over key.',
  },
  {
    sceneSlug: 'final-monologue-dream',
    setupName: 'Bell kitchen — natural daylight through window only',
    motivation: 'Practical natural light through the kitchen window. Deakins shot in a single take that spans the duration of Tommy Lee Jones\'s slow-paced delivery without coverage cuts. The window-bleed soft-key + the dim under-cabinet practical fluorescent behind Bell are the entire lighting plot.',
    notes: 'Las Vegas, NM home-interior set. The closing monologue was rehearsed as a single piece + filmed across 4 consecutive takes; the take used in the final cut was the third.',
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

const LOCATIONS = [
  { name: 'Marfa, Texas', region: 'Texas', country: 'US', lat: 30.3097, lng: -104.0203, isStudio: false,
    notes: 'Primary West Texas location — desert-discovery sequence, gas-station coin toss, opening landscape montage. Joel + Ethan Coen specifically scouted Marfa for the brush-country aesthetic; the town has since become a film-tourism destination on the strength of the No Country for Old Men + Giant + There Will Be Blood association.' },
  { name: 'Las Vegas, New Mexico', region: 'New Mexico', country: 'US', lat: 35.5942, lng: -105.2237, isStudio: false,
    notes: 'Secondary location — Bell\'s home interior, the motel corridor sequences, the connecting-road exteriors. Las Vegas NM (population 13K) provided the period-correct small-town aesthetic that Texas itself had largely lost by 2006.' },
  { name: 'Big Bend National Park', region: 'Texas', country: 'US', lat: 29.2540, lng: -103.2503, isStudio: false,
    notes: 'Establishing landscape montage photography. Deakins + the Coens shot the dawn-to-dusk progression across multiple Big Bend overlooks during the opening monologue\'s production block.' },
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

const POST_LINKS = [
  { slug: 'fotokem', role: 'finishing',
    notes: 'Photochemical answer-print + later digital remaster for home-video deliverables. The theatrical release print was a chemical contact print straight off the answer master — Deakins + the Coens specified no digital intermediate.' },
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

// Awards — won 4 Oscars, nominated for 8
const AWARDS = [
  { org: 'academy_awards', category: 'Best Picture', year: 2008, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'academy_awards', category: 'Best Director', year: 2008, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'academy_awards', category: 'Best Adapted Screenplay', year: 2008, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'academy_awards', category: 'Best Supporting Actor', year: 2008, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'academy_awards', category: 'Best Cinematography', year: 2008, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2008, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'academy_awards', category: 'Best Sound Editing', year: 2008, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'academy_awards', category: 'Best Sound Mixing', year: 2008, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2008' },
  { org: 'bafta', category: 'Best Director', year: 2008, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2008' },
  { org: 'bafta', category: 'Best Cinematography', year: 2008, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2008' },
  { org: 'bafta', category: 'Best Supporting Actor', year: 2008, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2008' },
  { org: 'golden_globes', category: 'Best Screenplay', year: 2008, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2008-golden-globes' },
  { org: 'golden_globes', category: 'Best Supporting Actor', year: 2008, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2008-golden-globes' },
  { org: 'asc_award', category: 'Outstanding Achievement in Cinematography in Theatrical Releases', year: 2008, isWinner: false, sourceUrl: 'https://theasc.com/asc-awards' },
  { org: 'critics_choice', category: 'Best Picture', year: 2008, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2008-critics-choice-awards/' },
  { org: 'critics_choice', category: 'Best Director', year: 2008, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2008-critics-choice-awards/' },
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
console.log('No Country for Old Men deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
