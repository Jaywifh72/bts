// Generalised auto-attribution for production_awards rows that should
// route to a specific person based on the award category + crew role.
//
// Replaces the cinematography-only script. Same conservative pattern:
//   • Match awards by category regex (case-insensitive).
//   • Resolve recipient via crew_assignments joined to a role whose slug
//     is in the configured list for that category.
//   • Productions with EXACTLY ONE matching crew member get auto-
//     attributed. Multi-credit productions (joint Coen-bros directing,
//     screenwriter teams, etc.) are LOGGED + SKIPPED for manual review.
//   • Pre-0057 duplicates (one row with NULL recipient + one with the
//     person attributed) are deduplicated — the attributed row wins.
//   • Idempotent: re-running is safe; only un-attributed rows are
//     touched. Re-runs of this script after new categories are added
//     will pick up the new bucket without re-touching prior buckets.
//
// Run: pnpm --filter @bts/db exec tsx scripts/backfill-award-recipients.ts
import { db, sql } from '../src/index.ts';

type Bucket = {
  /** Human-readable name for logging. */
  name: string;
  /** Case-insensitive category match. */
  categoryRegex: string;
  /** crew_assignments.roles.slug values that count as the recipient. */
  roleSlugs: string[];
};

// Order matters slightly: a row matches the first bucket whose regex hits.
// Cinematography is first because some films have "Cinematography" appear
// in non-DP categories (rare but possible).
const BUCKETS: Bucket[] = [
  { name: 'cinematography',    categoryRegex: 'cinematograph',                       roleSlugs: ['director-of-photography', 'cinematographer'] },
  { name: 'directing',         categoryRegex: '\\bdirect(or|ing)\\b',                roleSlugs: ['director'] },
  { name: 'editing',           categoryRegex: '\\bediting\\b|film editing',          roleSlugs: ['editor'] },
  { name: 'screenplay',        categoryRegex: 'screenplay|writing|adapted.*screen|original.*screen', roleSlugs: ['screenwriter'] },
  { name: 'score',             categoryRegex: 'score|original music',                roleSlugs: ['composer'] },
  { name: 'production_design', categoryRegex: 'production design',                   roleSlugs: ['production-designer'] },
  { name: 'costume',           categoryRegex: 'costume',                             roleSlugs: ['costume-designer'] },
];

type CandidateRow = {
  award_id: number;
  production_id: number;
  production_slug: string;
  award_org: string;
  category: string;
  year: number;
  match_count: number;
  recipient_person_id: number | null;
  recipient_name: string | null;
};

let totalUpdated = 0;
let totalMulti = 0;
let totalNoMatch = 0;

for (const bucket of BUCKETS) {
  console.log(`\n=== ${bucket.name} (category ~* '${bucket.categoryRegex}', roles=${bucket.roleSlugs.join(',')}) ===`);

  const rolesArray = '{' + bucket.roleSlugs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',') + '}';

  const candidates = await db.execute<CandidateRow>(sql`
    WITH role_match AS (
      SELECT
        ca.production_id,
        COUNT(DISTINCT ppl.id)::int AS match_count,
        MIN(ppl.id) AS recipient_person_id,
        MIN(ppl.display_name) AS recipient_name
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      JOIN people ppl ON ppl.id = ca.person_id
      WHERE r.slug = ANY(${rolesArray}::text[])
      GROUP BY ca.production_id
    )
    SELECT
      a.id AS award_id,
      a.production_id,
      p.slug AS production_slug,
      a.award_org::text AS award_org,
      a.category,
      a.year,
      COALESCE(m.match_count, 0) AS match_count,
      m.recipient_person_id,
      m.recipient_name
    FROM production_awards a
    JOIN productions p ON p.id = a.production_id
    LEFT JOIN role_match m ON m.production_id = a.production_id
    WHERE a.category ~* ${bucket.categoryRegex}
      AND a.recipient_person_id IS NULL
      AND a.recipient_vfx_house_id IS NULL
      AND a.recipient_stunt_company_id IS NULL
    ORDER BY a.year DESC, p.slug
  `);

  console.log(`  ${candidates.length} candidate rows`);
  let bucketUpdated = 0;
  let bucketMulti = 0;
  let bucketNoMatch = 0;

  for (const row of candidates) {
    if (row.match_count === 0 || row.recipient_person_id == null) {
      bucketNoMatch++;
      continue;
    }
    if (row.match_count > 1) {
      console.warn(`  [multi] ${row.production_slug} (${row.award_org}/${row.year}/${row.category}) — ${row.match_count} candidates`);
      bucketMulti++;
      continue;
    }

    // Dedup: if another row already exists for the same award attributed
    // to this person, drop the orphan instead of UPDATE-ing into a
    // UNIQUE conflict.
    const dup = await db.execute<{ id: number }>(sql`
      SELECT id FROM production_awards
      WHERE id != ${row.award_id}
        AND production_id = ${row.production_id}
        AND award_org = ${row.award_org}::award_org_enum
        AND category = ${row.category}
        AND year = ${row.year}
        AND recipient_person_id = ${row.recipient_person_id}
        AND recipient_vfx_house_id IS NULL
        AND recipient_stunt_company_id IS NULL
      LIMIT 1
    `);
    if (dup.length > 0) {
      await db.execute(sql`DELETE FROM production_awards WHERE id = ${row.award_id}`);
      bucketUpdated++;
      continue;
    }

    await db.execute(sql`
      UPDATE production_awards
      SET recipient_person_id = ${row.recipient_person_id},
          updated_at = NOW()
      WHERE id = ${row.award_id}
    `);
    bucketUpdated++;
  }

  console.log(`  ✓ ${bucket.name}: updated ${bucketUpdated}, multi-credit skipped ${bucketMulti}, no-match skipped ${bucketNoMatch}`);
  totalUpdated += bucketUpdated;
  totalMulti += bucketMulti;
  totalNoMatch += bucketNoMatch;
}

console.log(
  `\nbackfill-award-recipients TOTAL — updated ${totalUpdated}, ` +
    `multi-credit skipped ${totalMulti}, no-match skipped ${totalNoMatch}`,
);
process.exit(0);
