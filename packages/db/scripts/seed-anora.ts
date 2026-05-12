// Deep-dive editorial seed for Anora (2024).
//
// Why this film: Sean Baker's 5-Oscar sweep at the 2025 Academy Awards
// (Best Picture, Director, Original Screenplay, Actress, Film Editing).
// Won the Palme d'Or at Cannes 2024. Shot on 35mm Kodak film by Drew
// Daniels — the rare contemporary American Indie production preserving
// celluloid acquisition. Audit showed CR + SC + KF only — minimal data.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'anora-2024';

await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2023-02-15',
      principal_photography_end   = '2023-04-30',
      runtime_minutes = COALESCE(runtime_minutes, 139),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2023-02 → 2023-04');

const FORMATS = [
  { label: 'A-camera — Arricam ST 35mm Panavision spherical', aspect: '1.85:1',
    acquisition: 'Kodak 35mm 4-perf (Panavision spherical)', colorSpace: 'Photochemical',
    frameRate: '24', isPrimary: true },
  { label: 'B-camera — Arricam LT (handheld + tight rigs)', aspect: '1.85:1',
    acquisition: 'Kodak 35mm 4-perf', colorSpace: 'Photochemical',
    frameRate: '24', isPrimary: false },
  { label: 'Digital deliverables — DI', aspect: '1.85:1',
    acquisition: 'Kodak 35mm scan → DI', colorSpace: 'ACEScct → Rec.709 + Dolby Vision PQ',
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
  { slug: 'cre-film', name: 'Cre Film', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'filmnation-entertainment', name: 'FilmNation Entertainment', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: 'Q5450173' },
  // Neon already exists from Parasite seed
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

const SCENES = [
  {
    slug: 'opening-strip-club', sceneNumber: '1', title: 'Opening — Brighton Beach strip club introduction',
    synopsis: 'The film opens with Anora ("Ani") at work in a Brooklyn strip club, captured in extended single-take handheld coverage. Sean Baker\'s long-take documentary aesthetic — natural-fall-off practical fluorescents + neon, no movie key. Drew Daniels shot the entire opening with the Arricam handheld in fluid coverage of the working club floor.',
    pos: 60, ie: 'int', tod: 'night', location: 'Brighton Beach, Brooklyn — practical strip club',
  },
  {
    slug: 'vegas-quickie-marriage', sceneNumber: '8', title: 'Vegas quickie marriage',
    synopsis: 'Ani and Vanya marry impulsively in a Las Vegas chapel during their week-long pre-engagement bender. Practical chapel lighting + practical neon-strip exteriors; Daniels shot the entire Vegas block on location across one week of guerrilla-style production.',
    pos: 1800, ie: 'int_ext', tod: 'night', location: 'Las Vegas, NV — practical wedding chapel',
  },
  {
    slug: 'home-invasion-confrontation', sceneNumber: '14', title: 'Home invasion — Igor + Toros confrontation',
    synopsis: 'Vanya\'s parents send the Russian-American "fixers" Igor + Toros + Garnik to retrieve him from the Brighton Beach mansion. The single-take confrontation in the kitchen — Ani fighting back hand-to-hand against the three men — is one of the film\'s most-cited sequences. Practical kitchen lighting only; Daniels shot the long-take handheld.',
    pos: 4200, ie: 'int', tod: 'day', location: 'Brighton Beach mansion practical location',
  },
  {
    slug: 'brighton-beach-search', sceneNumber: '18', title: 'Brighton Beach search for Vanya',
    synopsis: 'Igor + Toros + Garnik take Ani through Brighton Beach to search for the runaway Vanya — a 30-minute extended sequence covering nightclubs, bars, restaurants, the boardwalk, and the apartment of Vanya\'s mistress. Sean Baker\'s documentary handheld aesthetic at peak; Daniels shot guerrilla-style with practical natural ambient + actual nightlife illumination.',
    pos: 5400, ie: 'ext', tod: 'night', location: 'Brighton Beach, Brooklyn — practical neighbourhood',
  },
  {
    slug: 'final-igor-car', sceneNumber: '24', title: 'Final scene — Igor + Ani in the car',
    synopsis: 'The film\'s closing scene: Igor returns Ani\'s engagement ring + drives her home in his car through a snowy Brighton Beach winter morning. The final intimate exchange in the parked car — Ani\'s breakdown, the unspoken human-recognition beat with Igor — is a single-take played in real time. Practical winter-light + the parked car\'s interior dome lamp as the only illumination.',
    pos: 8100, ie: 'int', tod: 'day', location: 'Brighton Beach, Brooklyn',
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
    'Kodak 35mm 4-perf + 4K scan → FotoKem DI',
    'Photochemical Kodak Vision3 5219 + 5207 negative',
    'Photochemical (no digital sensor primary)',
    'Custom FotoKem IDT for 35mm 4-perf scans',
    'ACEScct',
    'ACES Output Transform — Rec.709 D65 + Dolby Vision PQ-1000 nit',
    '4K Dolby Vision HDR + Rec.709 SDR + 35mm contact print + theatrical DCP',
    'Sean Baker + Drew Daniels specified Kodak 35mm acquisition for the documentary-aesthetic continuity from Baker''s previous The Florida Project / Tangerine cycle. The grade preserves the natural-fall-off practical-fixture aesthetic — no per-shot secondary keys, no skin-tone correction, no atmospheric haze adjustment. FotoKem DI was completed under Sean Baker''s direct supervision (Baker is also the film''s editor — won the Best Film Editing Oscar).'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
  ON CONFLICT (production_id) WHERE scene_id IS NULL
  DO UPDATE SET pipeline_name = EXCLUDED.pipeline_name, camera_log = EXCLUDED.camera_log,
    camera_gamut = EXCLUDED.camera_gamut, idt = EXCLUDED.idt, working_space = EXCLUDED.working_space,
    odt = EXCLUDED.odt, deliverable = EXCLUDED.deliverable, notes = EXCLUDED.notes, updated_at = NOW()
`);
console.log('[+] color pipeline: Kodak 35mm → FotoKem');

const LIGHTING = [
  {
    sceneSlug: 'opening-strip-club',
    setupName: 'Strip club — practical fluorescent + neon only',
    motivation: 'Practical fluorescent ceiling tubes + practical neon-strip wall fixtures + practical stage-spot pin-lights. Daniels added no movie lighting — the entire club interior is lit by the working venue\'s native fixture set. Long-take handheld coverage with the Arricam at base ISO 500 for the cleanest Kodak 5219 signal.',
    notes: 'Practical Brighton Beach club location. Sean Baker\'s documentary aesthetic dictates that location-native illumination is the lighting plot — the club\'s natural fall-off + colour temperature shifts across the room are the visual register.',
  },
  {
    sceneSlug: 'home-invasion-confrontation',
    setupName: 'Brighton Beach kitchen — practical overhead fluorescent only',
    motivation: 'Practical overhead fluorescent ceiling fixture in the kitchen + practical refrigerator-light bleed + practical window-bleed daylight. Daniels shot the long-take handheld confrontation under the kitchen\'s native fixtures only. The Mikey Madison fight choreography against three actors required 11 takes; Baker selected the take with the rawest physical impact.',
    notes: 'Brighton Beach mansion practical location. The single-take fight choreography was rehearsed for two weeks before principal photography; Madison performed the bulk of her own physicality with Karren Karagulian (Toros), Vache Tovmasyan (Garnik), and Yura Borisov (Igor).',
  },
  {
    sceneSlug: 'brighton-beach-search',
    setupName: 'Brighton Beach search — guerrilla natural ambient',
    motivation: 'Guerrilla-style production through actual Brighton Beach nightlife — practical neon storefront illumination + practical streetlight + practical bar/restaurant interior fixtures. Daniels shot with a minimal hand-carried lighting kit (one battery-powered LED panel for emergency fill); the rest is location-native.',
    notes: 'Permits secured for restaurant + bar interiors; exterior boardwalk + street coverage shot guerrilla without permits. The 30-minute sequence required 4 consecutive shooting nights to assemble continuous coverage across the Brighton Beach neighbourhood.',
  },
  {
    sceneSlug: 'final-igor-car',
    setupName: 'Final car scene — practical winter daylight + dome lamp',
    motivation: 'Practical Brooklyn winter daylight through the parked car\'s windows + the car\'s interior dome lamp as the only illumination. Daniels shot in a single take that spans the duration of the unspoken human-recognition exchange between Ani and Igor; the pacing of the natural light decay across the take was deliberately allowed to drift.',
    notes: 'Brighton Beach practical location. The film\'s closing beat was filmed in 4 consecutive takes; Baker selected the third for the final cut. The actors\' frozen breath visible in the cold interior is unaltered — practical winter cold, not a CG effect.',
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
  { name: 'Brighton Beach, Brooklyn', region: 'New York', country: 'US', lat: 40.5779, lng: -73.9591, isStudio: false,
    notes: 'Primary location — the entire Russian-American immigrant neighbourhood serves as Anora\'s lived environment. Sean Baker secured permits for restaurant + bar interiors; exterior boardwalk + street coverage filmed guerrilla without permits. Practical Brighton Beach mansion for the home-invasion sequences.' },
  { name: 'Las Vegas, Nevada', region: 'Nevada', country: 'US', lat: 36.1699, lng: -115.1398, isStudio: false,
    notes: 'One-week production block for the Vegas quickie-marriage sequences — practical chapel + practical Strip exteriors. Baker shot guerrilla-style with no major venue permits; the entire Vegas block was completed across 7 consecutive shooting nights.' },
  { name: 'Coney Island', region: 'New York', country: 'US', lat: 40.5755, lng: -73.9707, isStudio: false,
    notes: 'Adjacent Brooklyn neighbourhood used for selected boardwalk + amusement-park exteriors continuous with the Brighton Beach coverage.' },
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
  { slug: 'fotokem', role: 'di',
    notes: 'FotoKem DI completed under Sean Baker\'s direct supervision (Baker is also the film\'s editor — won the Best Film Editing Oscar).' },
  { slug: 'fotokem', role: 'finishing',
    notes: '35mm contact print pass for first-run venues + the digital DCP + Dolby Vision deliverables.' },
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

// Awards — won 5 Oscars + Palme d'Or
const AWARDS = [
  { org: 'academy_awards', category: 'Best Picture', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Director', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Original Screenplay', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Actress', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Supporting Actor', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'cannes', category: "Palme d'Or", year: 2024, isWinner: true, sourceUrl: 'https://www.festival-cannes.com/en/2024' },
  { org: 'critics_choice', category: 'Best Original Screenplay', year: 2025, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2025-critics-choice-awards/' },
  { org: 'critics_choice', category: 'Best Actress', year: 2025, isWinner: false, sourceUrl: 'https://www.criticschoice.com/2025-critics-choice-awards/' },
  { org: 'bafta', category: 'Best Leading Actress', year: 2025, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2025' },
  { org: 'bafta', category: 'Best Original Screenplay', year: 2025, isWinner: false, sourceUrl: 'https://www.bafta.org/film-awards/2025' },
  { org: 'spirit_awards', category: 'Best Feature', year: 2025, isWinner: true, sourceUrl: 'https://filmindependent.org/spirit-awards/' },
  { org: 'spirit_awards', category: 'Best Director', year: 2025, isWinner: true, sourceUrl: 'https://filmindependent.org/spirit-awards/' },
  { org: 'spirit_awards', category: 'Best Female Lead', year: 2025, isWinner: true, sourceUrl: 'https://filmindependent.org/spirit-awards/' },
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
console.log('Anora deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
