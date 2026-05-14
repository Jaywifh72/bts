// Second-pass backfill: split multi-credit awards across all credited
// recipients.
//
// The single-recipient backfill (backfill-award-recipients.ts) refuses
// to guess when a production has 2+ candidate people in a role. That
// preserved correctness but left 90+ Oscar rows unattributed — Coen
// brothers directing, writing-team adaptations, multi-DP films like
// Babel, etc.
//
// This pass handles the multi case by inserting one award row PER
// credited recipient (and DELETEs the original NULL-recipient row). So
// Best Adapted Screenplay for No Country for Old Men becomes 2 rows
// (Joel Coen + Ethan Coen) instead of 1 unattributed row.
//
// Conservative ceiling: we only split when the credited count is ≤ 4
// for screenplay/writing or ≤ 2 for directing/editing. Larger counts
// usually indicate noisy data (e.g. "8 candidates" on Bicycle Thieves)
// where most aren't actual award recipients, and the data needs
// per-row sourcing.
//
// Idempotent: re-running is safe; only un-attributed rows are touched,
// and INSERTs use ON CONFLICT DO NOTHING against
// production_awards_unique.
//
// Run: pnpm --filter @bts/db exec tsx scripts/backfill-award-recipients-multi.ts
import { db, sql } from '../src/index.ts';

type Bucket = {
  name: string;
  categoryRegex: string;
  roleSlugs: string[];
  /** Max candidates to split — beyond this, skip as noisy. */
  maxRecipients: number;
};

const BUCKETS: Bucket[] = [
  // Directing: usually 1, sometimes 2 (Coen brothers, Wachowski sisters).
  { name: 'directing',  categoryRegex: '\\bdirect(or|ing)\\b',                roleSlugs: ['director'],             maxRecipients: 2 },
  // Editing: typically 1, sometimes 2 (Argo, Departed).
  { name: 'editing',    categoryRegex: '\\bediting\\b|film editing',          roleSlugs: ['editor'],               maxRecipients: 2 },
  // Cinematography: usually 1, occasionally 2 (Babel, Anora).
  { name: 'cinematography', categoryRegex: 'cinematograph',                   roleSlugs: ['director-of-photography', 'cinematographer'], maxRecipients: 2 },
  // Screenplay: regularly 2-4 (Pulp Fiction = 2, Birdman = 4, etc.).
  { name: 'screenplay', categoryRegex: 'screenplay|writing|adapted.*screen|original.*screen', roleSlugs: ['screenwriter'], maxRecipients: 4 },
  // Score: usually 1, occasionally 2 (Anora's two composers, etc.).
  { name: 'score',      categoryRegex: 'score|original music',                roleSlugs: ['composer'],             maxRecipients: 2 },
  // Costume: usually 1.
  { name: 'costume',    categoryRegex: 'costume',                             roleSlugs: ['costume-designer'],     maxRecipients: 2 },
];

type RowWithRecipients = {
  award_id: number;
  production_id: number;
  production_slug: string;
  award_org: string;
  category: string;
  year: number;
  is_winner: boolean;
  source_url: string | null;
  recipient_ids: number[];
  recipient_names: string[];
};

let totalSplit = 0;
let totalSkippedTooMany = 0;

for (const bucket of BUCKETS) {
  console.log(`\n=== ${bucket.name} (max ${bucket.maxRecipients} recipients) ===`);
  const rolesArray = '{' + bucket.roleSlugs.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',') + '}';

  const candidates = await db.execute<RowWithRecipients>(sql`
    WITH role_match AS (
      SELECT
        ca.production_id,
        array_agg(DISTINCT ppl.id) AS recipient_ids,
        array_agg(DISTINCT ppl.display_name ORDER BY ppl.display_name) AS recipient_names
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      JOIN people ppl ON ppl.id = ca.person_id
      WHERE r.slug = ANY(${rolesArray}::text[])
      GROUP BY ca.production_id
      HAVING COUNT(DISTINCT ppl.id) > 1
    )
    SELECT
      a.id AS award_id,
      a.production_id,
      p.slug AS production_slug,
      a.award_org::text AS award_org,
      a.category,
      a.year,
      a.is_winner,
      a.source_url,
      m.recipient_ids,
      m.recipient_names
    FROM production_awards a
    JOIN productions p ON p.id = a.production_id
    JOIN role_match m ON m.production_id = a.production_id
    WHERE a.category ~* ${bucket.categoryRegex}
      AND a.recipient_person_id IS NULL
      AND a.recipient_vfx_house_id IS NULL
      AND a.recipient_stunt_company_id IS NULL
    ORDER BY a.year DESC, p.slug
  `);

  console.log(`  ${candidates.length} multi-credit rows to consider`);

  let bucketSplit = 0;
  let bucketTooMany = 0;

  for (const row of candidates) {
    const ids = row.recipient_ids;
    const names = row.recipient_names;

    if (ids.length > bucket.maxRecipients) {
      console.warn(`  [too-many] ${row.production_slug} (${row.award_org}/${row.year}/${row.category}) — ${ids.length} candidates (cap ${bucket.maxRecipients})`);
      bucketTooMany++;
      continue;
    }

    // INSERT one row per recipient. Use ON CONFLICT DO NOTHING so this
    // is safe to re-run and won't error if the user/seed has already
    // attributed one of the names.
    let inserted = 0;
    for (const personId of ids) {
      const r = await db.execute<{ id: number }>(sql`
        INSERT INTO production_awards (
          production_id, award_org, category, year, is_winner,
          recipient_person_id, source_url
        ) VALUES (
          ${row.production_id},
          ${row.award_org}::award_org_enum,
          ${row.category},
          ${row.year},
          ${row.is_winner},
          ${personId},
          ${row.source_url}
        )
        ON CONFLICT ON CONSTRAINT production_awards_unique DO NOTHING
        RETURNING id
      `);
      if (r.length > 0) inserted++;
    }

    // Delete the original NULL-recipient row IFF we inserted ≥ 1
    // replacement. If all of our inserts were no-ops because the
    // attributed rows already existed, the original row is also
    // redundant and should be removed.
    await db.execute(sql`DELETE FROM production_awards WHERE id = ${row.award_id}`);

    bucketSplit++;
    if (bucketSplit <= 8 || bucketSplit % 20 === 0) {
      console.log(`  ✓ ${row.production_slug} ${row.award_org} ${row.year} → ${ids.length} rows for ${names.join(' + ')}`);
    }
  }

  console.log(`  ${bucket.name}: split ${bucketSplit}, skipped (>${bucket.maxRecipients} candidates) ${bucketTooMany}`);
  totalSplit += bucketSplit;
  totalSkippedTooMany += bucketTooMany;
}

console.log(`\nbackfill-multi TOTAL — split ${totalSplit}, skipped-too-many ${totalSkippedTooMany}`);
process.exit(0);
