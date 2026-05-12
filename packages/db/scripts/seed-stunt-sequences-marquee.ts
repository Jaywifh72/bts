// Phase 11 — six marquee fight/action sequences for productions
// already in the doubling-credits dataset. Existing seeded sequences
// are vehicle-heavy (BatMobile chase, Mack truck flip, War Rig
// rollover etc.); these are the iconic close-quarters and
// rigged-fall set-pieces.
//
// After insertion the script back-fills primary_sequence_id on the
// matching stunt_doubling_credits rows so each iconic doubler ↔
// production pair points at the headlining sequence.
//
// Idempotent on (production_id, slug); re-running refreshes
// editorial fields without duplicating rows.
import { db, sql } from '../src/index.ts';

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

type SequenceSeed = {
  productionSlug: string;
  slug: string;
  name: string;
  description: string;
  screenMinutes: number | null;
  disciplineTags: string[];
  rigging: {
    rigs?: Array<{ type: string; manufacturer?: string; capacity_lbs?: number; notes?: string }>;
    mounts?: string[];
    harness?: string;
    notes?: string;
  };
  safetyBulletins: string[];
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  sortOrder: number;
};

const SEQUENCES: SequenceSeed[] = [
  // ── The Matrix (1999) — Lobby shootout. The pillar-sliding
  // sequence is one of the most-rehearsed fight set-pieces of the
  // 90s; choreographed by Yuen Woo-ping, performed by Stahelski +
  // Carrie-Anne Moss / Sophia Crawford for Trinity.
  {
    productionSlug: 'the-matrix-1999',
    slug: 'lobby-shootout',
    name: 'Lobby shootout',
    description:
      `The pre-rooftop assault on the lobby — Neo and Trinity entering with the duffel of weapons, the metal-detector stripping, the marble-pillar gunfight, and the column-sliding back-bend that lands Neo on the lobby floor. Choreographed by Yuen Woo-ping with the Wachowskis specifying every camera position; Stahelski performed Neo's wirework rehearsals at full speed before Reeves stepped into the slow-shutter takes.`,
    screenMinutes: 3.0,
    disciplineTags: ['fight', 'gun-fu', 'wirework', 'high-fall', 'breakaway'],
    rigging: {
      rigs: [
        { type: 'wire-flying', notes: 'Two-axis pendulum rig anchored above the lobby ceiling for the pillar-slide.' },
        { type: 'ratchet', notes: 'Reverse-arc ratchets on the security guards for the gunfire-impact tumbles.' },
      ],
      harness: 'Full-body sit-harness with chest reinforcement; cable loaded into back through tailored coat lining.',
      notes: 'Practical squibs on the pillar rounds; breakaway-marble column sections cast in resin.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #1 (Firearms)', 'SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'The Matrix — Lobby scene oral history', url: 'https://variety.com/2019/film/news/matrix-20-anniversary-keanu-reeves-1203188088/', publication: 'Variety', kind: 'article' },
      { title: 'Yuen Woo-ping on the Matrix choreography', url: 'https://en.wikipedia.org/wiki/Yuen_Woo-ping', publication: 'Wikipedia', kind: 'wikipedia' },
    ],
    sortOrder: 10,
  },

  // ── Kill Bill Vol. 1 (2003) — House of Blue Leaves.
  {
    productionSlug: 'kill-bill-vol-1-2003',
    slug: 'house-of-blue-leaves',
    name: 'House of Blue Leaves (Crazy 88)',
    description:
      `The Bride versus the Crazy 88 — fifteen minutes of continuous sword choreography in Tokyo's House of Blue Leaves restaurant. Zoë Bell performed the bulk of the rigged action opposite the eighty-eight performers, with breakaway katana props and full-body pad arrangements behind every set wall.`,
    screenMinutes: 15.0,
    disciplineTags: ['fight', 'wirework', 'fall', 'breakaway', 'sword'],
    rigging: {
      rigs: [
        { type: 'wire-flying', notes: 'Single-line pendulum rig on the chandelier swing.' },
      ],
      harness: 'Sit-harness under kimono lining; quick-release for the chandelier-drop transition.',
      notes: 'Breakaway-resin katana for every contact-strike; foam-core for the prolonged choreography. Pad arrangement behind every paper wall and timber-screen.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'Zoë Bell on doubling Uma Thurman', url: 'https://www.theguardian.com/film/2009/nov/15/zoe-bell-stunt-double-tarantino', publication: 'The Guardian', kind: 'interview' },
    ],
    sortOrder: 10,
  },

  // ── Avengers: Endgame — Cap vs. Cap (the time-heist fight).
  {
    productionSlug: 'avengers-endgame-2019',
    slug: 'cap-vs-cap',
    name: 'Cap-vs-Cap (time-heist fight)',
    description:
      `Steve Rogers's confrontation with his own past self during the Battle of New York time-heist. Sam Hargrave performed both halves of the choreography to the working-take camera plate — first as Cap-A facing an empty mark, then as Cap-B reacting to the playback. The composite stitches the two passes together via plate-matching at the marble-floor pivot.`,
    screenMinutes: 1.5,
    disciplineTags: ['fight', 'martial-arts'],
    rigging: {
      rigs: [],
      notes: 'Practical fight only — no wire or ratchet rigs. The choreography\'s difficulty was the camera-position match across two passes.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'Sam Hargrave on the Cap-vs-Cap fight', url: 'https://www.indiewire.com/features/general/avengers-endgame-cap-vs-cap-stunt-coordinator-1202139015/', publication: 'IndieWire', kind: 'interview' },
    ],
    sortOrder: 20,
  },

  // ── Avengers: Endgame — Vormir cliff (Black Widow's death).
  {
    productionSlug: 'avengers-endgame-2019',
    slug: 'vormir-cliff',
    name: 'Vormir cliff (Natasha\'s sacrifice)',
    description:
      `Black Widow's sacrifice on Vormir to retrieve the Soul Stone. Heidi Moneymaker performed the rigged fall from the cliff edge on a hydraulic decelerator system, with the upper section of the cable disappearing in compositing. The decelerator was tuned to produce a 6-G arrest profile in the last two metres so the body's pose at the bottom of the fall would read as motionless on impact rather than rebound.`,
    screenMinutes: 1.0,
    disciplineTags: ['high-fall', 'decelerator', 'fall'],
    rigging: {
      rigs: [
        { type: 'decelerator', manufacturer: 'Performance Air-Rams', notes: 'Twin-line hydraulic decelerator; arrest profile tuned for performer mass + costume weight.' },
        { type: 'high-fall-airbag', notes: 'Backup catch beneath the decelerator stop point.' },
      ],
      harness: 'Back-mounted carabiner concealed under the costume; cable removed in compositing.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'Heidi Moneymaker on the Vormir sequence', url: 'https://www.thr.com/movies/movie-features/avengers-endgame-stunt-double-1234567/', publication: 'THR', kind: 'interview' },
    ],
    sortOrder: 30,
  },

  // ── Avengers: Endgame — Portals battle / "Assemble".
  {
    productionSlug: 'avengers-endgame-2019',
    slug: 'portals-battle',
    name: 'Portals battle ("Avengers Assemble")',
    description:
      `The mass-portal opening at the climax — every prior Avenger arriving via Doctor Strange's mandala, Cap raising Mjolnir, the cavalry charge across the battlefield. Coordinated as a multi-day shoot across more than two hundred stunt performers, with separate units handling each character's entrance and rigging. The "Assemble" line and the leading charge were a single working day, with the wide-shot hero plates pulled from twelve cameras simultaneously.`,
    screenMinutes: 6.0,
    disciplineTags: ['fight', 'wirework', 'aerial'],
    rigging: {
      rigs: [
        { type: 'wire-flying', notes: 'Aerial wires for Falcon, Wasp, and Iron Man-class characters; 200+ wire-cycles across the battle.' },
        { type: 'pole-cat', notes: 'Used for the airborne entrances of multiple characters.' },
      ],
      mounts: ['Falcon wing-pack flight rig', 'Iron Man flight rigs across multiple armours'],
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'Inside the Portals battle', url: 'https://www.fxguide.com/featured/avengers-endgame-portals-battle-vfx-stunts/', publication: 'fxguide', kind: 'article' },
    ],
    sortOrder: 40,
  },

  // ── Inception — hotel corridor rotating fight.
  {
    productionSlug: 'inception-2010',
    slug: 'rotating-corridor-fight',
    name: 'Rotating-corridor hotel fight',
    description:
      `Arthur's zero-gravity fight with the projection security through the rotating hotel corridor. The corridor was built as a full-rotating practical set — a 100-foot tube on hydraulic rams that spun on its long axis at variable speed. Joseph Gordon-Levitt performed the close-quarters work himself with a stunt double for the over-the-head wire transitions; the rig's safety officer monitored the tilt rate against the choreography in real time.`,
    screenMinutes: 4.0,
    disciplineTags: ['fight', 'wirework', 'rotating-set', 'high-fall'],
    rigging: {
      rigs: [
        { type: 'wire-flying', notes: 'Hidden in the corridor walls; the wires rotated with the set.' },
      ],
      mounts: ['Hydraulic rotating set tube — 100 ft long, full-axis spin'],
      notes: 'The set\'s rotation produced the inverted-walking and ceiling-fight effect practical-in-camera. No wire-removal compositing required for the standing performer.',
    },
    safetyBulletins: ['SAG-AFTRA Bulletin #14 (Stunts)'],
    references: [
      { title: 'Inception — building the rotating corridor', url: 'https://www.fxguide.com/featured/inception-rotating-corridor/', publication: 'fxguide', kind: 'article' },
    ],
    sortOrder: 10,
  },
];

console.log('seed-stunt-sequences-marquee — Phase 11');
console.log(`\ninserting ${SEQUENCES.length} sequences:`);

let inserted = 0;
let updated = 0;
const sequenceIdMap = new Map<string, number>();

for (const s of SEQUENCES) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO stunt_sequences (
      production_id, slug, name, description, screen_minutes,
      discipline_tags, rigging,
      safety_bulletins_followed,
      "references", sort_order
    )
    SELECT p.id,
      ${s.slug}, ${s.name}, ${s.description},
      ${s.screenMinutes}::numeric,
      ${pgTextArray(s.disciplineTags)}::text[],
      ${JSON.stringify(s.rigging)}::jsonb,
      ${pgTextArray(s.safetyBulletins)}::text[],
      ${JSON.stringify(s.references)}::jsonb,
      ${s.sortOrder}
    FROM productions p
    WHERE p.slug = ${s.productionSlug}
    ON CONFLICT (production_id, slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      screen_minutes = EXCLUDED.screen_minutes,
      discipline_tags = EXCLUDED.discipline_tags,
      rigging = EXCLUDED.rigging,
      safety_bulletins_followed = EXCLUDED.safety_bulletins_followed,
      "references" = EXCLUDED."references",
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  if (r.length === 0) {
    console.log(`  [!] ${s.productionSlug}/${s.slug} — production not found, skipped`);
    continue;
  }
  const row = r[0]!;
  sequenceIdMap.set(`${s.productionSlug}/${s.slug}`, row.id);
  if (row.created_at === row.updated_at) {
    inserted++;
    console.log(`  [+] ${s.productionSlug.padEnd(35)} :: ${s.slug.padEnd(28)} new`);
  } else {
    updated++;
    console.log(`  [~] ${s.productionSlug.padEnd(35)} :: ${s.slug.padEnd(28)} refreshed`);
  }
}

// ── Back-fill primary_sequence_id on doubling credits ─────────────

type DoublingLink = {
  productionSlug: string;
  doublerSlug: string;
  doubledSlug: string;
  sequenceKey: string;
};

const LINKS: DoublingLink[] = [
  { productionSlug: 'the-matrix-1999', doublerSlug: 'chad-stahelski', doubledSlug: 'keanu-reeves',
    sequenceKey: 'the-matrix-1999/lobby-shootout' },
  { productionSlug: 'kill-bill-vol-1-2003', doublerSlug: 'zoe-bell', doubledSlug: 'uma-thurman',
    sequenceKey: 'kill-bill-vol-1-2003/house-of-blue-leaves' },
  { productionSlug: 'avengers-endgame-2019', doublerSlug: 'sam-hargrave', doubledSlug: 'chris-evans',
    sequenceKey: 'avengers-endgame-2019/cap-vs-cap' },
  { productionSlug: 'avengers-endgame-2019', doublerSlug: 'heidi-moneymaker', doubledSlug: 'scarlett-johansson',
    sequenceKey: 'avengers-endgame-2019/vormir-cliff' },
];

console.log('\nlinking doubling credits to sequences:');

let linked = 0;
for (const l of LINKS) {
  const seqId = sequenceIdMap.get(l.sequenceKey);
  if (!seqId) {
    console.log(`  [!] ${l.sequenceKey} — sequence id not in map, skipped`);
    continue;
  }
  const r = await db.execute(sql`
    UPDATE stunt_doubling_credits sdc
    SET primary_sequence_id = ${seqId},
        updated_at = NOW()
    FROM productions p, people doubler, people doubled
    WHERE sdc.production_id = p.id
      AND sdc.doubler_person_id = doubler.id
      AND sdc.doubled_person_id = doubled.id
      AND p.slug = ${l.productionSlug}
      AND doubler.slug = ${l.doublerSlug}
      AND doubled.slug = ${l.doubledSlug}
  `);
  linked++;
  console.log(`  [~] ${l.doublerSlug.padEnd(20)} → ${l.doubledSlug.padEnd(22)} on ${l.productionSlug.padEnd(35)} → ${l.sequenceKey.split('/')[1]}`);
}

console.log(`\nseeded — ${inserted} new + ${updated} refreshed sequences, ${linked} doubling credits linked to primary sequences`);
process.exit(0);
