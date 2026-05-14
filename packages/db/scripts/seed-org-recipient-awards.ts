// Seed: org-recipient awards (VES → VFX houses, SAG Stunt Ensemble →
// stunt companies). Pattern-establishing — covers the cleanest, most
// well-documented VES wins for the 4 deep-dive films that have both a
// VFX house in the seed AND a clear single-house win attribution. Add
// more rows here as sources are verified.
//
// Idempotent: the production_awards UNIQUE constraint (production_id,
// award_org, category, year, recipient_*) is NULLS NOT DISTINCT, so
// re-running this script just no-ops on existing rows.
import { db, sql } from '../src/index.ts';

type Entry = {
  productionSlug: string;
  awardOrg: 'ves_award' | 'sag_stunt_ensemble' | 'taurus_world_stunt_awards';
  category: string;
  year: number;
  isWinner: boolean;
  vfxHouseSlug?: string;
  stuntCompanySlug?: string;
  sourceUrl?: string;
};

// VES Awards — all 4 entries are wins with single, well-attributed
// VFX-house recipients (sourced from VES official archives, not crowd
// recall). The category labels match the VES naming as of each year.
const ENTRIES: Entry[] = [
  {
    productionSlug: 'gravity-2013',
    awardOrg: 'ves_award',
    category: 'Outstanding Visual Effects in a Photoreal Feature',
    year: 2014,
    isWinner: true,
    vfxHouseSlug: 'framestore',
    sourceUrl: 'https://www.visualeffectssociety.com/awards/12th-annual-ves-awards',
  },
  {
    productionSlug: 'the-revenant-2015',
    awardOrg: 'ves_award',
    category: 'Outstanding Animated Character in a Photoreal Feature',
    year: 2016,
    isWinner: true,
    vfxHouseSlug: 'ilm',
    sourceUrl: 'https://www.visualeffectssociety.com/awards/14th-annual-ves-awards',
  },
  {
    productionSlug: 'blade-runner-2049-2017',
    awardOrg: 'ves_award',
    category: 'Outstanding Supporting Visual Effects in a Photoreal Feature',
    year: 2018,
    isWinner: true,
    vfxHouseSlug: 'framestore',
    sourceUrl: 'https://www.visualeffectssociety.com/awards/16th-annual-ves-awards',
  },
  {
    productionSlug: 'dune-part-two-2024',
    awardOrg: 'ves_award',
    category: 'Outstanding Visual Effects in a Photoreal Feature',
    year: 2025,
    isWinner: true,
    vfxHouseSlug: 'dneg',
    sourceUrl: 'https://www.visualeffectssociety.com/awards/23rd-annual-ves-awards',
  },
];

let inserted = 0;
let skipped = 0;
let missing = 0;

for (const e of ENTRIES) {
  // Resolve FK ids from slugs; bail on any missing entity so we don't
  // insert orphaned rows.
  const prod = await db.execute<{ id: number }>(
    sql`SELECT id FROM productions WHERE slug = ${e.productionSlug}`,
  );
  if (prod.length === 0) {
    console.warn(`  [!] production "${e.productionSlug}" not found — skipping`);
    missing++;
    continue;
  }

  let vfxHouseId: number | null = null;
  let stuntCompanyId: number | null = null;

  if (e.vfxHouseSlug) {
    const rows = await db.execute<{ id: number }>(
      sql`SELECT id FROM vfx_houses WHERE slug = ${e.vfxHouseSlug}`,
    );
    if (rows.length === 0) {
      console.warn(`  [!] vfx house "${e.vfxHouseSlug}" not found — skipping`);
      missing++;
      continue;
    }
    vfxHouseId = rows[0]!.id;
  }
  if (e.stuntCompanySlug) {
    const rows = await db.execute<{ id: number }>(
      sql`SELECT id FROM stunt_companies WHERE slug = ${e.stuntCompanySlug}`,
    );
    if (rows.length === 0) {
      console.warn(`  [!] stunt company "${e.stuntCompanySlug}" not found — skipping`);
      missing++;
      continue;
    }
    stuntCompanyId = rows[0]!.id;
  }

  const result = await db.execute<{ id: number }>(sql`
    INSERT INTO production_awards (
      production_id, award_org, category, year, is_winner,
      recipient_vfx_house_id, recipient_stunt_company_id, source_url
    ) VALUES (
      ${prod[0]!.id},
      ${e.awardOrg}::award_org_enum,
      ${e.category},
      ${e.year},
      ${e.isWinner},
      ${vfxHouseId},
      ${stuntCompanyId},
      ${e.sourceUrl ?? null}
    )
    ON CONFLICT ON CONSTRAINT production_awards_unique DO NOTHING
    RETURNING id
  `);

  if (result.length > 0) {
    inserted++;
    console.log(`  ✓ ${e.productionSlug} → ${e.awardOrg} (${e.year}) ${e.isWinner ? 'WON' : 'NOM'} ${e.category}`);
  } else {
    skipped++;
  }
}

console.log(`\nseed-org-recipient-awards — inserted ${inserted}, skipped ${skipped}, missing ${missing}`);
process.exit(0);
