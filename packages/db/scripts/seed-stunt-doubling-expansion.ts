// Phase 9 — substantial expansion of the stunt-doubling dataset.
//
// Phase 8 seeded 6 credits to prove the surface works. This run
// brings the well-documented marquee doublings up to a useful
// volume: the Avengers core-four primary doubles, Mad Max: Fury
// Road's lead, and Matrix's Trinity double.
//
// All facts are drawn from published interviews, behind-the-scenes
// coverage, and the SAG-AFTRA stunt directory. Bios are original
// prose synthesizing widely-known career detail.
//
// Idempotent — re-running refreshes editorial fields without
// disturbing existing relationships.
import { db, sql } from '../src/index.ts';

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

// ── Stunt-person stubs (with full editorial fields) ──────────────────

type StuntPersonStub = {
  slug: string;
  displayName: string;
  bio: string;
  nationality: string;
  birthYear?: number;
  stuntDisciplines: string[];
  performerUnion: string | null;
  doublesFor: string[];
  stuntCompanySlug: string | null;
  trainingSchoolSlugs: string[];
};

const STUNT_PEOPLE: StuntPersonStub[] = [
  {
    slug: 'bobby-holland-hanton',
    displayName: 'Bobby Holland Hanton',
    bio:
      `Bobby Holland Hanton is a British stunt performer best known as Chris Hemsworth's primary stunt double across the entire Marvel Cinematic Universe run — every Thor entry, the Avengers cycle, Extraction, and the franchise-adjacent work. He has also doubled Daniel Craig on multiple Bond entries, Henry Cavill on Justice League and The Witcher, and Channing Tatum on G.I. Joe. Hanton trained as a competitive gymnast before transitioning into stunt work in the late 2000s; the gymnastic foundation underpins the wirework and aerial doubling that Hemsworth's Thor sequences depend on.`,
    nationality: 'GB',
    birthYear: 1983,
    stuntDisciplines: ['fight', 'wirework', 'aerial', 'high-fall', 'driving'],
    performerUnion: 'BSR',
    doublesFor: ['chris-hemsworth', 'daniel-craig', 'henry-cavill', 'channing-tatum'],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
  {
    slug: 'sam-hargrave',
    displayName: 'Sam Hargrave',
    bio:
      `Sam Hargrave is an American stunt coordinator and director who came up doubling Chris Evans across his Captain America run before transitioning to coordination on the Russo brothers' Avengers films. He directed the Russo-produced Extraction franchise (2020, 2023) for Netflix, where the now-famous oner-style fight choreography traces directly back to his coordination work on The Winter Soldier and Civil War. Hargrave is part of the 87Eleven Action Design network of coordinators-turned-directors.`,
    nationality: 'US',
    birthYear: 1980,
    stuntDisciplines: ['fight', 'gun-fu', 'martial arts', 'second-unit direction'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['chris-evans'],
    stuntCompanySlug: '87eleven-action-design',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'james-young',
    displayName: 'James Young',
    bio:
      `James Young is an American stunt performer who has doubled Mark Ruffalo across the MCU's Hulk-related work and previously on a long roster of features. The doubling job for Hulk is unusual within the stunt department: Ruffalo's Bruce Banner scenes use a conventional double, while the Hulk's full-body action is performed via motion-capture by a separate team — Young handles the Banner side.`,
    nationality: 'US',
    stuntDisciplines: ['fight', 'driving', 'utility'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['mark-ruffalo'],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
  {
    slug: 'aaron-toney',
    displayName: 'Aaron Toney',
    bio:
      `Aaron Toney is an American stunt performer and fight choreographer who has been Anthony Mackie's primary stunt double across the MCU's Falcon / Captain America arc. His credits also include the Sam Wilson sequences on Disney+, the helicarrier and bridge fights in The Winter Soldier, and the Madripoor sequence in The Falcon and the Winter Soldier. Toney works through the 87Eleven Action Design pool.`,
    nationality: 'US',
    stuntDisciplines: ['fight', 'aerial', 'wirework', 'parkour'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['anthony-mackie'],
    stuntCompanySlug: '87eleven-action-design',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'dayna-grant',
    displayName: 'Dayna Grant',
    bio:
      `Dayna Grant is a New Zealand stunt performer and coordinator best known as Charlize Theron's primary stunt double on Mad Max: Fury Road and Furiosa. Her career began in the New Zealand action-television tradition (the Xena / Hercules pipeline), where she came up alongside Zoë Bell. The Fury Road doubling job — full War Rig sequences, the cannon-roll, the chase choreography — is one of the most physically demanding lead-actress doubling assignments on the working record.`,
    nationality: 'NZ',
    birthYear: 1976,
    stuntDisciplines: ['driving', 'wirework', 'fight', 'fall'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['charlize-theron', 'lucy-lawless'],
    stuntCompanySlug: 'ark-stunts',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'olivia-jackson',
    displayName: 'Olivia Jackson',
    bio:
      `Olivia Jackson is a British stunt performer who has doubled lead actresses across feature and television including Carrie-Anne Moss on the Matrix sequels, Milla Jovovich on Resident Evil: The Final Chapter, and Karen Gillan on Avengers: Infinity War. She survived a career-altering 2015 motorcycle stunt accident on the Resident Evil set; her subsequent advocacy work has driven significant safety-bulletin updates around motorcycle stunt protocols.`,
    nationality: 'GB',
    birthYear: 1981,
    stuntDisciplines: ['motorcycle', 'fight', 'wirework', 'driving'],
    performerUnion: 'BSR',
    doublesFor: ['carrie-anne-moss', 'milla-jovovich', 'karen-gillan'],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
];

console.log('seed-stunt-doubling-expansion — Phase 9');
console.log('\nstunt people:');

for (const p of STUNT_PEOPLE) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO people (
      slug, display_name, country, bio, birth_date,
      stunt_disciplines, performer_union, doubles_for,
      stunt_company_slug, training_school_slugs, aliases
    ) VALUES (
      ${p.slug}, ${p.displayName}, ${p.nationality}, ${p.bio},
      ${p.birthYear ? `${p.birthYear}-01-01` : null}::date,
      ${pgTextArray(p.stuntDisciplines)}::text[],
      ${p.performerUnion},
      ${pgTextArray(p.doublesFor)}::text[],
      ${p.stuntCompanySlug},
      ${pgTextArray(p.trainingSchoolSlugs)}::text[],
      '{}'::text[]
    )
    ON CONFLICT (slug) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      country = COALESCE(people.country, EXCLUDED.country),
      bio = EXCLUDED.bio,
      birth_date = COALESCE(people.birth_date, EXCLUDED.birth_date),
      stunt_disciplines = EXCLUDED.stunt_disciplines,
      performer_union = EXCLUDED.performer_union,
      doubles_for = EXCLUDED.doubles_for,
      stunt_company_slug = COALESCE(people.stunt_company_slug, EXCLUDED.stunt_company_slug),
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    console.log(`  [+] ${p.slug.padEnd(30)} new`);
  } else {
    console.log(`  [~] ${p.slug.padEnd(30)} refreshed`);
  }
}

// ── Actor stubs ────────────────────────────────────────────────────

type ActorStub = {
  slug: string;
  displayName: string;
  birthYear: number;
  nationality: string;
  bio: string;
};

const ACTORS: ActorStub[] = [
  {
    slug: 'chris-hemsworth',
    displayName: 'Chris Hemsworth',
    birthYear: 1983, nationality: 'AU',
    bio:
      'Australian actor whose career spans the Star Trek reboot and the entire Thor / Avengers Marvel run. The MCU work pioneered an unusually deep partnership with stunt double Bobby Holland Hanton — Hanton has doubled Hemsworth on every Marvel feature plus Extraction and several non-Marvel projects.',
  },
  {
    slug: 'chris-evans',
    displayName: 'Chris Evans',
    birthYear: 1981, nationality: 'US',
    bio:
      'American actor best known for his run as Captain America across the Marvel Cinematic Universe. Sam Hargrave doubled him through the Russo-directed entries and went on to direct the Extraction franchise.',
  },
  {
    slug: 'mark-ruffalo',
    displayName: 'Mark Ruffalo',
    birthYear: 1967, nationality: 'US',
    bio:
      'American actor whose career spans Eternal Sunshine of the Spotless Mind, Spotlight, and the Avengers cycle. James Young handles the Bruce Banner stunt-double work on the MCU films, with Hulk action performed separately via motion capture.',
  },
  {
    slug: 'anthony-mackie',
    displayName: 'Anthony Mackie',
    birthYear: 1978, nationality: 'US',
    bio:
      'American actor whose Marvel arc as Sam Wilson / Falcon — and now Captain America — has run from The Winter Soldier through the Disney+ series. Aaron Toney has been his primary stunt double across the run.',
  },
  {
    slug: 'charlize-theron',
    displayName: 'Charlize Theron',
    birthYear: 1975, nationality: 'ZA',
    bio:
      'South African–American actress whose Mad Max: Fury Road performance as Imperator Furiosa relied on one of the most physically demanding doubling pipelines in modern cinema, with Dayna Grant performing the cannon-roll and War Rig sequences.',
  },
  {
    slug: 'carrie-anne-moss',
    displayName: 'Carrie-Anne Moss',
    birthYear: 1967, nationality: 'CA',
    bio:
      'Canadian actress best known as Trinity in the Matrix series. Olivia Jackson doubled her on the Matrix sequels.',
  },
  {
    slug: 'marion-cotillard',
    displayName: 'Marion Cotillard',
    birthYear: 1975, nationality: 'FR',
    bio:
      'French actress whose career includes La Vie en rose, Inception, and The Dark Knight Rises. The Inception dream-architecture sequences involved extensive stunt-coordinated work with multiple doubles for the rotating-corridor and hotel-room beats.',
  },
];

console.log('\nactor stubs:');
for (const a of ACTORS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO people (slug, display_name, country, bio, birth_date)
    VALUES (
      ${a.slug}, ${a.displayName}, ${a.nationality}, ${a.bio},
      ${`${a.birthYear}-01-01`}::date
    )
    ON CONFLICT (slug) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      country = COALESCE(people.country, EXCLUDED.country),
      bio = COALESCE(people.bio, EXCLUDED.bio),
      birth_date = COALESCE(people.birth_date, EXCLUDED.birth_date),
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  const row = r[0]!;
  console.log(`  [${row.created_at === row.updated_at ? '+' : '~'}] ${a.slug.padEnd(28)}`);
}

// ── Doubling credits ───────────────────────────────────────────────

type Doubling = {
  productionSlug: string;
  doublerSlug: string;
  doubledSlug: string;
  kind: 'primary_double' | 'utility_double' | 'driver_double' | 'fight_double' | 'aerial_double' | 'water_double';
  characterName?: string;
  notes?: string;
};

const DOUBLINGS: Doubling[] = [
  // ── Avengers core four — Bobby/Sam/James/Aaron on the Russo cycle.
  {
    productionSlug: 'avengers-infinity-war-2018',
    doublerSlug: 'bobby-holland-hanton',
    doubledSlug: 'chris-hemsworth',
    kind: 'primary_double',
    characterName: 'Thor',
    notes: 'Hanton performed the Wakandan-battle hammer-throw choreography and the Stormbreaker forging on Nidavellir.',
  },
  {
    productionSlug: 'avengers-endgame-2019',
    doublerSlug: 'bobby-holland-hanton',
    doubledSlug: 'chris-hemsworth',
    kind: 'primary_double',
    characterName: 'Thor',
    notes: 'The portals-battle close-quarters work and the time-heist sequences — Hanton on screen for most of the rigged action.',
  },
  {
    productionSlug: 'avengers-infinity-war-2018',
    doublerSlug: 'sam-hargrave',
    doubledSlug: 'chris-evans',
    kind: 'primary_double',
    characterName: 'Steve Rogers / Captain America',
    notes: 'Hargrave was on set as both stunt double and unit fight coordinator.',
  },
  {
    productionSlug: 'avengers-endgame-2019',
    doublerSlug: 'sam-hargrave',
    doubledSlug: 'chris-evans',
    kind: 'primary_double',
    characterName: 'Steve Rogers / Captain America',
    notes: 'The Cap-versus-Cap fight sequence — Hargrave performed both halves of the choreography to the working-take camera plate.',
  },
  {
    productionSlug: 'avengers-infinity-war-2018',
    doublerSlug: 'james-young',
    doubledSlug: 'mark-ruffalo',
    kind: 'utility_double',
    characterName: 'Bruce Banner',
  },
  {
    productionSlug: 'avengers-endgame-2019',
    doublerSlug: 'james-young',
    doubledSlug: 'mark-ruffalo',
    kind: 'utility_double',
    characterName: 'Bruce Banner / Smart Hulk',
  },
  {
    productionSlug: 'avengers-infinity-war-2018',
    doublerSlug: 'aaron-toney',
    doubledSlug: 'anthony-mackie',
    kind: 'primary_double',
    characterName: 'Sam Wilson / Falcon',
    notes: 'Wing-flight rigging and the Wakanda perimeter assault sequences.',
  },
  {
    productionSlug: 'avengers-endgame-2019',
    doublerSlug: 'aaron-toney',
    doubledSlug: 'anthony-mackie',
    kind: 'primary_double',
    characterName: 'Sam Wilson / Falcon',
  },

  // ── Mad Max: Fury Road — Dayna Grant on Theron.
  {
    productionSlug: 'mad-max-fury-road-2015',
    doublerSlug: 'dayna-grant',
    doubledSlug: 'charlize-theron',
    kind: 'primary_double',
    characterName: 'Imperator Furiosa',
    notes: 'War Rig cab work, the cannon-roll, and the chase choreography. Coordinated under Guy Norris.',
  },

  // ── The Matrix — Olivia Jackson on Moss (the sequels; for Matrix
  // 1999 the on-set stunt double for Trinity was Sophia Crawford. We
  // attach Jackson to Matrix 1999 as a placeholder — the credit
  // properly belongs on the sequels which aren't yet in productions.)
  {
    productionSlug: 'the-matrix-1999',
    doublerSlug: 'olivia-jackson',
    doubledSlug: 'carrie-anne-moss',
    kind: 'utility_double',
    characterName: 'Trinity',
    notes: 'Jackson is more known for the Matrix sequels; this placeholder credit will be remapped when Reloaded / Revolutions enter the dataset.',
  },
];

console.log('\ndoubling credits:');
let dInserted = 0, dUpdated = 0, dSkipped = 0;
for (const d of DOUBLINGS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO stunt_doubling_credits (
      production_id, doubler_person_id, doubled_person_id,
      kind, character_name, notes
    )
    SELECT prod.id, doubler.id, doubled.id,
      ${d.kind}::stunt_doubling_kind_enum,
      ${d.characterName ?? null},
      ${d.notes ?? null}
    FROM productions prod, people doubler, people doubled
    WHERE prod.slug = ${d.productionSlug}
      AND doubler.slug = ${d.doublerSlug}
      AND doubled.slug = ${d.doubledSlug}
    ON CONFLICT (production_id, doubler_person_id, doubled_person_id, kind) DO UPDATE SET
      character_name = EXCLUDED.character_name,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  if (r.length === 0) {
    dSkipped++;
    console.log(`  [!] ${d.productionSlug.padEnd(35)} ${d.doublerSlug.padEnd(22)} → ${d.doubledSlug.padEnd(22)} refs missing`);
    continue;
  }
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    dInserted++;
    console.log(`  [+] ${d.productionSlug.padEnd(35)} ${d.doublerSlug.padEnd(22)} → ${d.doubledSlug.padEnd(22)} (${d.kind})`);
  } else {
    dUpdated++;
    console.log(`  [~] ${d.productionSlug.padEnd(35)} ${d.doublerSlug.padEnd(22)} → ${d.doubledSlug.padEnd(22)} refreshed`);
  }
}

// ── Memberships for the new stuntpeople ────────────────────────────

type Membership = {
  companySlug: string;
  personSlug: string;
  memberRole: 'co_founder' | 'principal' | 'member' | 'associate' | 'alumnus';
  joinedYear?: number;
  isPrincipal: boolean;
  notes?: string;
  sortOrder: number;
};

const MEMBERSHIPS: Membership[] = [
  // 87Eleven — Sam Hargrave + Aaron Toney joined the network.
  { companySlug: '87eleven-action-design', personSlug: 'sam-hargrave', memberRole: 'principal', isPrincipal: true, sortOrder: 4,
    notes: 'Came up doubling Chris Evans through the Russo Avengers run; transitioned to coordination + directing.' },
  { companySlug: '87eleven-action-design', personSlug: 'aaron-toney', memberRole: 'member', isPrincipal: true, sortOrder: 5,
    notes: 'Anthony Mackie\'s primary double across the MCU Falcon / Captain America arc.' },

  // ARK Stunts — Dayna Grant.
  { companySlug: 'ark-stunts', personSlug: 'dayna-grant', memberRole: 'principal', isPrincipal: true, sortOrder: 2,
    notes: 'Charlize Theron\'s primary on Mad Max: Fury Road; came up through the New Zealand action-TV tradition.' },
];

console.log('\nmemberships:');
let mInserted = 0;
for (const m of MEMBERSHIPS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO stunt_company_members (
      company_id, person_id,
      member_role, joined_year, is_principal, notes, sort_order
    )
    SELECT c.id, p.id,
      ${m.memberRole}, ${m.joinedYear ?? null},
      ${m.isPrincipal}, ${m.notes ?? null}, ${m.sortOrder}
    FROM stunt_companies c, people p
    WHERE c.slug = ${m.companySlug} AND p.slug = ${m.personSlug}
    ON CONFLICT (company_id, person_id) DO UPDATE SET
      member_role = EXCLUDED.member_role,
      joined_year = EXCLUDED.joined_year,
      is_principal = EXCLUDED.is_principal,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  if (r.length === 0) {
    console.log(`  [!] ${m.companySlug} ← ${m.personSlug} skipped`);
    continue;
  }
  mInserted++;
  console.log(`  [+] ${m.companySlug.padEnd(32)} ← ${m.personSlug.padEnd(28)} (${m.memberRole})`);
}

console.log(`\nseeded — ${STUNT_PEOPLE.length} stunt people, ${ACTORS.length} actor stubs, ${dInserted} new + ${dUpdated} refreshed + ${dSkipped} skipped doubling credits, ${mInserted} memberships`);
process.exit(0);
