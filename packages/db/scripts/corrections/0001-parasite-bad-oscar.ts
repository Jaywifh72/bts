// Data correction #0001 — remove the incorrect "Best Cinematography"
// Oscar entry from Parasite (2019).
//
// Parasite won 4 Oscars at the 2020 ceremony — Best Picture, Best
// Director, Best Original Screenplay, Best International Feature Film
// — and was nominated for 6. It was NOT nominated for and did not win
// Best Cinematography (that Oscar went to Roger Deakins for 1917 in
// the same ceremony).
//
// The bad row existed before the QA pass identified it. The fix was
// originally inlined at the top of seed-parasite.ts; this file moves
// it to a dedicated, explicitly-ordered corrections directory so:
//   1. Re-running seed-parasite.ts can't mask the absence of this fix
//   2. The intent ("one-time data correction") is unambiguous
//   3. Future similar corrections accumulate here with a paper trail
//
// Idempotent: the DELETE is a no-op once the row is gone.

import { db, sql } from '../../src/index.ts';

console.log('correction 0001 — removing bad Parasite "Best Cinematography" Oscar entry');

const before = await db.execute<{ id: number }>(sql`
  SELECT id FROM production_awards
  WHERE production_id = (SELECT id FROM productions WHERE slug = 'parasite-2019')
    AND award_org = 'academy_awards'
    AND category = 'Best Cinematography'
`);

if (before.length === 0) {
  console.log('  [✓] already clean — nothing to do');
} else {
  console.log(`  [~] found ${before.length} bad row(s); deleting`);
  await db.execute(sql`
    DELETE FROM production_awards
    WHERE production_id = (SELECT id FROM productions WHERE slug = 'parasite-2019')
      AND award_org = 'academy_awards'
      AND category = 'Best Cinematography'
  `);
  console.log('  [+] deleted');
}

process.exit(0);
