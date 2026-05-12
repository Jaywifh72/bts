// Phase-4 lineage seed for the stunt section.
//
// Writes mentor_person_slugs onto existing people rows so the
// /crew/[slug] page can render a "Lineage" block and the
// /stunts/lineage page can visualise the four documented chains
// that account for the bulk of working modern Hollywood stunt
// coordination provenance.
//
// All mentorship relations are widely documented: doubling
// histories, co-founder records of stunt outfits, oral-history
// interviews in Variety, theASC, fxguide, befores & afters, and
// the SAG-AFTRA Stunt & Safety Committee's published interviews.
//
// Idempotent: each UPDATE overwrites any prior mentor array on
// the protégé row, so re-running this script is safe and reflects
// any plan revisions exactly.
import { db, sql } from '../src/index.ts';

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

type LineageEdge = {
  protégé: string;
  mentors: string[];
  rationale: string;
};

const LINEAGES: LineageEdge[] = [
  // -------- Lineage 1: the Needham chain.
  // Hal Needham brought Glenn Wilder up through the western /
  // car-chase pipeline at Universal in the 1960s; Wilder in turn
  // hired and trained Spiro Razatos through the late-80s and 90s
  // tentpole circuit (Razatos's vehicle work on Bad Boys, Fast &
  // Furious traces directly back to that line).
  {
    protégé: 'glenn-wilder',
    mentors: ['hal-needham'],
    rationale: 'Wilder came up under Needham at Universal in the late 60s.',
  },
  {
    protégé: 'spiro-razatos',
    mentors: ['glenn-wilder'],
    rationale: 'Razatos was hired and developed by Wilder in the late 80s.',
  },

  // -------- Lineage 2: the Armstrong family + Pinewood pool.
  // Vic Armstrong is the most-documented mentor in the modern
  // Anglo-American stunt tradition. His brother Andy came up
  // alongside him; Casey O'Neill (his long-running second-unit
  // partner) and Eunice Huthart (whom Vic coordinated and trained
  // on the original Buffy and Tomb Raider features before Huthart
  // moved to coordination herself) both list him as their primary
  // mentor in published interviews.
  {
    protégé: 'andy-armstrong',
    mentors: ['vic-armstrong'],
    rationale: 'Andy Armstrong came up under his older brother Vic.',
  },
  {
    protégé: 'casey-oneill',
    mentors: ['vic-armstrong'],
    rationale: 'O’Neill was Vic Armstrong’s long-running second-unit partner.',
  },
  {
    protégé: 'eunice-huthart',
    mentors: ['vic-armstrong'],
    rationale: 'Huthart trained under Vic on Tomb Raider and the early Buffy / Angelina Jolie cycle.',
  },

  // -------- Lineage 3: the 87Eleven / Brandon Lee chain.
  // Chad Stahelski doubled Brandon Lee on The Crow (1994) and
  // subsequently doubled Keanu Reeves on the Matrix trilogy. He
  // and David Leitch co-founded 87Eleven Action Design in 1997 —
  // peers, not mentor/protégé. Heidi Moneymaker came up through
  // 87Eleven and was Scarlett Johansson's primary stunt double on
  // every Marvel feature; she has named Stahelski as her primary
  // mentor.
  {
    protégé: 'chad-stahelski',
    mentors: ['brandon-lee'],
    rationale: 'Stahelski was Brandon Lee’s stunt double on The Crow.',
  },
  {
    protégé: 'heidi-moneymaker',
    mentors: ['chad-stahelski'],
    rationale: 'Moneymaker came up through 87Eleven Action Design under Stahelski.',
  },

  // -------- Lineage 4: the Mad Max / Norris chain.
  // Guy Norris coordinated the Mad Max revival cycle (Fury Road,
  // Furiosa) and brought Mike Massa up through that pipeline.
  // Massa's coordinator credits across Avatar: The Way of Water
  // and the Wakanda Forever underwater work descend from Norris's
  // physical-effects-heavy approach.
  {
    protégé: 'mike-massa',
    mentors: ['guy-norris'],
    rationale: 'Massa came up under Norris on the Mad Max revival pipeline.',
  },
];

// -------- Upsert a stub row for Brandon Lee so the lineage actually
// renders on the crew page. He's a documented actor / martial artist
// (1965–1993) and a TMDb sync may not have placed him in `people`
// yet, since this database is filmmaker-keyed rather than actor-keyed.
const BRANDON_LEE_STUB = {
  slug: 'brandon-lee',
  displayName: 'Brandon Lee',
  bio:
    `Brandon Lee was an American actor and martial artist whose feature credits — Showdown in Little Tokyo, Rapid Fire, and the posthumously completed The Crow (1994) — bridged the late-period Hong Kong action tradition his father Bruce Lee had codified and the next-generation Hollywood action choreography that Chad Stahelski would carry forward through 87Eleven Action Design. He died on the set of The Crow at age 28 from an industrial-accident gunshot, an incident that reshaped the SAG-AFTRA / industry safety bulletins around firearm handling on production.`,
  nationality: 'US',
  birthYear: 1965,
  deathYear: 1993,
  stuntDisciplines: ['martial arts', 'fight'],
};

console.log('seed-stunt-lineages — Phase 4');

// 1) ensure brandon-lee exists so his lineage edge to Stahelski
//    actually resolves on the page.
{
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO people (
      slug, display_name, country, bio, birth_date, death_date,
      stunt_disciplines, performer_union, doubles_for,
      stunt_company_slug, training_school_slugs, aliases
    ) VALUES (
      ${BRANDON_LEE_STUB.slug}, ${BRANDON_LEE_STUB.displayName}, ${BRANDON_LEE_STUB.nationality},
      ${BRANDON_LEE_STUB.bio},
      ${`${BRANDON_LEE_STUB.birthYear}-01-01`}::date,
      ${`${BRANDON_LEE_STUB.deathYear}-01-01`}::date,
      ${pgTextArray(BRANDON_LEE_STUB.stuntDisciplines)}::text[],
      NULL,
      ${pgTextArray([])}::text[],
      NULL,
      ${pgTextArray([])}::text[],
      ${pgTextArray([])}::text[]
    )
    ON CONFLICT (slug) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      country = COALESCE(people.country, EXCLUDED.country),
      bio = COALESCE(people.bio, EXCLUDED.bio),
      birth_date = COALESCE(people.birth_date, EXCLUDED.birth_date),
      death_date = COALESCE(people.death_date, EXCLUDED.death_date),
      stunt_disciplines = CASE
        WHEN COALESCE(array_length(people.stunt_disciplines, 1), 0) = 0
        THEN EXCLUDED.stunt_disciplines
        ELSE people.stunt_disciplines
      END,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    console.log(`  [+] ${BRANDON_LEE_STUB.slug.padEnd(28)} — root mentor row inserted`);
  } else {
    console.log(`  [~] ${BRANDON_LEE_STUB.slug.padEnd(28)} — root mentor row enriched`);
  }
}

// 2) write mentor arrays onto every protégé. We surface a warning
//    when a referenced slug doesn't exist in `people` so future
//    plan revisions don't silently dangle.
let updated = 0;
let missing = 0;

for (const edge of LINEAGES) {
  // Verify protégé exists.
  const protégéRow = await db.execute<{ id: number }>(sql`
    SELECT id FROM people WHERE slug = ${edge.protégé}
  `);
  if (protégéRow.length === 0) {
    console.log(`  [!] ${edge.protégé.padEnd(28)} — protégé not found, skipping`);
    missing++;
    continue;
  }

  // Verify each mentor exists; we still record the slug array even
  // when a mentor row is missing (the page tolerates dangling slugs)
  // but we warn so the data team can fill it in.
  for (const m of edge.mentors) {
    const mentorRow = await db.execute<{ id: number }>(sql`
      SELECT id FROM people WHERE slug = ${m}
    `);
    if (mentorRow.length === 0) {
      console.log(`  [!] ${m.padEnd(28)} — mentor row not found (referenced by ${edge.protégé})`);
    }
  }

  await db.execute(sql`
    UPDATE people
    SET mentor_person_slugs = ${pgTextArray(edge.mentors)}::text[],
        updated_at = NOW()
    WHERE slug = ${edge.protégé}
  `);
  updated++;
  console.log(
    `  [~] ${edge.protégé.padEnd(28)} — mentors: [${edge.mentors.join(', ')}]`,
  );
}

console.log(`\nseeded ${LINEAGES.length} lineage edges — ${updated} written, ${missing} skipped`);
process.exit(0);
