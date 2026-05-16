/**
 * One-shot verification that the UX-audit migrations (0059–0063) landed.
 * Run with: pnpm --filter @bts/db exec tsx scripts/verify-ux-audit-migrations.ts
 */
import 'dotenv/config';
import { db, sql } from '../src/index.ts';

async function main() {
  const checks: Array<{ name: string; expected: number; got: number }> = [];

  // 0059 — is_primary on crew_assignments
  const r1 = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM information_schema.columns
    WHERE table_name = 'crew_assignments' AND column_name = 'is_primary'
  `);
  checks.push({ name: '0059 crew_assignments.is_primary', expected: 1, got: r1[0]?.n ?? 0 });

  // 0060 — provenance columns on 4 tables
  for (const t of ['people', 'vfx_houses', 'stunt_companies', 'stunt_schools']) {
    const r = await db.execute<{ n: number }>(sql`
      SELECT COUNT(*)::int AS n FROM information_schema.columns
      WHERE table_name = ${t}
        AND column_name IN ('data_tier','curated_by','curated_by_url','last_curated_review','last_verified_at')
    `);
    checks.push({ name: `0060 ${t} provenance columns`, expected: 5, got: r[0]?.n ?? 0 });
  }

  // 0061 — claim_entity_type_enum values
  const r2 = await db.execute<{ enumlabel: string }>(sql`
    SELECT enumlabel FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'claim_entity_type_enum'
  `);
  const labels = new Set(r2.map((r) => r.enumlabel));
  const wantNew = ['stunt_company', 'stunt_school', 'format', 'society'];
  const found = wantNew.filter((v) => labels.has(v)).length;
  checks.push({ name: '0061 claim_entity_type_enum +4 values', expected: 4, got: found });

  // 0062 — scoring_stages table
  const r3 = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM information_schema.tables
    WHERE table_name IN ('scoring_stages', 'production_scoring_stages')
  `);
  checks.push({ name: '0062 scoring_stages + join table', expected: 2, got: r3[0]?.n ?? 0 });

  // 0063 — provenance on media_assets
  const r4 = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM information_schema.columns
    WHERE table_name = 'media_assets'
      AND column_name IN ('data_tier','curated_by','curated_by_url','last_curated_review','last_verified_at')
  `);
  checks.push({ name: '0063 media_assets provenance columns', expected: 5, got: r4[0]?.n ?? 0 });

  // F4 backfill — every (production_id, role_id) should have exactly one is_primary=true
  const r5 = await db.execute<{ orphans: number }>(sql`
    SELECT COUNT(*)::int AS orphans FROM (
      SELECT production_id, role_id
      FROM crew_assignments
      GROUP BY production_id, role_id
      HAVING COUNT(*) FILTER (WHERE is_primary) = 0
    ) sub
  `);
  checks.push({ name: 'F4 backfill — groups with ≥1 primary', expected: 0, got: r5[0]?.orphans ?? 0 });

  let allOk = true;
  for (const c of checks) {
    const ok = c.got === c.expected;
    if (!ok) allOk = false;
    console.log(`${ok ? '✓' : '✗'} ${c.name} — expected ${c.expected}, got ${c.got}`);
  }
  console.log(allOk ? '\nAll migrations verified.' : '\n⚠ Some checks failed.');
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
