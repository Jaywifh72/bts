// One-shot data fix — Phase-3 sequence seed used invented bulletin
// numbers (#11, #19, #20). Realigning to the canonical numbers
// established in Phase 6's safety_bulletins seed: #15 fire, #17
// vehicles, #14 stunts (covers working-at-heights as a sub-case).
import { db, sql } from '../src/index.ts';

const REPLACEMENTS: Array<{ from: string; to: string }> = [
  { from: 'SAG-AFTRA Bulletin #11 (Fire / Burns)', to: 'SAG-AFTRA Bulletin #15 (Fire)' },
  { from: 'SAG-AFTRA Bulletin #19 (Vehicles)', to: 'SAG-AFTRA Bulletin #17 (Vehicles)' },
  { from: 'SAG-AFTRA Bulletin #20 (Working at Heights)', to: 'SAG-AFTRA Bulletin #14 (Stunts)' },
];

console.log('realign-sequence-bulletins');

for (const { from, to } of REPLACEMENTS) {
  const r = await db.execute<{ count: string }>(sql`
    WITH updated AS (
      UPDATE stunt_sequences
      SET safety_bulletins_followed = array_replace(safety_bulletins_followed, ${from}, ${to}),
          updated_at = NOW()
      WHERE ${from} = ANY(safety_bulletins_followed)
      RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `);
  console.log(`  [~] ${from.padEnd(50)} → ${to}  (${r[0]?.count} rows)`);
}

process.exit(0);
