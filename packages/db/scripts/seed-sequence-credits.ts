// Phase 12 — sequence credits for the 6 marquee sequences seeded
// in Phase 11 (which all currently have zero credits).
//
// Each credit ties a person to a sequence with a role; the
// `doubling_for_person_id` column lets a "double" credit point at
// the actor being doubled, so the sequence detail page can render
// "Heidi Moneymaker doubled Scarlett Johansson" inline.
//
// Idempotent: ON CONFLICT (sequence_id, person_id, role) DO UPDATE.
// Skips rows where the referenced person doesn't exist (no SQL error).
import { db, sql } from '../src/index.ts';

type CreditSeed = {
  productionSlug: string;
  sequenceSlug: string;
  personSlug: string;
  /** 'coordinator' | '2nd_unit_director' | 'performer' | 'double'
      | 'rigger' | 'safety' | 'precision_driver' | 'fight_choreographer' */
  role: string;
  doublingForSlug?: string;
  notes?: string;
  sortOrder: number;
};

const CREDITS: CreditSeed[] = [
  // ── The Matrix — Lobby shootout ─────────────────────────────────
  { productionSlug: 'the-matrix-1999', sequenceSlug: 'lobby-shootout',
    personSlug: 'chad-stahelski', role: 'double', doublingForSlug: 'keanu-reeves',
    notes: 'Performed every fight beat at full speed before Reeves\'s slow-shutter takes.',
    sortOrder: 1 },

  // ── Kill Bill Vol 1 — House of Blue Leaves ──────────────────────
  { productionSlug: 'kill-bill-vol-1-2003', sequenceSlug: 'house-of-blue-leaves',
    personSlug: 'zoe-bell', role: 'double', doublingForSlug: 'uma-thurman',
    notes: 'Performed the Crazy 88 choreography and the chandelier swing.',
    sortOrder: 1 },

  // ── Avengers: Endgame — Cap-vs-Cap ───────────────────────────────
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'cap-vs-cap',
    personSlug: 'sam-hargrave', role: 'double', doublingForSlug: 'chris-evans',
    notes: 'Performed both halves of the fight to working-take camera plates.',
    sortOrder: 1 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'cap-vs-cap',
    personSlug: 'sam-hargrave', role: 'fight_choreographer',
    notes: 'Hargrave choreographed the sequence in addition to performing it.',
    sortOrder: 2 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'cap-vs-cap',
    personSlug: 'monique-ganderton', role: 'coordinator',
    sortOrder: 3 },

  // ── Avengers: Endgame — Vormir cliff ─────────────────────────────
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'vormir-cliff',
    personSlug: 'heidi-moneymaker', role: 'double', doublingForSlug: 'scarlett-johansson',
    notes: 'Performed the rigged fall on a twin-line hydraulic decelerator.',
    sortOrder: 1 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'vormir-cliff',
    personSlug: 'monique-ganderton', role: 'coordinator',
    sortOrder: 2 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'vormir-cliff',
    personSlug: 'zack-duncan', role: 'coordinator',
    sortOrder: 3 },

  // ── Avengers: Endgame — Portals battle ───────────────────────────
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'portals-battle',
    personSlug: 'monique-ganderton', role: 'coordinator',
    sortOrder: 1 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'portals-battle',
    personSlug: 'zack-duncan', role: 'coordinator',
    sortOrder: 2 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'portals-battle',
    personSlug: 'bobby-holland-hanton', role: 'double', doublingForSlug: 'chris-hemsworth',
    notes: 'Thor entrance via portal + hammer-throw choreography on the final cavalry charge.',
    sortOrder: 3 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'portals-battle',
    personSlug: 'sam-hargrave', role: 'double', doublingForSlug: 'chris-evans',
    notes: 'Cap-with-Mjolnir close-quarters work.',
    sortOrder: 4 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'portals-battle',
    personSlug: 'aaron-toney', role: 'double', doublingForSlug: 'anthony-mackie',
    notes: 'Falcon flight rigging across the battle.',
    sortOrder: 5 },
  { productionSlug: 'avengers-endgame-2019', sequenceSlug: 'portals-battle',
    personSlug: 'heidi-moneymaker', role: 'double', doublingForSlug: 'scarlett-johansson',
    sortOrder: 6 },

  // ── Inception — Rotating-corridor fight ──────────────────────────
  { productionSlug: 'inception-2010', sequenceSlug: 'rotating-corridor-fight',
    personSlug: 'tom-struthers', role: 'coordinator',
    notes: 'Coordinated Nolan\'s entire on-set practical-effects rig including the rotating-corridor build.',
    sortOrder: 1 },
];

console.log('seed-sequence-credits — Phase 12');
console.log(`\ninserting ${CREDITS.length} credits:`);

let inserted = 0;
let updated = 0;
let skipped = 0;

for (const c of CREDITS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO stunt_sequence_credits (
      sequence_id, person_id, role, doubling_for_person_id, notes, sort_order
    )
    SELECT ss.id, p.id, ${c.role}, doubled.id, ${c.notes ?? null}, ${c.sortOrder}
    FROM stunt_sequences ss
    JOIN productions prod ON prod.id = ss.production_id
    JOIN people p ON p.slug = ${c.personSlug}
    LEFT JOIN people doubled ON doubled.slug = ${c.doublingForSlug ?? null}
    WHERE prod.slug = ${c.productionSlug}
      AND ss.slug = ${c.sequenceSlug}
    ON CONFLICT (sequence_id, person_id, role) DO UPDATE SET
      doubling_for_person_id = EXCLUDED.doubling_for_person_id,
      notes = EXCLUDED.notes,
      sort_order = EXCLUDED.sort_order
    RETURNING id, created_at::text, NOW()::text AS updated_at
  `);
  if (r.length === 0) {
    skipped++;
    console.log(`  [!] ${c.productionSlug.padEnd(30)} :: ${c.sequenceSlug.padEnd(28)} ${c.personSlug.padEnd(22)} (${c.role}) — refs missing, skipped`);
    continue;
  }
  const row = r[0]!;
  // Approximate insert/update detection: if the row's created_at matches
  // its insertion (within ~3s), call it new.
  const createdAt = new Date(row.created_at).getTime();
  const isNew = Math.abs(Date.now() - createdAt) < 5_000;
  if (isNew) {
    inserted++;
    const dblNote = c.doublingForSlug ? ` (doubling ${c.doublingForSlug})` : '';
    console.log(`  [+] ${c.productionSlug.padEnd(30)} :: ${c.sequenceSlug.padEnd(28)} ${c.personSlug.padEnd(22)} (${c.role})${dblNote}`);
  } else {
    updated++;
    console.log(`  [~] ${c.productionSlug.padEnd(30)} :: ${c.sequenceSlug.padEnd(28)} ${c.personSlug.padEnd(22)} (${c.role}) refreshed`);
  }
}

console.log(`\nseeded — ${inserted} new + ${updated} refreshed + ${skipped} skipped`);
process.exit(0);
