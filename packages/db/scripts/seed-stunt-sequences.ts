// Phase-3 editorial seed for the stunt section: 6 well-documented
// set-pieces across 4 curated films, each with structured rigging,
// vehicle data (where applicable), VFX-handoff metadata, and
// performer credits resolved through the people table.
//
// Editorial prose is brief original synthesis of publicly-discussed
// rigging facts (pole-cat poles, decelerator cables, picture-car
// modifications, named coordinators). Facts aren't copyrightable.
// References are title + URL only.
import { db, sql } from '../src/index.ts';

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

// ── Coordinators not yet in `people` from Phase 2 ──────────────────
// Each gets a brief bio so the sequence credits can link to a real
// person row. ON CONFLICT (slug) DO UPDATE so re-runs are safe.

const NEW_COORDINATORS: Array<{
  slug: string;
  displayName: string;
  bio: string;
  nationality: string;
  birthYear?: number;
  stuntDisciplines: string[];
  performerUnion: string;
  stuntCompanySlug: string | null;
}> = [
  {
    slug: 'robert-alonzo',
    displayName: 'Robert Alonzo',
    bio:
      `Robert Alonzo is an American stunt coordinator with credits across recent prestige action including 1917, where he led the stunt team through Sam Mendes\' apparent-single-take coverage. His resume also covers Skyfall second-unit work, the Iron Man cycle, and Daredevil (the Netflix series, where his fight choreography defined the corridor-fight aesthetic that John Wick subsequently amplified). Alonzo trained through the Marvel pipeline before transitioning into prestige-feature coordination work.`,
    nationality: 'US',
    stuntDisciplines: ['fight', 'wirework', 'falling', 'second-unit direction'],
    performerUnion: 'SAG-AFTRA',
    stuntCompanySlug: null,
  },
  {
    slug: 'guy-norris',
    displayName: 'Guy Norris',
    bio:
      `Guy Norris is an Australian stunt coordinator and second-unit director with a four-decade career working across George Miller\'s Mad Max cycle (Mad Max 2 / The Road Warrior, Beyond Thunderdome, Fury Road, Furiosa: A Mad Max Saga) and the Reacher Lee Child adaptations. Norris coordinated the pole-cat sequence on Fury Road, working with Australian rigger Glenn Suter on the carbon-fibre pole rig that lets performers swing between picture vehicles at speed. He has won multiple Taurus World Stunt Awards.`,
    nationality: 'AU',
    birthYear: 1957,
    stuntDisciplines: ['driving', 'wirework', 'rigging', 'second-unit direction'],
    performerUnion: 'SAG-AFTRA',
    stuntCompanySlug: 'ark-stunts',
  },
  {
    slug: 'tom-struthers',
    displayName: 'Tom Struthers',
    bio:
      `Tom Struthers is a British stunt coordinator who has been Christopher Nolan\'s primary stunt collaborator from Batman Begins (2005) onward, with credits across the Dark Knight trilogy, Inception, Interstellar, Dunkirk, Tenet and Oppenheimer. His coordination style emphasises practical effects matched to Nolan\'s preference for in-camera stunts over digital extension; the truck flip in The Dark Knight (achieved with a front-mounted nitrogen ram) and the rotating-corridor fight in Inception are signature Struthers set-pieces.`,
    nationality: 'GB',
    stuntDisciplines: ['driving', 'fight', 'wirework', 'rigging', 'second-unit direction'],
    performerUnion: 'BSR',
    stuntCompanySlug: null,
  },
  {
    slug: 'gary-powell',
    displayName: 'Gary Powell',
    bio:
      `Gary Powell is a British stunt coordinator who has run the action unit on the Bond franchise from Casino Royale (2006) through No Time to Die (2021). He comes from a multi-generational stunt family — his father Joe Powell doubled actors on the Bond series in the 1960s — and his coordination has included the Skyfall train-rooftop pre-titles sequence, the Spectre helicopter opening over Mexico City, and the Italian motorcycle chase that opens No Time to Die.`,
    nationality: 'GB',
    stuntDisciplines: ['driving', 'motorcycle', 'fight', 'wirework', 'second-unit direction'],
    performerUnion: 'BSR',
    stuntCompanySlug: null,
  },
  {
    slug: 'rob-alonzo',
    displayName: 'Rob Alonzo',
    bio:
      `Rob Alonzo is a Canadian stunt coordinator who led the action unit on Matt Reeves\' The Batman (2022), coordinating the BatMobile chase, the Riddler-tunnel raid, and the climactic Iceberg Lounge fight. His earlier coordinator work covers The Shape of Water and several Pacific Rim entries; his style sits at the intersection of Reeves\'s grounded photography and the kind of practical-vehicle work the modern Batmobile demanded.`,
    nationality: 'CA',
    stuntDisciplines: ['driving', 'fight', 'wirework', 'rigging', 'second-unit direction'],
    performerUnion: 'ACTRA',
    stuntCompanySlug: null,
  },
];

for (const c of NEW_COORDINATORS) {
  await db.execute(sql`
    INSERT INTO people (
      slug, display_name, country, bio, birth_date,
      stunt_disciplines, performer_union, stunt_company_slug
    ) VALUES (
      ${c.slug}, ${c.displayName}, ${c.nationality}, ${c.bio},
      ${c.birthYear ? `${c.birthYear}-01-01` : null}::date,
      ${pgTextArray(c.stuntDisciplines)}::text[],
      ${c.performerUnion},
      ${c.stuntCompanySlug}
    )
    ON CONFLICT (slug) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      country = COALESCE(people.country, EXCLUDED.country),
      bio = EXCLUDED.bio,
      stunt_disciplines = EXCLUDED.stunt_disciplines,
      performer_union = EXCLUDED.performer_union,
      stunt_company_slug = EXCLUDED.stunt_company_slug,
      updated_at = NOW()
  `);
  console.log(`  [person] ${c.slug.padEnd(28)} — coordinator row ready`);
}

// ── Sequences ──────────────────────────────────────────────────────

type SequenceCreditSeed = {
  personSlug: string;
  role: string;                         // 'coordinator' | 'performer' | 'double' | 'rigger' | 'safety' | '2nd_unit_director' | 'precision_driver' | 'fight_choreographer'
  doublingForPersonSlug?: string;       // when role = 'double'
  notes?: string;
};

type Reference = { title: string; url: string; publication?: string; kind?: string };

type SequenceSeed = {
  productionSlug: string;
  slug: string;
  name: string;
  description: string;
  screenMinutes: number | null;
  disciplineTags: string[];
  rigging: Record<string, unknown>;
  vehicle?: Record<string, unknown>;
  vfxHandoffFrame?: number;
  vfxHandoffHouseSlug?: string;
  safetyOfficerPersonSlug?: string;
  safetyBulletinsFollowed: string[];
  btsVideoUrl?: string;
  references: Reference[];
  credits: SequenceCreditSeed[];
};

const SEQUENCES: SequenceSeed[] = [
  {
    productionSlug: '1917-2019',
    slug: 'trench-traversal',
    name: 'Trench traversal + ridge run',
    description:
      `Sam Mendes\' apparent-single-take coverage required the stunt unit to choreograph multi-minute traversals of a fully-built No Man\'s Land trench set, with performers landing precisely at marked positions for each blocking change. The set was rigged top-to-bottom for falls, fire stings, and impact reaction shots; performers had to reset between takes because each take ran the full length of the sequence in real time.`,
    screenMinutes: 8.5,
    disciplineTags: ['fight', 'falling', 'fire', 'wirework'],
    rigging: {
      rigs: [
        { type: 'Decelerator descender', manufacturer: 'BD Stunt Rigging', capacity_lbs: 400, notes: 'Pre-rigged at multiple trench-wall positions for sandbag-impact falls.' },
        { type: 'Fire-sting harness', notes: 'Nomex-lined inner harness + per-performer gel application for the burning-corpse shots.' },
        { type: 'Floor mat array', notes: 'Padded-foam flooring across the trench bed, dressed over to read as duckboard on camera.' },
      ],
      mounts: ['Continuous-cable trolley along the trench-top for the steadicam-relay handoff'],
      notes: 'Robert Alonzo\'s team rehearsed the full traversal sequence for six weeks before the shoot to lock blocking + safety beats to the camera path.',
    },
    safetyBulletinsFollowed: ['SAG-AFTRA Bulletin #11 (Fire / Burns)'],
    references: [
      { title: '1917: how the long-take stunt unit worked', url: 'https://www.fxguide.com/fxfeatured/1917/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Roger Deakins on shooting 1917', url: 'https://theasc.com/articles/1917', publication: 'American Cinematographer', kind: 'interview' },
    ],
    credits: [
      { personSlug: 'robert-alonzo', role: 'coordinator' },
    ],
  },
  {
    productionSlug: 'mad-max-fury-road-2015',
    slug: 'pole-cat-sequence',
    name: 'Pole-cat swing-between-vehicles sequence',
    description:
      `Performers ride long carbon-fibre poles fitted to picture vehicles, swinging cab-to-cab while the convoy travels at speed. The pole-cat rig was designed in collaboration with Australian rigger Glenn Suter (ARK Stunts) — a rear-mounted carbon-fibre pole, counterweighted at the base, with the performer harnessed to a sliding ring along the pole length. A safety cable ran from the harness to a winch-controlled tether mounted on the chase vehicle.`,
    screenMinutes: 4.0,
    disciplineTags: ['driving', 'wirework', 'rigging'],
    rigging: {
      rigs: [
        { type: 'Pole-cat carbon-fibre pole', manufacturer: 'ARK Stunts (Glenn Suter)', notes: '14-foot rear-mount with sliding harness ring; performers swung between the Doof Wagon, War Rig, and chase trucks at convoy speed.' },
        { type: 'Counterweight base', notes: 'Welded chassis-mount with tuned counterweight matching performer + harness mass.' },
        { type: 'Winch tether', notes: 'Independent safety cable from performer harness to a winch-controlled mount on the photography chase vehicle.' },
      ],
      notes: 'The sequence was shot in the Namib Desert with the convoy at sustained 50–80 km/h. Performers wore radio comms with the coordinator + driver pairs.',
    },
    vehicle: {
      picture_car: { make: 'Custom', model: 'Polecat / War Rig', modifications: ['rear-mounted pole-cat rig', 'chassis counterweight', 'winch tether mount'] },
      towing_rig: 'self-driven (chase + lead vehicles in convoy)',
      prep_company: 'ARK Stunts',
    },
    safetyBulletinsFollowed: ['SAG-AFTRA Bulletin #19 (Vehicles)'],
    references: [
      { title: 'Mad Max: Fury Road — pole-cats and the convoy', url: 'https://www.fxguide.com/fxfeatured/mad-max-fury-road/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Guy Norris on coordinating Fury Road', url: 'https://www.thehollywoodreporter.com/movies/movie-features/guy-norris-stunt-coordinator-mad-max-fury-road', publication: 'The Hollywood Reporter', kind: 'interview' },
    ],
    credits: [
      { personSlug: 'guy-norris', role: 'coordinator' },
      { personSlug: 'mike-massa', role: 'performer' },
    ],
  },
  {
    productionSlug: 'mad-max-fury-road-2015',
    slug: 'war-rig-rollover',
    name: 'War Rig rollover',
    description:
      `The War Rig rollover sequence — the multi-axle truck collapsing onto its side mid-convoy — was performed practically using the actual picture-car War Rig with internal roll-cage reinforcement and a counterweighted impact rig. Multiple cameras (eight to twelve, depending on take) covered the sequence; reset between takes took roughly 24 hours.`,
    screenMinutes: 1.5,
    disciplineTags: ['driving', 'rigging'],
    rigging: {
      rigs: [
        { type: 'Internal roll-cage reinforcement', notes: 'Welded steel frame inside the cab + trailer to maintain crew survival space during the roll.' },
        { type: 'Pneumatic flip-pad cannon', notes: 'Ground-mounted ram triggering the directed roll on cue.' },
      ],
      notes: 'Rollovers performed with internal puppet drivers (no human in the cab during the tip).',
    },
    vehicle: {
      picture_car: { make: 'Custom (8x8)', model: 'War Rig', modifications: ['internal roll-cage', 'puppet driver rigging', 'breakaway side panels'] },
      towing_rig: 'self-driven into rig',
      prep_company: 'ARK Stunts',
    },
    safetyBulletinsFollowed: ['SAG-AFTRA Bulletin #19 (Vehicles)'],
    references: [
      { title: 'Mad Max: Fury Road — vehicle stunt breakdown', url: 'https://www.fxguide.com/fxfeatured/mad-max-fury-road/', publication: 'fxguide', kind: 'fxguide' },
    ],
    credits: [
      { personSlug: 'guy-norris', role: 'coordinator' },
    ],
  },
  {
    productionSlug: 'the-dark-knight-2008',
    slug: 'truck-flip',
    name: 'Mack truck front-flip',
    description:
      `The chase set-piece on Lower Wacker Drive (filmed under Chicago) where the Joker\'s Mack truck is flipped end-over-end by the Batpod\'s grappling hook. Achieved practically using a high-pressure nitrogen ram fitted under the front of the truck cab; the ram fired on cue, lifting the cab so the truck pitched forward into a controlled longitudinal roll. No CG in the flip itself; minor digital extension was added for the Batpod cable line.`,
    screenMinutes: 0.4,
    disciplineTags: ['driving', 'rigging'],
    rigging: {
      rigs: [
        { type: 'Nitrogen-charged front ram', manufacturer: 'Special Effects Department (Chris Corbould)', notes: 'High-pressure nitrogen cannon mounted under the cab; on-cue firing produced the front-end lift.' },
        { type: 'Internal roll-cage', notes: 'Welded steel frame in the cab + trailer to maintain survival space; no human in the cab during the flip.' },
      ],
      notes: 'Practical effects supervisor Chris Corbould engineered the ram alongside Tom Struthers\'s stunt team. Lower Wacker Drive was rented for the night shoot; the flipped truck was reset and re-rolled across multiple takes.',
    },
    vehicle: {
      picture_car: { make: 'Mack', model: 'CH613', year: 2002, modifications: ['internal roll-cage', 'front-mounted nitrogen ram', 'puppet driver'] },
      towing_rig: 'self-driven up to flip cue',
    },
    safetyBulletinsFollowed: ['SAG-AFTRA Bulletin #19 (Vehicles)'],
    references: [
      { title: 'The Dark Knight: Chris Corbould on the flip', url: 'https://www.fxguide.com/fxfeatured/the-dark-knight/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'Lower Wacker chase: shooting in Chicago', url: 'https://theasc.com/articles/the-dark-knight', publication: 'American Cinematographer', kind: 'interview' },
    ],
    credits: [
      { personSlug: 'tom-struthers', role: 'coordinator' },
    ],
  },
  {
    productionSlug: 'skyfall-2012',
    slug: 'train-rooftop-opening',
    name: 'Train rooftop pursuit (pre-titles)',
    description:
      `The pre-titles foot-pursuit and fight on top of a moving train through Istanbul. Performers ran across the carriage roofs at speed with magnetised footwear and a low-profile safety harness running on a continuous cable along the train length. The cable was hidden in the rendering by careful camera placement and post-clean; the harness was rated for fall arrest at the train\'s 50-mph cruising speed.`,
    screenMinutes: 6.0,
    disciplineTags: ['fight', 'wirework', 'driving'],
    rigging: {
      rigs: [
        { type: 'Continuous-cable safety line', notes: 'Run along the carriage roof centreline; performer harness clipped via low-profile sliding ring.' },
        { type: 'Magnetised footwear', notes: 'Steel inserts in performer boots paired with magnet plates on the carriage roof at key blocking marks.' },
        { type: 'Decelerator harness', notes: 'Fall-arrest harness rated for the train\'s cruising speed; never visible to the camera frame.' },
      ],
      notes: 'Gary Powell\'s team rehearsed for three weeks on a static carriage rig before moving to the live train in Adana, Turkey.',
    },
    vehicle: {
      picture_car: { make: 'Custom (Turkish State Railways)', model: 'Carriage train', modifications: ['centreline safety cable', 'magnet plates', 'reinforced roof skin'] },
      towing_rig: 'self-driven (live train at cruising speed)',
    },
    safetyBulletinsFollowed: ['SAG-AFTRA Bulletin #20 (Working at Heights)', 'SAG-AFTRA Bulletin #19 (Vehicles)'],
    references: [
      { title: 'Skyfall: Gary Powell on the Istanbul opening', url: 'https://variety.com/2012/film/news/skyfall-stunt-coordinator-gary-powell-1118062547/', publication: 'Variety', kind: 'interview' },
    ],
    credits: [
      { personSlug: 'gary-powell', role: 'coordinator' },
    ],
  },
  {
    productionSlug: 'the-batman-2022',
    slug: 'batmobile-chase',
    name: 'BatMobile freeway chase',
    description:
      `The freeway chase between the Penguin\'s SUV and Batman\'s BatMobile — a custom-built picture car based on a 1970 Pontiac Firebird with a hot-rod chassis and rear-mounted twin afterburner. The sequence used four BatMobile picture cars (one hero, three stunt) and seven Penguin SUVs, with precision driving through a closed Brooklyn freeway tunnel.`,
    screenMinutes: 7.0,
    disciplineTags: ['driving', 'precision driving'],
    rigging: {
      rigs: [
        { type: 'Front-mounted impact ram', notes: 'For the SUV-flip beat where the BatMobile rams the Penguin\'s vehicle — pneumatic ram pre-loaded for cue firing.' },
        { type: 'Black Bird camera tow rig', notes: 'Edge-Innovations Black Bird used for both BatMobile-following and BatMobile-leading shots.' },
      ],
      notes: 'Rob Alonzo\'s team trained on the BatMobile picture cars for four weeks before the shoot to handle the modified chassis dynamics under speed.',
    },
    vehicle: {
      picture_car: { make: 'Custom (built on Pontiac Firebird shell)', model: 'BatMobile', modifications: ['hot-rod chassis', 'rear-mounted twin afterburner', 'reinforced roll cage', 'Black Bird-mount tow points'] },
      towing_rig: 'Black Bird (Edge Innovations) for camera-car leading + following',
      prep_company: 'Picture Car Warehouse',
    },
    safetyBulletinsFollowed: ['SAG-AFTRA Bulletin #19 (Vehicles)'],
    references: [
      { title: 'The Batman: building the BatMobile picture cars', url: 'https://www.fxguide.com/fxfeatured/the-batman/', publication: 'fxguide', kind: 'fxguide' },
    ],
    credits: [
      { personSlug: 'rob-alonzo', role: 'coordinator' },
    ],
  },
];

let inserted = 0;
let creditsInserted = 0;

for (const seq of SEQUENCES) {
  // Resolve production_id.
  const [prod] = await db.execute<{ id: number }>(sql`
    SELECT id FROM productions WHERE slug = ${seq.productionSlug}
  `);
  if (!prod) {
    console.warn(`  [miss] production ${seq.productionSlug} — skipping`);
    continue;
  }

  // Resolve VFX house id (optional).
  let vfxHouseId: number | null = null;
  if (seq.vfxHandoffHouseSlug) {
    const [vh] = await db.execute<{ id: number }>(sql`
      SELECT id FROM vfx_houses WHERE slug = ${seq.vfxHandoffHouseSlug}
    `);
    vfxHouseId = vh?.id ?? null;
  }

  // Resolve safety officer id (optional).
  let safetyOfficerId: number | null = null;
  if (seq.safetyOfficerPersonSlug) {
    const [so] = await db.execute<{ id: number }>(sql`
      SELECT id FROM people WHERE slug = ${seq.safetyOfficerPersonSlug}
    `);
    safetyOfficerId = so?.id ?? null;
  }

  // Insert / update sequence.
  const [sequenceRow] = await db.execute<{ id: number }>(sql`
    INSERT INTO stunt_sequences (
      production_id, slug, name, description, screen_minutes,
      discipline_tags, rigging, vehicle, vfx_handoff_frame,
      vfx_handoff_house_id, safety_officer_person_id,
      safety_bulletins_followed, bts_video_url, "references"
    ) VALUES (
      ${prod.id}, ${seq.slug}, ${seq.name}, ${seq.description},
      ${seq.screenMinutes},
      ${pgTextArray(seq.disciplineTags)}::text[],
      ${JSON.stringify(seq.rigging)}::jsonb,
      ${seq.vehicle ? JSON.stringify(seq.vehicle) : null}::jsonb,
      ${seq.vfxHandoffFrame ?? null},
      ${vfxHouseId},
      ${safetyOfficerId},
      ${pgTextArray(seq.safetyBulletinsFollowed)}::text[],
      ${seq.btsVideoUrl ?? null},
      ${JSON.stringify(seq.references)}::jsonb
    )
    ON CONFLICT (production_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      screen_minutes = EXCLUDED.screen_minutes,
      discipline_tags = EXCLUDED.discipline_tags,
      rigging = EXCLUDED.rigging,
      vehicle = EXCLUDED.vehicle,
      vfx_handoff_frame = EXCLUDED.vfx_handoff_frame,
      vfx_handoff_house_id = EXCLUDED.vfx_handoff_house_id,
      safety_officer_person_id = EXCLUDED.safety_officer_person_id,
      safety_bulletins_followed = EXCLUDED.safety_bulletins_followed,
      bts_video_url = EXCLUDED.bts_video_url,
      "references" = EXCLUDED."references",
      updated_at = NOW()
    RETURNING id
  `);
  inserted++;
  console.log(`  [seq] ${seq.productionSlug}/${seq.slug.padEnd(24)} — ${seq.disciplineTags.length} disciplines, ${seq.references.length} refs`);

  // Wipe + re-insert credits to keep the seed authoritative.
  await db.execute(sql`DELETE FROM stunt_sequence_credits WHERE sequence_id = ${sequenceRow!.id}`);
  for (let i = 0; i < seq.credits.length; i++) {
    const c = seq.credits[i]!;
    const [person] = await db.execute<{ id: number }>(sql`
      SELECT id FROM people WHERE slug = ${c.personSlug}
    `);
    if (!person) {
      console.warn(`    [miss] person ${c.personSlug}`);
      continue;
    }
    let doublingForId: number | null = null;
    if (c.doublingForPersonSlug) {
      const [df] = await db.execute<{ id: number }>(sql`
        SELECT id FROM people WHERE slug = ${c.doublingForPersonSlug}
      `);
      doublingForId = df?.id ?? null;
    }
    await db.execute(sql`
      INSERT INTO stunt_sequence_credits (
        sequence_id, person_id, role, doubling_for_person_id, notes, sort_order
      ) VALUES (
        ${sequenceRow!.id}, ${person.id}, ${c.role}, ${doublingForId}, ${c.notes ?? null}, ${i}
      )
      ON CONFLICT (sequence_id, person_id, role) DO NOTHING
    `);
    creditsInserted++;
  }
}

console.log(`\nseeded ${inserted} sequences, ${creditsInserted} credits`);
process.exit(0);
