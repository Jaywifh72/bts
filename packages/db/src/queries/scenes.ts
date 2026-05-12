import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import type { ProductionReleaseDate } from '../schema/productions.ts';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

export type SceneEquipmentRow = {
  equipment_usage_id: number;
  series_slug: string;
  series_name: string;
  series_category: string;
  manufacturer_slug: string;
  manufacturer_name: string;
  item_slug: string | null;
  item_name: string | null;
  setup_label: string | null;
  usage_role: string | null;
  notes: string | null;
};

export type SceneCitation = {
  number: number;
  id: number;
  title: string;
  publication: string | null;
  author: string | null;
  published_at: string | null;
  url: string | null;
  archive_url: string | null;
  confidence: string;
  last_status: number | null;
};

export type SceneDetail = {
  production: {
    id: number;
    slug: string;
    title: string;
    release_year: number | null;
    runtime_minutes: number | null;
    poster_path: string | null;
    data_tier: 'curated' | 'imported';
    release_dates: ProductionReleaseDate[] | null;
  };
  scene: {
    id: number;
    slug: string;
    scene_number: string | null;
    title: string;
    synopsis: string | null;
    position_in_runtime_seconds: number | null;
    interior_exterior: string | null;
    time_of_day: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
  };
  equipment: SceneEquipmentRow[];
  citations: {
    sources: SceneCitation[];
    byEquipmentUsage: Record<number, number[]>;
  };
};

export async function listSceneStaticParams(
  db: SeedDb = defaultDb,
): Promise<Array<{ slug: string; sceneSlug: string }>> {
  return db.execute<{ slug: string; sceneSlug: string }>(sql`
    SELECT p.slug, sc.slug AS "sceneSlug"
    FROM scenes sc
    JOIN productions p ON p.id = sc.production_id
    WHERE p.data_tier = 'curated'
    ORDER BY p.slug, sc.slug
  `);
}

export async function getSceneWithDetail(
  db: SeedDb = defaultDb,
  productionSlug: string,
  sceneSlug: string,
): Promise<SceneDetail | null> {
  const [core] = await db.execute<{
    production_id: number;
    production_slug: string;
    production_title: string;
    release_year: number | null;
    runtime_minutes: number | null;
    poster_path: string | null;
    data_tier: 'curated' | 'imported';
    release_dates: ProductionReleaseDate[] | null;
    scene_id: number;
    scene_slug: string;
    scene_number: string | null;
    scene_title: string;
    synopsis: string | null;
    position_in_runtime_seconds: number | null;
    interior_exterior: string | null;
    time_of_day: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
  }>(sql`
    SELECT
      p.id AS production_id,
      p.slug AS production_slug,
      p.title AS production_title,
      p.release_year,
      p.runtime_minutes,
      p.poster_path,
      p.data_tier,
      p.release_dates,
      sc.id AS scene_id,
      sc.slug AS scene_slug,
      sc.scene_number,
      sc.title AS scene_title,
      sc.synopsis,
      sc.position_in_runtime_seconds,
      sc.interior_exterior,
      sc.time_of_day,
      sc.location,
      sc.created_at::text AS created_at,
      sc.updated_at::text AS updated_at
    FROM scenes sc
    JOIN productions p ON p.id = sc.production_id
    WHERE p.slug = ${productionSlug}
      AND sc.slug = ${sceneSlug}
    LIMIT 1
  `);
  if (!core) return null;

  const [equipment, sourceRows, usageSourceRows] = await Promise.all([
    db.execute<SceneEquipmentRow>(sql`
      SELECT
        eu.id AS equipment_usage_id,
        es.slug AS series_slug,
        es.name AS series_name,
        es.category AS series_category,
        em.slug AS manufacturer_slug,
        em.name AS manufacturer_name,
        ei.slug AS item_slug,
        ei.name AS item_name,
        eu.setup_label,
        eu.usage_role,
        eu.notes
      FROM equipment_usage eu
      JOIN equipment_series es ON es.id = eu.equipment_series_id
      JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
      LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
      WHERE eu.scene_id = ${core.scene_id}
      ORDER BY es.category, es.name, ei.name NULLS LAST
    `),
    db.execute<Omit<SceneCitation, 'number'>>(sql`
      WITH ids AS (
        SELECT ss.source_id, ss.confidence
        FROM scene_sources ss
        WHERE ss.scene_id = ${core.scene_id}
        UNION
        SELECT eus.source_id, eus.confidence
        FROM equipment_usage_sources eus
        JOIN equipment_usage eu ON eu.id = eus.equipment_usage_id
        WHERE eu.scene_id = ${core.scene_id}
      ),
      dedup AS (
        SELECT source_id,
               MIN(CASE confidence
                WHEN 'primary' THEN 1
                WHEN 'secondary' THEN 2
                WHEN 'manufacturer_marketing' THEN 3
                WHEN 'speculative' THEN 4
               END) AS conf_rank
        FROM ids
        GROUP BY source_id
      )
      SELECT
        s.id,
        s.title,
        s.publication,
        s.author,
        s.published_at::text AS published_at,
        s.url,
        s.archive_url,
        s.last_status,
        CASE d.conf_rank
          WHEN 1 THEN 'primary'
          WHEN 2 THEN 'secondary'
          WHEN 3 THEN 'manufacturer_marketing'
          WHEN 4 THEN 'speculative'
        END AS confidence
      FROM dedup d
      JOIN sources s ON s.id = d.source_id
      ORDER BY d.conf_rank, s.published_at DESC NULLS LAST, s.id
    `),
    db.execute<{ equipment_usage_id: number; source_id: number }>(sql`
      SELECT eus.equipment_usage_id, eus.source_id
      FROM equipment_usage_sources eus
      JOIN equipment_usage eu ON eu.id = eus.equipment_usage_id
      WHERE eu.scene_id = ${core.scene_id}
    `),
  ]);

  const numberBySourceId = new Map<number, number>();
  const sources = sourceRows.map((source, index) => {
    const number = index + 1;
    numberBySourceId.set(source.id, number);
    return { number, ...source };
  });

  const byEquipmentUsage: Record<number, number[]> = {};
  for (const row of usageSourceRows) {
    const number = numberBySourceId.get(row.source_id);
    if (!number) continue;
    (byEquipmentUsage[row.equipment_usage_id] ??= []).push(number);
  }
  for (const numbers of Object.values(byEquipmentUsage)) {
    numbers.sort((a, b) => a - b);
  }

  return {
    production: {
      id: core.production_id,
      slug: core.production_slug,
      title: core.production_title,
      release_year: core.release_year,
      runtime_minutes: core.runtime_minutes,
      poster_path: core.poster_path,
      data_tier: core.data_tier,
      release_dates: core.release_dates,
    },
    scene: {
      id: core.scene_id,
      slug: core.scene_slug,
      scene_number: core.scene_number,
      title: core.scene_title,
      synopsis: core.synopsis,
      position_in_runtime_seconds: core.position_in_runtime_seconds,
      interior_exterior: core.interior_exterior,
      time_of_day: core.time_of_day,
      location: core.location,
      created_at: core.created_at,
      updated_at: core.updated_at,
    },
    equipment,
    citations: { sources, byEquipmentUsage },
  };
}
