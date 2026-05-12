// Deep-dive editorial seed for The Brutalist (2024).
//
// Why this film: Lol Crawley shot the first major narrative feature
// in VistaVision since 1961's One-Eyed Jacks — a 64-year gap. Won
// Best Cinematography + Best Actor (Brody) + Best Original Score
// (Blumberg) at the 2025 Oscars; Brady Corbet won Silver Lion at
// Venice for direction. Audit showed 1 format / 2 studios / 2 scenes
// / 1 award; everything else empty.
import { db, sql } from '../src/index.ts';

const PROD_SLUG = 'the-brutalist-2024';

await db.execute(sql`
  UPDATE productions
  SET principal_photography_start = '2023-03-30',
      principal_photography_end   = '2023-05-30',
      runtime_minutes = COALESCE(runtime_minutes, 215),
      updated_at = NOW()
  WHERE slug = ${PROD_SLUG}
`);
console.log('[+] production: principal photography 2023-03-30 → 2023-05-30');

const FORMATS = [
  { label: 'A-camera — VistaVision (8-perf 35mm)', aspect: '1.66:1',
    acquisition: 'VistaVision 8-perf 35mm', colorSpace: 'Photochemical',
    frameRate: '24', isPrimary: true },
  { label: '70mm presentation prints', aspect: '1.66:1',
    acquisition: 'VistaVision → 70mm 5-perf contact print', colorSpace: 'Photochemical',
    frameRate: '24', isPrimary: false },
  { label: 'Digital deliverables — Rec.709 + Dolby Vision', aspect: '1.66:1',
    acquisition: 'VistaVision → 8K scan → DI', colorSpace: 'ACEScct → Rec.709 + Dolby Vision PQ',
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
  { slug: 'brookstreet-pictures', name: 'Brookstreet Pictures', country: 'GB', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'kaplan-morrison', name: 'Kaplan Morrison', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'yellow-bird-uk', name: 'Yellow Bird UK', country: 'GB', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'brouhaha-entertainment', name: 'Brouhaha Entertainment', country: 'US', kind: 'production_company',
    role: 'production_company', wikidataId: null },
  { slug: 'a24', name: 'A24', country: 'US', kind: 'studio',
    role: 'distributor', wikidataId: 'Q15953699' },
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

const SCENES = [
  {
    slug: 'opening-philadelphia-1947', sceneNumber: '1', title: 'Opening — Philadelphia 1947 arrival',
    synopsis: 'László Tóth disembarks at the Port of Philadelphia after surviving Buchenwald — Statue of Liberty seen vertically inverted from the immigrant\'s upward-tilted perspective. Lol Crawley\'s VistaVision frame establishes the film\'s formal language: anamorphic-equivalent width on a vertical-camera mount, a deliberate perceptual subversion of the immigrant cliché.',
    pos: 240, ie: 'ext', tod: 'day', location: 'Budapest — Danube River doubling for Delaware',
  },
  {
    slug: 'overlook-mansion-arrival', sceneNumber: '8', title: 'Overlook mansion — Van Buren commission',
    synopsis: 'László arrives at the Van Buren estate in Doylestown, Pennsylvania to design the family\'s new institute — a meeting that becomes the film\'s central commission. Crawley\'s VistaVision frame establishes the architect\'s visual register: low-angle wide-frame compositions positioning Tóth against the institutional architecture of his new world.',
    pos: 1800, ie: 'int', tod: 'day', location: 'Hungary — country-estate location doubling for Pennsylvania',
  },
  {
    slug: 'carrara-marble-quarry', sceneNumber: '15', title: 'Carrara marble quarry sequence',
    synopsis: 'László travels to Carrara, Italy to source marble for the Institute — the most-photographed visual sequence of the film. Practical Carrara quarry photography in Tuscany; Crawley shot in the open marble pits with the VistaVision rig\'s vertical-frame proportions emphasising the geometric brutalism of the quarry walls.',
    pos: 6000, ie: 'ext', tod: 'day', location: 'Carrara, Tuscany',
  },
  {
    slug: 'institute-completion', sceneNumber: '22', title: 'Institute completion — László\'s vindication',
    synopsis: 'After years of construction halts, the Institute is finally completed. Crawley\'s VistaVision frame is at its most expansive: the Institute\'s brutalist concrete geometry filled the entire VistaVision aperture, with László\'s figure deliberately small in frame to emphasise scale.',
    pos: 9600, ie: 'ext', tod: 'magic_hour', location: 'Hungary — purpose-built Institute construction set',
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
    'VistaVision 8-perf 35mm + 8K scan → FotoKem DI (Máté Nagy colorist)',
    'Photochemical Kodak Vision3 5219 negative',
    'Photochemical (no digital sensor primary)',
    'Custom FotoKem IDT for 8K VistaVision scans',
    'ACEScct',
    'ACES Output Transform — Rec.709 D65 + Dolby Vision PQ-1000 nit + 70mm 5-perf contact-print pass',
    '70mm 5-perf presentation prints + 4K Dolby Vision HDR + Rec.709 SDR + 35mm contact print',
    'Lol Crawley + Brady Corbet specified VistaVision negative for the project — the 8-perf 35mm format had not been used for a major narrative feature since Marlon Brando''s One-Eyed Jacks in 1961, a 63-year gap. Máté Nagy at FotoKem handled the DI, originally brought on as dailies colourist before the relationship deepened during pre-production camera tests. The 70mm presentation print pass was a deliberate exhibition-format choice, with first-run venues equipped for 70mm projection screening the photochemical contact-print version. Daniel Blumberg''s Best-Original-Score-winning soundtrack mixed at FotoKem''s adjacent sound facility.'
  FROM productions prod WHERE prod.slug = ${PROD_SLUG}
  ON CONFLICT (production_id) WHERE scene_id IS NULL
  DO UPDATE SET pipeline_name = EXCLUDED.pipeline_name, camera_log = EXCLUDED.camera_log,
    camera_gamut = EXCLUDED.camera_gamut, idt = EXCLUDED.idt, working_space = EXCLUDED.working_space,
    odt = EXCLUDED.odt, deliverable = EXCLUDED.deliverable, notes = EXCLUDED.notes, updated_at = NOW()
`);
console.log('[+] color pipeline: VistaVision → FotoKem');

const LIGHTING = [
  {
    sceneSlug: 'opening-philadelphia-1947',
    setupName: 'Philadelphia arrival — vertical-camera VistaVision',
    motivation: 'Crawley\'s opening choice: VistaVision rig mounted vertically so the 8-perf frame reads at portrait orientation. The Statue of Liberty seen inverted from László\'s upward-tilted perspective — a deliberate perceptual subversion of the immigrant cliché. Practical morning sun + the Danube\'s reflection providing the entire lighting plot.',
    notes: 'Budapest Danube doubled for Philadelphia\'s Delaware River. The vertical VistaVision rig was a custom-built mount engineered to handle the 8-perf format\'s film-transport mechanism in a non-horizontal orientation — likely a first-of-its-kind in the format\'s 70-year history.',
  },
  {
    sceneSlug: 'overlook-mansion-arrival',
    setupName: 'Van Buren mansion — natural sunlight + practical fixtures',
    motivation: 'Crawley shot the Van Buren mansion interiors with natural sunlight through period-correct windows + practical period-correct chandelier fixtures. The Brody / Pearce performance dynamics required the actors to walk through the entire mansion\'s spatial geometry without breaking character; Crawley\'s wide VistaVision frame held the entire room at f/2.8 base ratings.',
    notes: 'Hungary country-estate location doubled for Pennsylvania. Sun-only daylight rated at base 200 ISO equivalent for VistaVision; dim-spec interior practicals supplemented at 4-stop fall-off ratings.',
  },
  {
    sceneSlug: 'carrara-marble-quarry',
    setupName: 'Carrara quarry — Italian Mediterranean sun-only',
    motivation: 'Practical Carrara quarry photography in Tuscany — Crawley shot in the open marble pits with no movie lighting at any point in the sequence. The reflective marble surfaces themselves act as an enormous bounce-card, kicking sun light back into the shadow side of every figure in frame.',
    notes: 'Two-week Carrara block. Practical safety considerations limited the working window to mid-morning (when the sun cleared the quarry walls) through early afternoon (before the marble heat made the working surfaces dangerous).',
  },
  {
    sceneSlug: 'institute-completion',
    setupName: 'Institute completion — magic-hour brutalist scale',
    motivation: 'Crawley shot the climactic Institute reveal at golden hour with the VistaVision rig at maximum width. The Institute\'s brutalist concrete geometry filled the entire VistaVision aperture; László\'s figure deliberately small in frame at 1/24 of the frame width to emphasise scale.',
    notes: 'Purpose-built Institute construction set in Hungary; the production\'s most expensive single set-piece. Magic-hour shoot window across 5 consecutive days to bank coverage in the consistent light decay.',
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
  { name: 'Budapest', region: 'Budapest', country: 'HU', lat: 47.4979, lng: 19.0402, isStudio: false,
    notes: 'Primary production base — Brady Corbet + Mona Fastvold relocated to Budapest for principal photography. Multiple Budapest neighbourhoods doubled for 1947-1980s Philadelphia exteriors.' },
  { name: 'Carrara, Tuscany', region: 'Tuscany', country: 'IT', lat: 44.0793, lng: 10.0982, isStudio: false,
    notes: 'Sole non-Hungary location — the Carrara marble quarry sequence (the film\'s most-photographed visual set-piece). Two-week shooting block in the open quarry pits.' },
  { name: 'Hungary — Country Estate Location', region: 'Pest County', country: 'HU', lat: 47.5000, lng: 19.5000, isStudio: false,
    notes: 'Country-estate location doubling for the Van Buren mansion in Doylestown, Pennsylvania. The mansion + grounds + period-correct interiors for the Van Buren commission.' },
  { name: 'Hungary — Institute Construction Set', region: 'Pest County', country: 'HU', lat: 47.5000, lng: 19.4000, isStudio: true,
    notes: 'Purpose-built Institute construction set — the production\'s most expensive single set-piece. Multiple shooting blocks across the schedule for the Institute under construction sequences + the climactic completion reveal.' },
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
    notes: 'Máté Nagy colorist. Originally brought on as dailies colourist before the relationship deepened during pre-production camera tests; FotoKem became the film\'s primary DI partner. The 8K VistaVision negative scans were processed at FotoKem with a custom IDT for the 8-perf format.' },
  { slug: 'fotokem', role: 'finishing',
    notes: '70mm 5-perf contact-print pass for first-run 70mm presentation venues. Photochemical answer-print continuity matched against the digital DI for the Dolby Vision + Rec.709 deliverables.' },
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

// Awards — won 3 Oscars (Cinematography already; Actor + Score new), 10 noms
const AWARDS = [
  { org: 'academy_awards', category: 'Best Cinematography', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Actor', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Original Score', year: 2025, isWinner: true, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Picture', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Director', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Original Screenplay', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Supporting Actor', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Supporting Actress', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Production Design', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  { org: 'academy_awards', category: 'Best Film Editing', year: 2025, isWinner: false, sourceUrl: 'https://www.oscars.org/oscars/ceremonies/2025' },
  // Venice 2024 — Silver Lion (Best Direction)
  { org: 'venice', category: 'Silver Lion — Best Direction', year: 2024, isWinner: true, sourceUrl: 'https://www.labiennale.org/en/cinema/2024' },
  // Golden Globes 2025
  { org: 'golden_globes', category: 'Best Motion Picture — Drama', year: 2025, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2025-golden-globes' },
  { org: 'golden_globes', category: 'Best Director', year: 2025, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2025-golden-globes' },
  { org: 'golden_globes', category: 'Best Actor — Drama', year: 2025, isWinner: true, sourceUrl: 'https://goldenglobes.com/articles/2025-golden-globes' },
  // BAFTA 2025
  { org: 'bafta', category: 'Best Cinematography', year: 2025, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2025' },
  { org: 'bafta', category: 'Best Original Score', year: 2025, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2025' },
  { org: 'bafta', category: 'Best Director', year: 2025, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2025' },
  { org: 'bafta', category: 'Best Leading Actor', year: 2025, isWinner: true, sourceUrl: 'https://www.bafta.org/film-awards/2025' },
  // Critics Choice 2025
  { org: 'critics_choice', category: 'Best Cinematography', year: 2025, isWinner: true, sourceUrl: 'https://www.criticschoice.com/2025-critics-choice-awards/' },
  // ASC 2025
  { org: 'asc_award', category: 'Outstanding Achievement in Cinematography in Theatrical Releases', year: 2025, isWinner: true, sourceUrl: 'https://theasc.com/asc-awards' },
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
console.log('The Brutalist deep-dive seed complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
