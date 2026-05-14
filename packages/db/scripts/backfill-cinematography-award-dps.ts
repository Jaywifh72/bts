// Auto-attribute cinematography awards to the production's DP.
//
// Currently ~118 production_awards rows have a `cinematography`-flavored
// category (Oscar/BAFTA/ASC/Critics Choice) but recipient_person_id is
// NULL — they show up as production-level on the awards index and don't
// surface on the DP's /crew/[slug] page. The DP credit already exists in
// crew_assignments; this script joins the two so the recipient links up.
//
// Conservative rules:
//   • Match awards where category ILIKE '%cinematograph%' (catches "Best
//     Cinematography", "Outstanding Cinematography — Theatrical
//     Release", etc.).
//   • Resolve the DP via crew_assignments joined to roles WHERE
//     slug IN ('director-of-photography','cinematographer'). Productions
//     with EXACTLY ONE DP get auto-attributed. Multi-DP productions
//     (Babel, Anora's 2nd-unit listings, etc.) are LOGGED + SKIPPED for
//     manual review — silently picking one would corrupt the data.
//   • Idempotent: rows that already have recipient_person_id are
//     skipped at the SQL level.
//
// Run: pnpm --filter @bts/db exec tsx scripts/backfill-cinematography-award-dps.ts
import { db, sql } from '../src/index.ts';

type CandidateRow = {
  award_id: number;
  production_slug: string;
  award_org: string;
  category: string;
  year: number;
  dp_count: number;
  dp_person_id: number | null;
  dp_name: string | null;
};

// One pass: find every (award_id, production_id) where the award is
// cinematography-flavored AND has no recipient yet AND the production
// has exactly one DP. Returns enough data to do the UPDATE + log per row.
const candidates = await db.execute<CandidateRow>(sql`
  WITH dp_count AS (
    SELECT
      ca.production_id,
      COUNT(DISTINCT ppl.id)::int AS dp_count,
      MIN(ppl.id) AS dp_person_id,
      MIN(ppl.display_name) AS dp_name
    FROM crew_assignments ca
    JOIN roles r ON r.id = ca.role_id
    JOIN people ppl ON ppl.id = ca.person_id
    WHERE r.slug IN ('director-of-photography','cinematographer')
    GROUP BY ca.production_id
  )
  SELECT
    a.id AS award_id,
    p.slug AS production_slug,
    a.award_org::text AS award_org,
    a.category,
    a.year,
    COALESCE(d.dp_count, 0) AS dp_count,
    d.dp_person_id,
    d.dp_name
  FROM production_awards a
  JOIN productions p ON p.id = a.production_id
  LEFT JOIN dp_count d ON d.production_id = a.production_id
  WHERE a.category ILIKE '%cinematograph%'
    AND a.recipient_person_id IS NULL
    AND a.recipient_vfx_house_id IS NULL
    AND a.recipient_stunt_company_id IS NULL
  ORDER BY a.year DESC, p.slug
`);

console.log(`backfill-cinematography-award-dps — ${candidates.length} candidate rows`);

let updated = 0;
let skippedMulti = 0;
let skippedNoDp = 0;

for (const row of candidates) {
  if (row.dp_count === 0 || row.dp_person_id == null) {
    console.warn(`  [no-dp] ${row.production_slug} (${row.award_org}/${row.year}/${row.category}) — no DP found in crew_assignments`);
    skippedNoDp++;
    continue;
  }
  if (row.dp_count > 1) {
    console.warn(`  [multi-dp] ${row.production_slug} (${row.award_org}/${row.year}) — ${row.dp_count} DPs; manual review needed`);
    skippedMulti++;
    continue;
  }
  // A row with the SAME (production, org, category, year) attributed to
  // the SAME person may already exist (hand-curated earlier). The data
  // was duplicated under the pre-0057 UNIQUE shape that included only
  // recipient_person_id. If we'd just UPDATE, we'd hit the unique
  // constraint. Detect and DELETE the orphan instead — the existing
  // attributed row is the source of truth.
  const dup = await db.execute<{ id: number }>(sql`
    SELECT id FROM production_awards
    WHERE id != ${row.award_id}
      AND production_id = (SELECT production_id FROM production_awards WHERE id = ${row.award_id})
      AND award_org = ${row.award_org}::award_org_enum
      AND category = ${row.category}
      AND year = ${row.year}
      AND recipient_person_id = ${row.dp_person_id}
      AND recipient_vfx_house_id IS NULL
      AND recipient_stunt_company_id IS NULL
    LIMIT 1
  `);
  if (dup.length > 0) {
    await db.execute(sql`DELETE FROM production_awards WHERE id = ${row.award_id}`);
    updated++;
    if (updated <= 12 || updated % 25 === 0) {
      console.log(`  ↦ deduped ${row.production_slug} ${row.award_org} ${row.year} (kept attributed row, dropped orphan)`);
    }
    continue;
  }

  // Single DP, no existing duplicate: link.
  const r = await db.execute<{ id: number }>(sql`
    UPDATE production_awards
    SET recipient_person_id = ${row.dp_person_id},
        updated_at = NOW()
    WHERE id = ${row.award_id}
    RETURNING id
  `);
  if (r.length > 0) {
    updated++;
    if (updated <= 12 || updated % 25 === 0) {
      console.log(`  ✓ ${row.production_slug} ${row.award_org} ${row.year} → ${row.dp_name}`);
    }
  }
}

console.log(
  `\nbackfill-cinematography-award-dps — updated ${updated}, ` +
    `skipped multi-DP ${skippedMulti}, skipped no-DP ${skippedNoDp}`,
);
process.exit(0);
