// Phase-8 seed: stunt-company memberships + production-specific
// doubling credits.
//
// Memberships place existing stunt-people rows into their companies,
// surfacing the "prominent members" list on the company detail page.
// Doubling credits record the documented doubler ↔ doubled-actor ↔
// production triples that turn the abstract "X doubled Y" into a
// concrete production record.
//
// Idempotent on (company_id, person_id) for memberships and on
// (production_id, doubler_person_id, doubled_person_id, kind) for
// doubling credits — re-running refreshes the editorial pass.
//
// For doubled actors who aren't yet in people (most major stars
// are, since people is populated by TMDb crew sync but actors are
// only present when they also have crew credits), we insert stub
// rows. The bio + birth year are widely-published facts.
import { db, sql } from '../src/index.ts';

// ── Actor stubs ─────────────────────────────────────────────────────

type ActorStub = {
  slug: string;
  displayName: string;
  birthYear: number;
  nationality: string;
  bio: string;
};

const ACTOR_STUBS: ActorStub[] = [
  {
    slug: 'keanu-reeves',
    displayName: 'Keanu Reeves',
    birthYear: 1964,
    nationality: 'CA',
    bio:
      'Canadian actor whose career spans Bill & Ted, Speed, the Matrix trilogy, the John Wick franchise, and Constantine. His long collaboration with stunt coordinator Chad Stahelski — who first doubled him on the Matrix — produced the practical-action language that defines John Wick.',
  },
  {
    slug: 'uma-thurman',
    displayName: 'Uma Thurman',
    birthYear: 1970,
    nationality: 'US',
    bio:
      'American actress whose career includes Pulp Fiction, Kill Bill, and Gattaca. Her Kill Bill stunt work is among the most physically extensive lead-actress doubling pipelines on the open record, with Zoë Bell as her primary double across both volumes.',
  },
  {
    slug: 'scarlett-johansson',
    displayName: 'Scarlett Johansson',
    birthYear: 1984,
    nationality: 'US',
    bio:
      'American actress with extensive stunt-coordinated work across her Marvel Cinematic Universe run (Iron Man 2, the Avengers cycle, Black Widow). Her primary stunt double across the run was Heidi Moneymaker, working through 87Eleven Action Design.',
  },
];

console.log('seed-stunt-memberships-doubling — Phase 8');
console.log('\nactor stubs:');

for (const a of ACTOR_STUBS) {
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
  if (row.created_at === row.updated_at) {
    console.log(`  [+] ${a.slug.padEnd(28)} — new actor row`);
  } else {
    console.log(`  [~] ${a.slug.padEnd(28)} — existing row enriched`);
  }
}

// ── Memberships ────────────────────────────────────────────────────

type Membership = {
  companySlug: string;
  personSlug: string;
  memberRole: 'co_founder' | 'principal' | 'member' | 'associate' | 'alumnus';
  joinedYear?: number;
  leftYear?: number;
  isPrincipal: boolean;
  notes?: string;
  sortOrder: number;
};

const MEMBERSHIPS: Membership[] = [
  // 87Eleven Action Design — co-founded 1997 by Stahelski + Leitch.
  { companySlug: '87eleven-action-design', personSlug: 'chad-stahelski', memberRole: 'co_founder', joinedYear: 1997, isPrincipal: true, sortOrder: 1 },
  { companySlug: '87eleven-action-design', personSlug: 'david-leitch', memberRole: 'co_founder', joinedYear: 1997, isPrincipal: true, sortOrder: 2 },
  { companySlug: '87eleven-action-design', personSlug: 'heidi-moneymaker', memberRole: 'principal', joinedYear: 2008, isPrincipal: true, sortOrder: 3,
    notes: 'Came up through 87Eleven; doubled Scarlett Johansson across the entire MCU run.' },

  // Vic Armstrong Action Vehicles — Vic's outfit at Pinewood.
  { companySlug: 'action-vehicles', personSlug: 'vic-armstrong', memberRole: 'co_founder', isPrincipal: true, sortOrder: 1 },
  { companySlug: 'action-vehicles', personSlug: 'andy-armstrong', memberRole: 'associate', isPrincipal: true, sortOrder: 2,
    notes: 'Vic\'s younger brother and frequent second-unit collaborator.' },
  { companySlug: 'action-vehicles', personSlug: 'casey-oneill', memberRole: 'associate', isPrincipal: true, sortOrder: 3,
    notes: 'Long-running second-unit partner across Vic Armstrong\'s coordinator credits.' },

  // Stunts Unlimited — historic peer-elected outfit.
  { companySlug: 'stunts-unlimited', personSlug: 'hal-needham', memberRole: 'alumnus', leftYear: 2013, isPrincipal: true, sortOrder: 1,
    notes: 'Founder-era member; transitioned to directing before his death in 2013.' },
  { companySlug: 'stunts-unlimited', personSlug: 'glenn-wilder', memberRole: 'principal', isPrincipal: true, sortOrder: 2 },
  { companySlug: 'stunts-unlimited', personSlug: 'spiro-razatos', memberRole: 'principal', isPrincipal: true, sortOrder: 3,
    notes: 'Picture-car coordinator across Bad Boys, Fast & Furious, Marvel.' },

  // Stuntmen's Association of Motion Pictures — historic guild.
  { companySlug: 'stuntmens-association', personSlug: 'jeannie-epper', memberRole: 'principal', isPrincipal: true, sortOrder: 1,
    notes: 'Doubled Lynda Carter on the original Wonder Woman TV series; Epper-family stunt dynasty.' },
  { companySlug: 'stuntmens-association', personSlug: 'hal-needham', memberRole: 'alumnus', leftYear: 2013, isPrincipal: false, sortOrder: 4 },

  // ARK Stunts — Guy Norris's Australia-based outfit.
  { companySlug: 'ark-stunts', personSlug: 'guy-norris', memberRole: 'co_founder', isPrincipal: true, sortOrder: 1,
    notes: 'Coordinator on Mad Max: Fury Road and Furiosa; the spine of modern Australian action.' },
];

console.log('\nmemberships:');

let mInserted = 0, mUpdated = 0;
for (const m of MEMBERSHIPS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO stunt_company_members (
      company_id, person_id,
      member_role, joined_year, left_year, is_principal, notes, sort_order
    )
    SELECT c.id, p.id,
      ${m.memberRole}, ${m.joinedYear ?? null}, ${m.leftYear ?? null},
      ${m.isPrincipal}, ${m.notes ?? null}, ${m.sortOrder}
    FROM stunt_companies c, people p
    WHERE c.slug = ${m.companySlug} AND p.slug = ${m.personSlug}
    ON CONFLICT (company_id, person_id) DO UPDATE SET
      member_role = EXCLUDED.member_role,
      joined_year = EXCLUDED.joined_year,
      left_year = EXCLUDED.left_year,
      is_principal = EXCLUDED.is_principal,
      notes = EXCLUDED.notes,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  if (r.length === 0) {
    console.log(`  [!] ${m.companySlug} ← ${m.personSlug} — company or person not found, skipped`);
    continue;
  }
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    mInserted++;
    console.log(`  [+] ${m.companySlug.padEnd(32)} ← ${m.personSlug.padEnd(28)} (${m.memberRole}${m.isPrincipal ? ', principal' : ''})`);
  } else {
    mUpdated++;
    console.log(`  [~] ${m.companySlug.padEnd(32)} ← ${m.personSlug.padEnd(28)} refreshed`);
  }
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
  // Chad Stahelski → Keanu Reeves on The Matrix (1999).
  // Stahelski had previously doubled Brandon Lee on The Crow; on
  // the Matrix he doubled Reeves and stayed on as his primary
  // double through the trilogy and beyond. The collaboration led
  // directly to John Wick.
  {
    productionSlug: 'the-matrix-1999',
    doublerSlug: 'chad-stahelski',
    doubledSlug: 'keanu-reeves',
    kind: 'primary_double',
    characterName: 'Neo',
    notes: 'The bullet-time fight choreography was rehearsed with Stahelski performing every beat at full speed before Reeves stepped into the slow-shutter takes.',
  },

  // David Leitch → Brad Pitt on Fight Club (1999). Leitch went on
  // to double Pitt across Mr. & Mrs. Smith, Ocean\'s Eleven /
  // Twelve / Thirteen, and Troy.
  {
    productionSlug: 'fight-club-1999',
    doublerSlug: 'david-leitch',
    doubledSlug: 'brad-pitt',
    kind: 'fight_double',
    characterName: 'Tyler Durden',
    notes: 'Leitch\'s long doubling collaboration with Pitt began on Fight Club and continued for fifteen years.',
  },

  // Zoë Bell → Uma Thurman on Kill Bill. Bell was Lucy Lawless\'s
  // double on Xena before becoming Thurman\'s primary double on
  // both Kill Bill volumes; Tarantino later cast her in
  // Death Proof in a leading role.
  {
    productionSlug: 'kill-bill-vol-1-2003',
    doublerSlug: 'zoe-bell',
    doubledSlug: 'uma-thurman',
    kind: 'primary_double',
    characterName: 'The Bride / Beatrix Kiddo',
    notes: 'Bell performed the entire House of Blue Leaves fight choreography opposite the Crazy 88, plus the Pai Mei training sequences.',
  },
  {
    productionSlug: 'kill-bill-the-whole-bloody-affair-2011',
    doublerSlug: 'zoe-bell',
    doubledSlug: 'uma-thurman',
    kind: 'primary_double',
    characterName: 'The Bride / Beatrix Kiddo',
  },

  // Heidi Moneymaker → Scarlett Johansson across the Marvel run.
  // Moneymaker was Black Widow\'s stunt double from Iron Man 2
  // through Black Widow; the collaboration is one of the longest
  // primary-double pipelines in MCU production history.
  {
    productionSlug: 'avengers-infinity-war-2018',
    doublerSlug: 'heidi-moneymaker',
    doubledSlug: 'scarlett-johansson',
    kind: 'primary_double',
    characterName: 'Black Widow / Natasha Romanoff',
    notes: 'Coordinated through 87Eleven Action Design; Moneymaker is on screen for most of the Wakanda-battle close-quarters work.',
  },
  {
    productionSlug: 'avengers-endgame-2019',
    doublerSlug: 'heidi-moneymaker',
    doubledSlug: 'scarlett-johansson',
    kind: 'primary_double',
    characterName: 'Black Widow / Natasha Romanoff',
    notes: 'The Vormir cliff sequence — Moneymaker performed the rigged fall on a decelerator system.',
  },
];

console.log('\ndoubling credits:');

let dInserted = 0, dUpdated = 0;
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
    console.log(`  [!] ${d.productionSlug} :: ${d.doublerSlug} → ${d.doubledSlug} — refs missing, skipped`);
    continue;
  }
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    dInserted++;
    console.log(`  [+] ${d.productionSlug.padEnd(40)} ${d.doublerSlug.padEnd(20)} → ${d.doubledSlug.padEnd(22)} (${d.kind})`);
  } else {
    dUpdated++;
    console.log(`  [~] ${d.productionSlug.padEnd(40)} ${d.doublerSlug.padEnd(20)} → ${d.doubledSlug.padEnd(22)} refreshed`);
  }
}

console.log(`\nseeded — ${ACTOR_STUBS.length} actor stubs, ${mInserted} new + ${mUpdated} refreshed memberships, ${dInserted} new + ${dUpdated} refreshed doubling credits`);
process.exit(0);
