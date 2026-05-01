import 'dotenv/config';
import { db, sql } from '@bts/db';
import type { RawVfxBreakdown } from '../scrapers/types.ts';

/**
 * Upsert a single raw breakdown into the database.
 *
 * Conflict resolution (vfx_credits unique on production_id + vfx_house_id):
 *  - artofvfx wins over beforesandafters: caller sorts so artofvfx is processed last
 *  - non-null shot_count wins over null: only update shot_count if incoming is non-null
 *  - notes are appended with source prefix
 */
export async function upsertBreakdown(breakdown: RawVfxBreakdown): Promise<void> {
  if (!breakdown.production_slug) {
    console.warn(`  Skipping unmatched breakdown from ${breakdown.source_url}`);
    return;
  }

  // Resolve production ID
  const [prod] = await db.execute<{ id: number }>(sql`
    SELECT id FROM productions WHERE slug = ${breakdown.production_slug}
  `);
  if (!prod) {
    console.warn(`  Production not found: ${breakdown.production_slug}`);
    return;
  }

  // Upsert source record
  const [src] = await db.execute<{ id: number }>(sql`
    INSERT INTO sources (slug, kind, title, url, accessed_at)
    VALUES (
      ${`vfx-${breakdown.source}-${breakdown.production_slug}`},
      'vfx_breakdown_article',
      ${`VFX Breakdown: ${breakdown.production_slug} (${breakdown.source})`},
      ${breakdown.source_url},
      ${new Date().toISOString().split('T')[0]}
    )
    ON CONFLICT (url) WHERE url IS NOT NULL
    DO UPDATE SET accessed_at = EXCLUDED.accessed_at
    RETURNING id
  `);

  // Upsert each vendor as a vfx_house + vfx_credit
  for (const vendor of breakdown.vendors) {
    const vendorSlug = vendor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Upsert VFX house
    const [house] = await db.execute<{ id: number }>(sql`
      INSERT INTO vfx_houses (slug, name)
      VALUES (${vendorSlug}, ${vendor.name})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);

    // Link source to house
    await db.execute(sql`
      INSERT INTO vfx_house_sources (vfx_house_id, source_id, confidence)
      VALUES (${house!.id}, ${src!.id}, 'secondary')
      ON CONFLICT (vfx_house_id, source_id) DO NOTHING
    `);

    // Upsert credit with conflict resolution
    const notePrefix = `[${breakdown.source}]`;
    await db.execute(sql`
      INSERT INTO vfx_credits (production_id, vfx_house_id, shot_count, role, notes)
      VALUES (
        ${prod!.id}, ${house!.id},
        ${vendor.shots ?? null},
        ${vendor.role},
        ${null}
      )
      ON CONFLICT (production_id, vfx_house_id) DO UPDATE SET
        shot_count = CASE
          WHEN EXCLUDED.shot_count IS NOT NULL THEN EXCLUDED.shot_count
          ELSE vfx_credits.shot_count
        END,
        role = EXCLUDED.role,
        notes = CASE
          WHEN vfx_credits.notes IS NULL THEN NULL
          ELSE vfx_credits.notes || E'\n' || ${notePrefix}
        END,
        updated_at = NOW()
    `);
  }

  // Upsert technique tags
  for (const techniqueSlug of breakdown.techniques) {
    const [technique] = await db.execute<{ id: number }>(sql`
      SELECT id FROM vfx_techniques WHERE slug = ${techniqueSlug}
    `);
    if (!technique) { console.warn(`  Unknown technique slug: ${techniqueSlug}`); continue; }

    await db.execute(sql`
      INSERT INTO production_vfx_techniques (production_id, technique_id)
      VALUES (${prod!.id}, ${technique.id})
      ON CONFLICT (production_id, technique_id) DO NOTHING
    `);
  }

  console.log(`  ✓ ${breakdown.production_slug} (${breakdown.source}): ${breakdown.vendors.length} vendors, ${breakdown.techniques.length} techniques`);
}
