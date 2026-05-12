import { db as defaultDb, sql as defaultSql } from '../src/db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

export type ClaimBackfillResult = {
  productionFormats: number;
  equipmentUsage: number;
  vfxCredits: number;
  colorPipelines: number;
  lightingSetups: number;
  postHouses: number;
  total: number;
};

async function scalarCount(db: SeedDb, query: ReturnType<typeof sql>): Promise<number> {
  const [row] = await db.execute<{ count: string }>(query);
  return Number(row?.count ?? 0);
}

export async function backfillClaimsFromCuratedData(
  db: SeedDb = defaultDb,
): Promise<ClaimBackfillResult> {
  const productionFormats = await scalarCount(db, sql`
    WITH source_rows AS (
      SELECT
        pf.id,
        p.id AS production_id,
        p.slug AS production_slug,
        (
          p.title || ' used ' || pf.acquisition_format || ' capture for ' || pf.aspect_ratio ||
          CASE WHEN pf.label IS NOT NULL THEN ' (' || pf.label || ')' ELSE '' END || '.'
        ) AS statement,
        CASE WHEN EXISTS (
          SELECT 1 FROM production_sources ps WHERE ps.production_id = p.id
        ) THEN 'sourced'::claim_status_enum ELSE 'needs_source'::claim_status_enum END AS status,
        COALESCE((
          SELECT CASE ps.confidence
            WHEN 'primary' THEN 'primary'
            WHEN 'secondary' THEN 'secondary'
            WHEN 'manufacturer_marketing' THEN 'manufacturer'
            WHEN 'speculative' THEN 'speculative'
          END::claim_confidence_enum
          FROM production_sources ps
          WHERE ps.production_id = p.id
          ORDER BY CASE ps.confidence
            WHEN 'primary' THEN 1
            WHEN 'secondary' THEN 2
            WHEN 'manufacturer_marketing' THEN 3
            WHEN 'speculative' THEN 4
          END
          LIMIT 1
        ), 'inferred'::claim_confidence_enum) AS confidence
      FROM production_formats pf
      JOIN productions p ON p.id = pf.production_id
      WHERE p.data_tier = 'curated'
    ),
    upserted AS (
      INSERT INTO claims (
        slug, claim_type, statement, normalized_statement, status, confidence, editorial_note
      )
      SELECT
        'production-format-' || id,
        'production_format',
        statement,
        lower(regexp_replace(statement, '[[:space:]]+', ' ', 'g')),
        status,
        confidence,
        'Backfilled from production_formats.'
      FROM source_rows
      ON CONFLICT (slug) DO UPDATE
        SET statement = EXCLUDED.statement,
            normalized_statement = EXCLUDED.normalized_statement,
            status = CASE
              WHEN claims.status IN ('reviewed', 'verified', 'disputed', 'deprecated', 'rejected') THEN claims.status
              ELSE EXCLUDED.status
            END,
            confidence = CASE
              WHEN claims.status IN ('reviewed', 'verified', 'disputed', 'deprecated', 'rejected') THEN claims.confidence
              ELSE EXCLUDED.confidence
            END,
            editorial_note = EXCLUDED.editorial_note,
            updated_at = NOW()
      RETURNING id, slug
    ),
    entity_insert AS (
      INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
      SELECT u.id, 'production', sr.production_id, sr.production_slug
      FROM upserted u
      JOIN source_rows sr ON u.slug = 'production-format-' || sr.id
      ON CONFLICT (claim_id, entity_type, entity_id) DO UPDATE
        SET entity_slug = EXCLUDED.entity_slug
      RETURNING id
    ),
    source_insert AS (
      INSERT INTO claim_sources (claim_id, source_id, confidence, quote, editorial_note)
      SELECT
        u.id,
        ps.source_id,
        CASE ps.confidence
          WHEN 'primary' THEN 'primary'
          WHEN 'secondary' THEN 'secondary'
          WHEN 'manufacturer_marketing' THEN 'manufacturer'
          WHEN 'speculative' THEN 'speculative'
        END::claim_confidence_enum,
        ps.claim_quote,
        ps.notes
      FROM upserted u
      JOIN source_rows sr ON u.slug = 'production-format-' || sr.id
      JOIN production_sources ps ON ps.production_id = sr.production_id
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM upserted
  `);

  const equipmentUsage = await scalarCount(db, sql`
    WITH source_rows AS (
      SELECT
        eu.id,
        sc.id AS scene_id,
        sc.slug AS scene_slug,
        sc.title AS scene_title,
        p.id AS production_id,
        p.slug AS production_slug,
        p.title AS production_title,
        em.id AS manufacturer_id,
        em.slug AS manufacturer_slug,
        em.name AS manufacturer_name,
        es.id AS series_id,
        es.slug AS series_slug,
        es.name AS series_name,
        es.category AS series_category,
        ei.id AS item_id,
        ei.slug AS item_slug,
        ei.name AS item_name,
        (
          p.title || ' used ' || em.name || ' ' || es.name ||
          CASE WHEN ei.name IS NOT NULL THEN ' ' || ei.name ELSE '' END ||
          ' in "' || sc.title || '".'
        ) AS statement,
        CASE es.category
          WHEN 'camera_body' THEN 'scene_camera'::claim_type_enum
          WHEN 'lens_set' THEN 'scene_lens'::claim_type_enum
          WHEN 'lighting_fixture' THEN 'scene_lighting'::claim_type_enum
          WHEN 'filter' THEN 'production_filter'::claim_type_enum
          ELSE 'general_bts_fact'::claim_type_enum
        END AS claim_type,
        CASE WHEN EXISTS (
          SELECT 1 FROM equipment_usage_sources eus WHERE eus.equipment_usage_id = eu.id
        ) THEN 'sourced'::claim_status_enum ELSE 'needs_source'::claim_status_enum END AS status,
        COALESCE((
          SELECT CASE eus.confidence
            WHEN 'primary' THEN 'primary'
            WHEN 'secondary' THEN 'secondary'
            WHEN 'manufacturer_marketing' THEN 'manufacturer'
            WHEN 'speculative' THEN 'speculative'
          END::claim_confidence_enum
          FROM equipment_usage_sources eus
          WHERE eus.equipment_usage_id = eu.id
          ORDER BY CASE eus.confidence
            WHEN 'primary' THEN 1
            WHEN 'secondary' THEN 2
            WHEN 'manufacturer_marketing' THEN 3
            WHEN 'speculative' THEN 4
          END
          LIMIT 1
        ), 'inferred'::claim_confidence_enum) AS confidence
      FROM equipment_usage eu
      JOIN scenes sc ON sc.id = eu.scene_id
      JOIN productions p ON p.id = sc.production_id
      JOIN equipment_series es ON es.id = eu.equipment_series_id
      JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
      LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
      WHERE p.data_tier = 'curated'
    ),
    upserted AS (
      INSERT INTO claims (
        slug, claim_type, statement, normalized_statement, status, confidence, editorial_note
      )
      SELECT
        'equipment-usage-' || id,
        claim_type,
        statement,
        lower(regexp_replace(statement, '[[:space:]]+', ' ', 'g')),
        status,
        confidence,
        'Backfilled from equipment_usage.'
      FROM source_rows
      ON CONFLICT (slug) DO UPDATE
        SET claim_type = EXCLUDED.claim_type,
            statement = EXCLUDED.statement,
            normalized_statement = EXCLUDED.normalized_statement,
            status = CASE
              WHEN claims.status IN ('reviewed', 'verified', 'disputed', 'deprecated', 'rejected') THEN claims.status
              ELSE EXCLUDED.status
            END,
            confidence = CASE
              WHEN claims.status IN ('reviewed', 'verified', 'disputed', 'deprecated', 'rejected') THEN claims.confidence
              ELSE EXCLUDED.confidence
            END,
            editorial_note = EXCLUDED.editorial_note,
            updated_at = NOW()
      RETURNING id, slug
    ),
    entity_rows AS (
      SELECT u.id AS claim_id, 'production'::claim_entity_type_enum AS entity_type, sr.production_id AS entity_id, sr.production_slug AS entity_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'equipment-usage-' || sr.id
      UNION ALL
      SELECT u.id, 'scene', sr.scene_id, sr.scene_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'equipment-usage-' || sr.id
      UNION ALL
      SELECT u.id, 'equipment_manufacturer', sr.manufacturer_id, sr.manufacturer_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'equipment-usage-' || sr.id
      UNION ALL
      SELECT u.id, 'equipment_series', sr.series_id, sr.series_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'equipment-usage-' || sr.id
      UNION ALL
      SELECT u.id, 'equipment_item', sr.item_id, sr.item_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'equipment-usage-' || sr.id
      WHERE sr.item_id IS NOT NULL
    ),
    entity_insert AS (
      INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
      SELECT claim_id, entity_type, entity_id, entity_slug FROM entity_rows
      ON CONFLICT (claim_id, entity_type, entity_id) DO UPDATE
        SET entity_slug = EXCLUDED.entity_slug
      RETURNING id
    ),
    source_insert AS (
      INSERT INTO claim_sources (claim_id, source_id, confidence, quote, editorial_note)
      SELECT
        u.id,
        eus.source_id,
        CASE eus.confidence
          WHEN 'primary' THEN 'primary'
          WHEN 'secondary' THEN 'secondary'
          WHEN 'manufacturer_marketing' THEN 'manufacturer'
          WHEN 'speculative' THEN 'speculative'
        END::claim_confidence_enum,
        eus.claim_quote,
        eus.notes
      FROM upserted u
      JOIN source_rows sr ON u.slug = 'equipment-usage-' || sr.id
      JOIN equipment_usage_sources eus ON eus.equipment_usage_id = sr.id
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM upserted
  `);

  const vfxCredits = await scalarCount(db, sql`
    WITH source_rows AS (
      SELECT
        vc.id,
        p.id AS production_id,
        p.slug AS production_slug,
        p.title AS production_title,
        vh.id AS vfx_house_id,
        vh.slug AS vfx_house_slug,
        vh.name AS vfx_house_name,
        (
          vh.name || ' is credited for ' || replace(vc.role::text, '_', ' ') ||
          ' VFX work on ' || p.title ||
          CASE WHEN vc.shot_count IS NOT NULL THEN ' (' || vc.shot_count || ' shots).' ELSE '.' END
        ) AS statement
      FROM vfx_credits vc
      JOIN productions p ON p.id = vc.production_id
      JOIN vfx_houses vh ON vh.id = vc.vfx_house_id
      WHERE p.data_tier = 'curated'
    ),
    upserted AS (
      INSERT INTO claims (
        slug, claim_type, statement, normalized_statement, status, confidence, editorial_note
      )
      SELECT
        'vfx-credit-' || id,
        'production_vfx_house',
        statement,
        lower(regexp_replace(statement, '[[:space:]]+', ' ', 'g')),
        'needs_source',
        'inferred',
        'Backfilled from vfx_credits.'
      FROM source_rows
      ON CONFLICT (slug) DO UPDATE
        SET statement = EXCLUDED.statement,
            normalized_statement = EXCLUDED.normalized_statement,
            updated_at = NOW()
      RETURNING id, slug
    ),
    entity_rows AS (
      SELECT u.id AS claim_id, 'production'::claim_entity_type_enum AS entity_type, sr.production_id AS entity_id, sr.production_slug AS entity_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'vfx-credit-' || sr.id
      UNION ALL
      SELECT u.id, 'vfx_house', sr.vfx_house_id, sr.vfx_house_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'vfx-credit-' || sr.id
    ),
    entity_insert AS (
      INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
      SELECT claim_id, entity_type, entity_id, entity_slug FROM entity_rows
      ON CONFLICT (claim_id, entity_type, entity_id) DO UPDATE
        SET entity_slug = EXCLUDED.entity_slug
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM upserted
  `);

  const colorPipelines = await scalarCount(db, sql`
    WITH source_rows AS (
      SELECT
        cp.id,
        p.id AS production_id,
        p.slug AS production_slug,
        p.title AS production_title,
        sc.id AS scene_id,
        sc.slug AS scene_slug,
        (
          p.title || ' used the "' || cp.pipeline_name || '" color pipeline' ||
          CASE WHEN sc.title IS NOT NULL THEN ' for "' || sc.title || '"' ELSE '' END || '.'
        ) AS statement
      FROM production_color_pipelines cp
      JOIN productions p ON p.id = cp.production_id
      LEFT JOIN scenes sc ON sc.id = cp.scene_id
      WHERE p.data_tier = 'curated'
    ),
    upserted AS (
      INSERT INTO claims (
        slug, claim_type, statement, normalized_statement, status, confidence, editorial_note
      )
      SELECT
        'color-pipeline-' || id,
        'production_color_pipeline',
        statement,
        lower(regexp_replace(statement, '[[:space:]]+', ' ', 'g')),
        'needs_source',
        'inferred',
        'Backfilled from production_color_pipelines.'
      FROM source_rows
      ON CONFLICT (slug) DO UPDATE
        SET statement = EXCLUDED.statement,
            normalized_statement = EXCLUDED.normalized_statement,
            updated_at = NOW()
      RETURNING id, slug
    ),
    entity_rows AS (
      SELECT u.id AS claim_id, 'production'::claim_entity_type_enum AS entity_type, sr.production_id AS entity_id, sr.production_slug AS entity_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'color-pipeline-' || sr.id
      UNION ALL
      SELECT u.id, 'scene', sr.scene_id, sr.scene_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'color-pipeline-' || sr.id
      WHERE sr.scene_id IS NOT NULL
    ),
    entity_insert AS (
      INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
      SELECT claim_id, entity_type, entity_id, entity_slug FROM entity_rows
      ON CONFLICT (claim_id, entity_type, entity_id) DO UPDATE
        SET entity_slug = EXCLUDED.entity_slug
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM upserted
  `);

  const lightingSetups = await scalarCount(db, sql`
    WITH source_rows AS (
      SELECT
        ls.id,
        sc.id AS scene_id,
        sc.slug AS scene_slug,
        sc.title AS scene_title,
        p.id AS production_id,
        p.slug AS production_slug,
        p.title AS production_title,
        (
          p.title || ' used the "' || ls.setup_name || '" lighting setup for "' || sc.title || '".'
        ) AS statement
      FROM lighting_setups ls
      JOIN scenes sc ON sc.id = ls.scene_id
      JOIN productions p ON p.id = sc.production_id
      WHERE p.data_tier = 'curated'
    ),
    upserted AS (
      INSERT INTO claims (
        slug, claim_type, statement, normalized_statement, status, confidence, editorial_note
      )
      SELECT
        'lighting-setup-' || id,
        'scene_lighting',
        statement,
        lower(regexp_replace(statement, '[[:space:]]+', ' ', 'g')),
        'needs_source',
        'inferred',
        'Backfilled from lighting_setups.'
      FROM source_rows
      ON CONFLICT (slug) DO UPDATE
        SET statement = EXCLUDED.statement,
            normalized_statement = EXCLUDED.normalized_statement,
            updated_at = NOW()
      RETURNING id, slug
    ),
    entity_rows AS (
      SELECT u.id AS claim_id, 'production'::claim_entity_type_enum AS entity_type, sr.production_id AS entity_id, sr.production_slug AS entity_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'lighting-setup-' || sr.id
      UNION ALL
      SELECT u.id, 'scene', sr.scene_id, sr.scene_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'lighting-setup-' || sr.id
    ),
    entity_insert AS (
      INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
      SELECT claim_id, entity_type, entity_id, entity_slug FROM entity_rows
      ON CONFLICT (claim_id, entity_type, entity_id) DO UPDATE
        SET entity_slug = EXCLUDED.entity_slug
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM upserted
  `);

  const postHouses = await scalarCount(db, sql`
    WITH source_rows AS (
      SELECT
        pph.production_id || '-' || pph.post_house_id || '-' || pph.role::text AS stable_id,
        p.id AS production_id,
        p.slug AS production_slug,
        p.title AS production_title,
        ph.id AS post_house_id,
        ph.slug AS post_house_slug,
        ph.name AS post_house_name,
        (
          ph.name || ' handled ' || replace(pph.role::text, '_', ' ') || ' on ' || p.title || '.'
        ) AS statement
      FROM production_post_houses pph
      JOIN productions p ON p.id = pph.production_id
      JOIN post_houses ph ON ph.id = pph.post_house_id
      WHERE p.data_tier = 'curated'
    ),
    upserted AS (
      INSERT INTO claims (
        slug, claim_type, statement, normalized_statement, status, confidence, editorial_note
      )
      SELECT
        'post-house-' || stable_id,
        'production_post_house',
        statement,
        lower(regexp_replace(statement, '[[:space:]]+', ' ', 'g')),
        'needs_source',
        'inferred',
        'Backfilled from production_post_houses.'
      FROM source_rows
      ON CONFLICT (slug) DO UPDATE
        SET statement = EXCLUDED.statement,
            normalized_statement = EXCLUDED.normalized_statement,
            updated_at = NOW()
      RETURNING id, slug
    ),
    entity_rows AS (
      SELECT u.id AS claim_id, 'production'::claim_entity_type_enum AS entity_type, sr.production_id AS entity_id, sr.production_slug AS entity_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'post-house-' || sr.stable_id
      UNION ALL
      SELECT u.id, 'post_house', sr.post_house_id, sr.post_house_slug
      FROM upserted u JOIN source_rows sr ON u.slug = 'post-house-' || sr.stable_id
    ),
    entity_insert AS (
      INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
      SELECT claim_id, entity_type, entity_id, entity_slug FROM entity_rows
      ON CONFLICT (claim_id, entity_type, entity_id) DO UPDATE
        SET entity_slug = EXCLUDED.entity_slug
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM upserted
  `);

  return {
    productionFormats,
    equipmentUsage,
    vfxCredits,
    colorPipelines,
    lightingSetups,
    postHouses,
    total: productionFormats + equipmentUsage + vfxCredits + colorPipelines + lightingSetups + postHouses,
  };
}

const invokedPath = process.argv[1];
const argv1AsUrl = invokedPath ? `file:///${invokedPath.replace(/\\/g, '/')}` : null;
if (import.meta.url === argv1AsUrl) {
  backfillClaimsFromCuratedData(defaultDb)
    .then((result) => {
      console.log(`claims backfill: ${result.total} upserted`);
      console.log(`  production formats: ${result.productionFormats}`);
      console.log(`  equipment usage:    ${result.equipmentUsage}`);
      console.log(`  vfx credits:        ${result.vfxCredits}`);
      console.log(`  color pipelines:    ${result.colorPipelines}`);
      console.log(`  lighting setups:    ${result.lightingSetups}`);
      console.log(`  post houses:        ${result.postHouses}`);
      return defaultSql.end();
    })
    .catch(async (e) => {
      console.error('claims backfill failed:', e instanceof Error ? `${e.message}\n${e.stack}` : String(e));
      await defaultSql.end();
      process.exit(1);
    });
}
