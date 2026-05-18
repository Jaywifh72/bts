import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

// ── Stunt companies ────────────────────────────────────────────────

export type StuntCompanyRow = {
  slug: string;
  name: string;
  founded_year: number | null;
  headquarters: string | null;
  country: string | null;
  parent_company: string | null;
  website: string | null;
  reel_url: string | null;
  careers_url: string | null;
  founder_names: string[];
  specialties: string[];
  member_count: number | null;
  summary: string | null;
  tagline: string | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  // 0060 — entity-level provenance (only surfaced on detail pages).
  data_tier?: 'curated' | 'imported';
  curated_by?: string | null;
  curated_by_url?: string | null;
  last_curated_review?: string | null;
  last_verified_at?: string | null;
};

export async function listStuntCompanies(db: SeedDb = defaultDb) {
  return db.execute<StuntCompanyRow>(sql`
    SELECT slug, name, founded_year, headquarters, country, parent_company,
           website, reel_url, careers_url, founder_names, specialties,
           member_count, summary, tagline, "references"
    FROM stunt_companies
    ORDER BY name ASC
  `);
}

export async function getStuntCompanyBySlug(db: SeedDb = defaultDb, slug: string) {
  const [row] = await db.execute<StuntCompanyRow>(sql`
    SELECT slug, name, founded_year, headquarters, country, parent_company,
           website, reel_url, careers_url, founder_names, specialties,
           member_count, summary, tagline, "references",
           data_tier, curated_by, curated_by_url,
           last_curated_review::text, last_verified_at::text
    FROM stunt_companies
    WHERE slug = ${slug}
  `);
  return row ?? null;
}

// ── Stunt schools ──────────────────────────────────────────────────

export type StuntSchoolRow = {
  slug: string;
  name: string;
  founded_year: number | null;
  headquarters: string | null;
  country: string | null;
  website: string | null;
  curriculum_disciplines: string[];
  summary: string | null;
  tagline: string | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  // 0060 — entity-level provenance (only surfaced on detail pages).
  data_tier?: 'curated' | 'imported';
  curated_by?: string | null;
  curated_by_url?: string | null;
  last_curated_review?: string | null;
  last_verified_at?: string | null;
};

export async function listStuntSchools(db: SeedDb = defaultDb) {
  return db.execute<StuntSchoolRow>(sql`
    SELECT slug, name, founded_year, headquarters, country, website,
           curriculum_disciplines, summary, tagline, "references"
    FROM stunt_schools
    ORDER BY name ASC
  `);
}

export async function getStuntSchoolBySlug(db: SeedDb = defaultDb, slug: string) {
  const [row] = await db.execute<StuntSchoolRow>(sql`
    SELECT slug, name, founded_year, headquarters, country, website,
           curriculum_disciplines, summary, tagline, "references",
           data_tier, curated_by, curated_by_url,
           last_curated_review::text, last_verified_at::text
    FROM stunt_schools
    WHERE slug = ${slug}
  `);
  return row ?? null;
}

// ── Stunt sequences (phase 3) ──────────────────────────────────────

export type SequenceCredit = {
  person_slug: string;
  display_name: string;
  role: string;
  doubling_for_person_slug: string | null;
  doubling_for_display_name: string | null;
  notes: string | null;
};

export type StuntSequenceRow = {
  id: number;
  production_id: number;
  production_slug: string;
  production_title: string;
  production_release_year: number | null;
  scene_id: number | null;
  scene_slug: string | null;
  scene_title: string | null;
  slug: string;
  name: string;
  description: string | null;
  screen_minutes: string | null;
  discipline_tags: string[];
  rigging: {
    rigs?: Array<{ type: string; manufacturer?: string; capacity_lbs?: number; notes?: string }>;
    mounts?: string[];
    harness?: string;
    notes?: string;
  };
  vehicle: {
    picture_car?: { make: string; model: string; year?: number; modifications?: string[] };
    precision_driver_person_slug?: string;
    towing_rig?: string;
    prep_company?: string;
  } | null;
  vfx_handoff_frame: number | null;
  vfx_handoff_house_slug: string | null;
  vfx_handoff_house_name: string | null;
  safety_officer_person_slug: string | null;
  safety_officer_display_name: string | null;
  safety_bulletins_followed: string[];
  bts_video_url: string | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  sort_order: number;
};

const SEQUENCE_BASE_SQL = sql`
  SELECT
    ss.id, ss.production_id, p.slug AS production_slug, p.title AS production_title,
    p.release_year AS production_release_year,
    ss.scene_id, sc.slug AS scene_slug, sc.title AS scene_title,
    ss.slug, ss.name, ss.description,
    ss.screen_minutes::text,
    ss.discipline_tags, ss.rigging, ss.vehicle,
    ss.vfx_handoff_frame,
    vh.slug AS vfx_handoff_house_slug, vh.name AS vfx_handoff_house_name,
    so.slug AS safety_officer_person_slug, so.display_name AS safety_officer_display_name,
    ss.safety_bulletins_followed, ss.bts_video_url,
    ss."references", ss.sort_order
  FROM stunt_sequences ss
  JOIN productions p ON p.id = ss.production_id
  LEFT JOIN scenes sc ON sc.id = ss.scene_id
  LEFT JOIN vfx_houses vh ON vh.id = ss.vfx_handoff_house_id
  LEFT JOIN people so ON so.id = ss.safety_officer_person_id
`;

export async function listStuntSequences(db: SeedDb = defaultDb): Promise<StuntSequenceRow[]> {
  return db.execute<StuntSequenceRow>(sql`
    ${SEQUENCE_BASE_SQL}
    ORDER BY p.release_year DESC NULLS LAST, ss.sort_order, ss.id
  `);
}

export async function listStuntSequencesForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<StuntSequenceRow[]> {
  return db.execute<StuntSequenceRow>(sql`
    ${SEQUENCE_BASE_SQL}
    WHERE ss.production_id = ${productionId}
    ORDER BY ss.sort_order, ss.id
  `);
}

export async function getStuntSequence(
  db: SeedDb = defaultDb,
  productionSlug: string,
  sequenceSlug: string,
): Promise<{ sequence: StuntSequenceRow; credits: SequenceCredit[] } | null> {
  const [sequence] = await db.execute<StuntSequenceRow>(sql`
    ${SEQUENCE_BASE_SQL}
    WHERE p.slug = ${productionSlug} AND ss.slug = ${sequenceSlug}
  `);
  if (!sequence) return null;

  const credits = await db.execute<SequenceCredit>(sql`
    SELECT
      pp.slug AS person_slug, pp.display_name,
      ssc.role, ssc.notes,
      df.slug AS doubling_for_person_slug,
      df.display_name AS doubling_for_display_name
    FROM stunt_sequence_credits ssc
    JOIN people pp ON pp.id = ssc.person_id
    LEFT JOIN people df ON df.id = ssc.doubling_for_person_id
    WHERE ssc.sequence_id = ${sequence.id}
    ORDER BY ssc.sort_order, ssc.id
  `);

  return { sequence, credits: [...credits] };
}

// ── Aggregate index stats ──────────────────────────────────────────

export async function getStuntsArchiveStats(db: SeedDb = defaultDb) {
  const [row] = await db.execute<{ companies: number; schools: number; performers: number; coordinators: number; sequences: number }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM stunt_companies) AS companies,
      (SELECT COUNT(*)::int FROM stunt_schools) AS schools,
      (SELECT COUNT(DISTINCT ca.person_id)::int
         FROM crew_assignments ca
         JOIN roles r ON r.id = ca.role_id
         WHERE r.slug IN ('stunt-performer', 'stunt-double')) AS performers,
      (SELECT COUNT(DISTINCT ca.person_id)::int
         FROM crew_assignments ca
         JOIN roles r ON r.id = ca.role_id
         WHERE r.slug IN ('stunt-coordinator', 'second-unit-director-stunts')) AS coordinators,
      (SELECT COUNT(*)::int FROM stunt_sequences) AS sequences
  `);
  return row ?? { companies: 0, schools: 0, performers: 0, coordinators: 0, sequences: 0 };
}

export type TopDoubledActorRow = {
  actor_slug: string;
  actor_name: string;
  actor_profile_path: string | null;
  doubling_count: number;
  primary_doubler_slug: string;
  primary_doubler_name: string;
  productions_listed: string[];
};

/**
 * Leaderboard of actors with the most documented stunt-doubling
 * coverage. Used on the /stunts index — surfaces "Chris Hemsworth ·
 * 2 films · doubled by Bobby Holland Hanton" as a one-line highlight.
 */
export async function getTopDoubledActors(
  db: SeedDb = defaultDb,
  limit: number = 8,
): Promise<TopDoubledActorRow[]> {
  return db.execute<TopDoubledActorRow>(sql`
    WITH per_actor AS (
      SELECT sdc.doubled_person_id,
             COUNT(*)::int AS cnt
      FROM stunt_doubling_credits sdc
      GROUP BY sdc.doubled_person_id
    ),
    primary_doubler AS (
      SELECT DISTINCT ON (sdc.doubled_person_id)
             sdc.doubled_person_id,
             sdc.doubler_person_id,
             COUNT(*)::int AS doubler_count
      FROM stunt_doubling_credits sdc
      GROUP BY sdc.doubled_person_id, sdc.doubler_person_id
      ORDER BY sdc.doubled_person_id, COUNT(*) DESC
    ),
    productions_per_actor AS (
      SELECT sdc.doubled_person_id,
             ARRAY_AGG(DISTINCT p.title ORDER BY p.title) AS titles
      FROM stunt_doubling_credits sdc
      JOIN productions p ON p.id = sdc.production_id
      GROUP BY sdc.doubled_person_id
    )
    SELECT
      actor.slug AS actor_slug,
      actor.display_name AS actor_name,
      actor.profile_path AS actor_profile_path,
      pa.cnt AS doubling_count,
      doubler.slug AS primary_doubler_slug,
      doubler.display_name AS primary_doubler_name,
      ppa.titles AS productions_listed
    FROM per_actor pa
    JOIN people actor ON actor.id = pa.doubled_person_id
    JOIN primary_doubler pd ON pd.doubled_person_id = pa.doubled_person_id
    JOIN people doubler ON doubler.id = pd.doubler_person_id
    JOIN productions_per_actor ppa ON ppa.doubled_person_id = pa.doubled_person_id
    ORDER BY pa.cnt DESC, actor.display_name
    LIMIT ${limit}
  `);
}

export type FeaturedSequenceRow = {
  production_slug: string;
  production_title: string;
  production_release_year: number | null;
  production_poster_path: string | null;
  slug: string;
  name: string;
  description: string | null;
  screen_minutes: string | null;
  discipline_tags: string[];
  credit_count: number;
};

/**
 * Most recent / most-credited stunt sequences — surfaces on the
 * /stunts index as a featured-content row.
 */
export async function listFeaturedSequences(
  db: SeedDb = defaultDb,
  limit: number = 6,
): Promise<FeaturedSequenceRow[]> {
  return db.execute<FeaturedSequenceRow>(sql`
    SELECT
      p.slug AS production_slug, p.title AS production_title,
      p.release_year AS production_release_year, p.poster_path AS production_poster_path,
      ss.slug, ss.name, ss.description,
      ss.screen_minutes::text,
      ss.discipline_tags,
      (SELECT COUNT(*)::int FROM stunt_sequence_credits WHERE sequence_id = ss.id) AS credit_count
    FROM stunt_sequences ss
    JOIN productions p ON p.id = ss.production_id
    ORDER BY (SELECT COUNT(*) FROM stunt_sequence_credits WHERE sequence_id = ss.id) DESC,
             ss.updated_at DESC
    LIMIT ${limit}
  `);
}

// ── Phase 5: rigging glossary ─────────────────────────────────────

export type RiggingCategory =
  | 'descender' | 'wire' | 'vehicle' | 'fire' | 'fall' | 'fight' | 'aerial' | 'water';

export type RiggingTechniqueRow = {
  id: number;
  slug: string;
  name: string;
  category: RiggingCategory;
  tagline: string;
  mechanism: string;
  safety_considerations: string | null;
  sag_aftra_bulletin: string | null;
  common_variants: Array<{ name: string; description: string }>;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  photos: Array<{ url: string; caption: string; credit?: string }>;
  related_discipline_tags: string[];
  sort_order: number;
  // 0081 — engineering spec fields.
  max_load_kg: number | null;
  stop_distance_m: string | null;       // numeric returns as string
  typical_g_force: string | null;
  max_height_m: string | null;
  decelerator_type: string | null;
  primary_manufacturer: string | null;
  performer_certification: string | null;
};

/**
 * Glossary list — every rigging technique grouped by category.
 * Sort order is curated within a category so the most-recognisable
 * techniques surface first (high-fall airbag before fan descender,
 * cannon-roll before pipe-ramp).
 */
export async function listRiggingTechniques(
  db: SeedDb = defaultDb,
): Promise<RiggingTechniqueRow[]> {
  return db.execute<RiggingTechniqueRow>(sql`
    SELECT id, slug, name, category, tagline, mechanism,
           safety_considerations, sag_aftra_bulletin,
           common_variants, "references", photos,
           related_discipline_tags, sort_order,
           -- 0081 spec columns — projected as NULL until migration applies.
           -- Once 0081 runs on prod, replace with the real column names.
           NULL::int AS max_load_kg,
           NULL::text AS stop_distance_m,
           NULL::text AS typical_g_force,
           NULL::text AS max_height_m,
           NULL::text AS decelerator_type,
           NULL::text AS primary_manufacturer,
           NULL::text AS performer_certification
    FROM stunt_rigging_techniques
    ORDER BY category, sort_order, name
  `);
}

export async function getRiggingTechniqueBySlug(
  db: SeedDb = defaultDb,
  slug: string,
): Promise<RiggingTechniqueRow | null> {
  const [row] = await db.execute<RiggingTechniqueRow>(sql`
    SELECT id, slug, name, category, tagline, mechanism,
           safety_considerations, sag_aftra_bulletin,
           common_variants, "references", photos,
           related_discipline_tags, sort_order,
           -- 0081 spec columns — projected as NULL until migration applies.
           -- Once 0081 runs on prod, replace with the real column names.
           NULL::int AS max_load_kg,
           NULL::text AS stop_distance_m,
           NULL::text AS typical_g_force,
           NULL::text AS max_height_m,
           NULL::text AS decelerator_type,
           NULL::text AS primary_manufacturer,
           NULL::text AS performer_certification
    FROM stunt_rigging_techniques
    WHERE slug = ${slug}
  `);
  return row ?? null;
}

export type RiggingSequenceRef = {
  production_slug: string;
  production_title: string;
  sequence_slug: string;
  sequence_name: string;
  release_year: number | null;
};

/**
 * For a given technique's `related_discipline_tags`, return every
 * stunt sequence whose `discipline_tags` overlaps. Drives the
 * "Notable productions using this rig" section on the detail page.
 */
export async function getSequencesUsingRigging(
  db: SeedDb = defaultDb,
  relatedDisciplineTags: readonly string[],
): Promise<RiggingSequenceRef[]> {
  if (relatedDisciplineTags.length === 0) return [];
  const tagArray = `{${relatedDisciplineTags.map((t) => '"' + t.replace(/"/g, '\\"') + '"').join(',')}}`;
  return db.execute<RiggingSequenceRef>(sql`
    SELECT
      p.slug AS production_slug, p.title AS production_title,
      ss.slug AS sequence_slug, ss.name AS sequence_name,
      p.release_year
    FROM stunt_sequences ss
    JOIN productions p ON p.id = ss.production_id
    WHERE ss.discipline_tags && ${tagArray}::text[]
    ORDER BY p.release_year DESC NULLS LAST, p.title, ss.name
    LIMIT 30
  `);
}

/**
 * For a sequence's `discipline_tags`, return every glossary entry
 * whose `related_discipline_tags` overlaps. Drives the
 * "Rigging glossary" cross-link on the sequence detail page.
 */
export async function getRiggingForSequence(
  db: SeedDb = defaultDb,
  disciplineTags: readonly string[],
): Promise<Pick<RiggingTechniqueRow, 'slug' | 'name' | 'category' | 'tagline'>[]> {
  if (disciplineTags.length === 0) return [];
  const tagArray = `{${disciplineTags.map((t) => '"' + t.replace(/"/g, '\\"') + '"').join(',')}}`;
  return db.execute<Pick<RiggingTechniqueRow, 'slug' | 'name' | 'category' | 'tagline'>>(sql`
    SELECT slug, name, category, tagline
    FROM stunt_rigging_techniques
    WHERE related_discipline_tags && ${tagArray}::text[]
    ORDER BY category, sort_order, name
  `);
}

// ── Phase 6: SAG-AFTRA safety bulletins ───────────────────────────

export type SafetyBulletinCategory =
  | 'firearms' | 'pyrotechnics' | 'fire' | 'animals' | 'aerial'
  | 'vehicles' | 'water' | 'stunts_general' | 'environmental' | 'medical';

export type SafetyBulletinRow = {
  id: number;
  slug: string;
  bulletin_number: string;
  title: string;
  category: SafetyBulletinCategory;
  governing_body: string;
  scope: string;
  summary: string;
  key_requirements: Array<{ heading: string; detail: string }>;
  last_revision_date: string | null;
  canonical_pdf_url: string | null;
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  related_rigging_slugs: string[];
  sort_order: number;
};

export async function listSafetyBulletins(
  db: SeedDb = defaultDb,
): Promise<SafetyBulletinRow[]> {
  return db.execute<SafetyBulletinRow>(sql`
    SELECT id, slug, bulletin_number, title, category, governing_body,
           scope, summary, key_requirements,
           last_revision_date::text,
           canonical_pdf_url, "references",
           related_rigging_slugs, sort_order
    FROM safety_bulletins
    ORDER BY category, sort_order, bulletin_number
  `);
}

export async function getSafetyBulletinBySlug(
  db: SeedDb = defaultDb,
  slug: string,
): Promise<SafetyBulletinRow | null> {
  const [row] = await db.execute<SafetyBulletinRow>(sql`
    SELECT id, slug, bulletin_number, title, category, governing_body,
           scope, summary, key_requirements,
           last_revision_date::text,
           canonical_pdf_url, "references",
           related_rigging_slugs, sort_order
    FROM safety_bulletins
    WHERE slug = ${slug}
  `);
  return row ?? null;
}

/**
 * Resolve a free-form bulletin reference (e.g. 'SAG-AFTRA Safety
 * Bulletin #14' or just 'Bulletin #14') to a row, by matching on
 * bulletin_number embedded in the string. Used by rigging glossary
 * detail pages to upgrade the plain-text bulletin reference to a
 * clickable link when a matching row exists.
 */
export async function resolveBulletinByReferenceText(
  db: SeedDb = defaultDb,
  reference: string,
): Promise<Pick<SafetyBulletinRow, 'slug' | 'bulletin_number' | 'title' | 'category'> | null> {
  const m = reference.match(/#\s*(\d+[A-Za-z]?)/);
  if (!m) return null;
  const [row] = await db.execute<Pick<SafetyBulletinRow, 'slug' | 'bulletin_number' | 'title' | 'category'>>(sql`
    SELECT slug, bulletin_number, title, category
    FROM safety_bulletins
    WHERE bulletin_number = ${m[1]}
    LIMIT 1
  `);
  return row ?? null;
}

/**
 * Bulletins that reference a given rigging technique via
 * related_rigging_slugs. Drives the cross-link block on the
 * rigging detail page.
 */
export async function getBulletinsForRigging(
  db: SeedDb = defaultDb,
  riggingSlug: string,
): Promise<Pick<SafetyBulletinRow, 'slug' | 'bulletin_number' | 'title' | 'category' | 'scope'>[]> {
  return db.execute<Pick<SafetyBulletinRow, 'slug' | 'bulletin_number' | 'title' | 'category' | 'scope'>>(sql`
    SELECT slug, bulletin_number, title, category, scope
    FROM safety_bulletins
    WHERE related_rigging_slugs @> ARRAY[${riggingSlug}]::text[]
    ORDER BY category, sort_order, bulletin_number
  `);
}

/**
 * Resolve sequence.safety_bulletins_followed (free-form text array
 * like ['Bulletin #14', 'Bulletin #4']) into bulletin row references.
 * Drives the cross-link on the sequence detail page.
 */
export async function resolveSequenceBulletins(
  db: SeedDb = defaultDb,
  bulletinReferences: readonly string[],
): Promise<Pick<SafetyBulletinRow, 'slug' | 'bulletin_number' | 'title' | 'category'>[]> {
  if (bulletinReferences.length === 0) return [];
  const numbers = bulletinReferences
    .map((r) => r.match(/#\s*(\d+[A-Za-z]?)/)?.[1])
    .filter((n): n is string => Boolean(n));
  if (numbers.length === 0) return [];
  return db.execute<Pick<SafetyBulletinRow, 'slug' | 'bulletin_number' | 'title' | 'category'>>(sql`
    SELECT slug, bulletin_number, title, category
    FROM safety_bulletins
    WHERE bulletin_number IN ${sql`(${sql.join(numbers.map((n) => sql`${n}`), sql`, `)})`}
    ORDER BY bulletin_number
  `);
}

// ── Phase 21: stunt-person work reel ──────────────────────────────

export type StuntReelVideo = {
  id: number;
  url: string;
  title: string;
  thumbnail_url: string | null;
  channel_name: string | null;
  category: string;
  /** the production the video belongs to, surfaced so the card can label it */
  production_slug: string;
  production_title: string;
};

export type StuntReelKeyframe = {
  id: number;
  image_url: string;
  caption: string | null;
  production_slug: string;
  production_title: string;
};

/**
 * "Selected work" reel for a stunt person — surfaces stunt-related
 * videos and keyframes from every production where the person has
 * a stunt credit, drawn from any of:
 *   • crew_assignments with role.category = 'stunts'
 *   • stunt_sequence_credits
 *   • stunt_doubling_credits (as the doubler)
 *
 * Videos are restricted to stunts / behind_the_scenes / making_of
 * categories on published rows so the reel reads as performance
 * footage rather than trailers.
 */
export async function getStuntPersonReel(
  db: SeedDb = defaultDb,
  personSlug: string,
): Promise<{ videos: StuntReelVideo[]; keyframes: StuntReelKeyframe[] }> {
  // Phase 26 — augmented to additionally surface media that has
  // been DIRECTLY associated with this person via media_associations
  // (entity_type='person', role IN ('reel', 'subject', 'credit_holder')).
  // Direct associations take precedence in the result ordering since
  // they're explicit editorial curation; production-derived results
  // fill the rest. URL-deduped via UNION on pv.url so a video that's
  // both directly tagged AND derived from a production credit shows
  // once.
  const personRow = await db.execute<{ id: number }>(sql`
    SELECT id FROM people WHERE slug = ${personSlug}
  `);
  if (personRow.length === 0) return { videos: [], keyframes: [] };
  const personId = personRow[0]!.id;

  const productionIds = await db.execute<{ production_id: number }>(sql`
    SELECT DISTINCT ca.production_id
    FROM crew_assignments ca
    JOIN roles r ON r.id = ca.role_id
    WHERE ca.person_id = ${personId} AND r.category = 'stunts'
    UNION
    SELECT DISTINCT ss.production_id
    FROM stunt_sequence_credits ssc
    JOIN stunt_sequences ss ON ss.id = ssc.sequence_id
    WHERE ssc.person_id = ${personId}
    UNION
    SELECT DISTINCT sdc.production_id
    FROM stunt_doubling_credits sdc
    WHERE sdc.doubler_person_id = ${personId}
  `);
  const ids = productionIds.map((r) => r.production_id);
  const idArrayLiteral = ids.length > 0 ? `{${ids.join(',')}}` : '{}';

  const [videos, keyframes] = await Promise.all([
    db.execute<StuntReelVideo>(sql`
      WITH direct AS (
        -- Direct person→media associations (Phase 22 pattern).
        SELECT mas.url, mas.id AS asset_id, mas.title, mas.thumbnail_url,
               mas.credit AS channel_name,
               COALESCE(mas.metadata->>'category', 'reel') AS category,
               0 AS rank
        FROM media_associations ma
        JOIN media_assets mas ON mas.id = ma.media_asset_id
        WHERE ma.entity_type = 'person'
          AND ma.entity_id = ${personId}
          AND ma.role IN ('reel', 'subject', 'credit_holder')
          AND mas.kind = 'video'
      ),
      production_derived AS (
        -- Backward-compat path: stunt-relevant videos from
        -- productions where the person has a credit.
        SELECT pv.url, NULL::bigint AS asset_id, pv.title, pv.thumbnail_url,
               pv.channel_name, pv.category::text, 1 AS rank
        FROM production_videos pv
        WHERE pv.production_id = ANY(${idArrayLiteral}::bigint[])
          AND pv.status = 'published'
          AND pv.category IN ('stunts', 'behind_the_scenes', 'making_of')
      ),
      unioned AS (
        SELECT * FROM direct
        UNION
        SELECT pd.* FROM production_derived pd
        WHERE NOT EXISTS (SELECT 1 FROM direct d WHERE d.url = pd.url)
      )
      SELECT
        ROW_NUMBER() OVER ()::int AS id,
        u.url, u.title, u.thumbnail_url, u.channel_name,
        u.category,
        COALESCE(p_video.production_slug, p_direct.production_slug, '') AS production_slug,
        COALESCE(p_video.production_title, p_direct.production_title, '') AS production_title
      FROM unioned u
      LEFT JOIN LATERAL (
        SELECT p.slug AS production_slug, p.title AS production_title
        FROM production_videos pv
        JOIN productions p ON p.id = pv.production_id
        WHERE pv.url = u.url AND pv.production_id = ANY(${idArrayLiteral}::bigint[])
        LIMIT 1
      ) p_video ON TRUE
      LEFT JOIN LATERAL (
        SELECT p.slug AS production_slug, p.title AS production_title
        FROM media_associations ma2
        JOIN productions p ON p.id = ma2.entity_id
        WHERE ma2.media_asset_id = u.asset_id
          AND ma2.entity_type = 'production'
        LIMIT 1
      ) p_direct ON u.asset_id IS NOT NULL
      ORDER BY u.rank,
        CASE u.category WHEN 'stunts' THEN 0 WHEN 'behind_the_scenes' THEN 1 ELSE 2 END,
        u.title
      LIMIT 12
    `),
    db.execute<StuntReelKeyframe>(sql`
      SELECT pk.id, pk.image_url, pk.caption,
             p.slug AS production_slug, p.title AS production_title
      FROM production_keyframes pk
      JOIN productions p ON p.id = pk.production_id
      WHERE pk.production_id = ANY(${idArrayLiteral}::bigint[])
      ORDER BY pk.sort_order, pk.id
      LIMIT 8
    `),
  ]);

  return { videos: [...videos], keyframes: [...keyframes] };
}

// ── Phase 8: company memberships + doubling history ───────────────

export type CompanyMemberRow = {
  person_slug: string;
  display_name: string;
  profile_path: string | null;
  member_role: string;
  is_principal: boolean;
  joined_year: number | null;
  left_year: number | null;
  primary_role: string | null;
  doubles_for: string[];
  /** count of stunt-related crew_assignments + sequence_credits + doubling_credits for the member */
  credit_count: number;
};

/**
 * Members of a stunt company, principals first, then by sort_order.
 * Each row carries enough hydration to render a card without a
 * second query — slug, display_name, profile_path, primary stunt
 * role, and a credit count to show how active the member is.
 */
export async function listCompanyMembers(
  db: SeedDb = defaultDb,
  companySlug: string,
): Promise<CompanyMemberRow[]> {
  return db.execute<CompanyMemberRow>(sql`
    WITH company AS (
      SELECT id FROM stunt_companies WHERE slug = ${companySlug}
    ),
    member_credits AS (
      SELECT scm.person_id,
             (SELECT COUNT(*)::int FROM crew_assignments ca
                JOIN roles r ON r.id = ca.role_id
                WHERE ca.person_id = scm.person_id AND r.category = 'stunts') +
             (SELECT COUNT(*)::int FROM stunt_sequence_credits ssc
                WHERE ssc.person_id = scm.person_id) +
             (SELECT COUNT(*)::int FROM stunt_doubling_credits sdc
                WHERE sdc.doubler_person_id = scm.person_id)
             AS n
      FROM stunt_company_members scm, company
      WHERE scm.company_id = company.id
    ),
    primary_role AS (
      SELECT ca.person_id,
             r.name AS role_name,
             ROW_NUMBER() OVER (
               PARTITION BY ca.person_id
               ORDER BY COUNT(*) DESC, r.name
             ) AS rn
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      WHERE r.category = 'stunts'
      GROUP BY ca.person_id, r.name
    )
    SELECT
      p.slug AS person_slug,
      p.display_name,
      p.profile_path,
      scm.member_role,
      scm.is_principal,
      scm.joined_year,
      scm.left_year,
      pr.role_name AS primary_role,
      p.doubles_for,
      COALESCE(mc.n, 0) AS credit_count
    FROM stunt_company_members scm
    JOIN company ON scm.company_id = company.id
    JOIN people p ON p.id = scm.person_id
    LEFT JOIN primary_role pr ON pr.person_id = p.id AND pr.rn = 1
    LEFT JOIN member_credits mc ON mc.person_id = p.id
    ORDER BY scm.is_principal DESC, scm.sort_order, p.display_name
  `);
}

export type CompanyProductionRow = {
  production_slug: string;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  member_count: number;
  member_names: string[];
};

/**
 * Productions a stunt company has worked on. Derived: a production
 * is "associated with" the company if any current/historical member
 * has a stunt-credit on it (via crew_assignments, stunt_sequence_credits,
 * or stunt_doubling_credits). Sorted newest-first.
 */
export async function listCompanyProductions(
  db: SeedDb = defaultDb,
  companySlug: string,
  limit: number = 60,
): Promise<CompanyProductionRow[]> {
  return db.execute<CompanyProductionRow>(sql`
    WITH company AS (
      SELECT id FROM stunt_companies WHERE slug = ${companySlug}
    ),
    member_pids AS (
      SELECT DISTINCT scm.person_id
      FROM stunt_company_members scm, company
      WHERE scm.company_id = company.id
    ),
    member_production AS (
      SELECT DISTINCT ca.production_id, ca.person_id
      FROM crew_assignments ca
      JOIN member_pids m ON m.person_id = ca.person_id
      JOIN roles r ON r.id = ca.role_id
      WHERE r.category = 'stunts'
      UNION
      SELECT DISTINCT ss.production_id, ssc.person_id
      FROM stunt_sequence_credits ssc
      JOIN stunt_sequences ss ON ss.id = ssc.sequence_id
      JOIN member_pids m ON m.person_id = ssc.person_id
      UNION
      SELECT DISTINCT sdc.production_id, sdc.doubler_person_id
      FROM stunt_doubling_credits sdc
      JOIN member_pids m ON m.person_id = sdc.doubler_person_id
    )
    SELECT
      p.slug AS production_slug,
      p.title,
      p.release_year,
      p.poster_path,
      COUNT(DISTINCT mp.person_id)::int AS member_count,
      ARRAY_AGG(DISTINCT pp.display_name ORDER BY pp.display_name) AS member_names
    FROM member_production mp
    JOIN productions p ON p.id = mp.production_id
    JOIN people pp ON pp.id = mp.person_id
    GROUP BY p.id, p.slug, p.title, p.release_year, p.poster_path
    ORDER BY p.release_year DESC NULLS LAST, p.title
    LIMIT ${limit}
  `);
}

export type DoublingCreditRow = {
  id: number;
  production_slug: string;
  production_title: string;
  release_year: number | null;
  poster_path: string | null;
  doubler_slug: string;
  doubler_name: string;
  doubled_slug: string;
  doubled_name: string;
  kind: string;
  character_name: string | null;
  notes: string | null;
};

/**
 * Doubling history for a person. `role: 'doubler'` returns every
 * production where this person doubled someone else (powers the stunt-
 * performer page's "I doubled" block); `role: 'doubled'` returns the
 * inverse — who has doubled this person (powers the actor crew page's
 * "doubled by" block).
 *
 * Consolidated during the QA pass — the two functions were byte-for-byte
 * identical except for the WHERE clause swap.
 */
export async function getDoublingHistory(
  db: SeedDb = defaultDb,
  personSlug: string,
  role: 'doubler' | 'doubled' = 'doubler',
): Promise<DoublingCreditRow[]> {
  const whereClause = role === 'doubler'
    ? sql`doubler.slug = ${personSlug}`
    : sql`doubled.slug = ${personSlug}`;
  return db.execute<DoublingCreditRow>(sql`
    SELECT
      sdc.id,
      p.slug AS production_slug, p.title AS production_title,
      p.release_year, p.poster_path,
      doubler.slug AS doubler_slug, doubler.display_name AS doubler_name,
      doubled.slug AS doubled_slug, doubled.display_name AS doubled_name,
      sdc.kind::text AS kind,
      sdc.character_name,
      sdc.notes
    FROM stunt_doubling_credits sdc
    JOIN productions p ON p.id = sdc.production_id
    JOIN people doubler ON doubler.id = sdc.doubler_person_id
    JOIN people doubled ON doubled.id = sdc.doubled_person_id
    WHERE ${whereClause}
    ORDER BY p.release_year DESC NULLS LAST, p.title
  `);
}

/**
 * @deprecated use getDoublingHistory(db, slug, 'doubler') directly.
 * Kept as a thin alias so existing callers in apps/web continue to work
 * during the migration window.
 */
export async function getDoublingHistoryForPerson(
  db: SeedDb = defaultDb,
  personSlug: string,
): Promise<DoublingCreditRow[]> {
  return getDoublingHistory(db, personSlug, 'doubler');
}

export type ProductionStuntCrewRow = {
  person_slug: string;
  display_name: string;
  profile_path: string | null;
  role_slug: string;
  role_name: string;
  credit_name_override: string | null;
  notes: string | null;
  /** present when this person is in stunt_company_members for at least one company */
  primary_company_slug: string | null;
  primary_company_name: string | null;
};

/**
 * The stunt-department crew on a production — every credit_assignment
 * whose role.category = 'stunts'. Coordinators surface first, then
 * the rest in person-name order.
 *
 * If the person carries a company affiliation (via stunt_company_members),
 * the page can render the company link inline so the operator sees
 * "Monique Ganderton — Stunt Coordinator (87Eleven)" without a
 * second roundtrip.
 */
export async function getStuntCrewForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionStuntCrewRow[]> {
  return db.execute<ProductionStuntCrewRow>(sql`
    SELECT
      pp.slug AS person_slug,
      pp.display_name,
      pp.profile_path,
      r.slug AS role_slug,
      r.name AS role_name,
      ca.credit_name_override,
      ca.notes,
      sc.slug AS primary_company_slug,
      sc.name AS primary_company_name
    FROM crew_assignments ca
    JOIN people pp ON pp.id = ca.person_id
    JOIN roles r ON r.id = ca.role_id
    LEFT JOIN LATERAL (
      SELECT scm.company_id
      FROM stunt_company_members scm
      WHERE scm.person_id = pp.id
      ORDER BY scm.is_principal DESC, scm.sort_order
      LIMIT 1
    ) primary_membership ON TRUE
    LEFT JOIN stunt_companies sc ON sc.id = primary_membership.company_id
    WHERE ca.production_id = ${productionId}
      AND r.category = 'stunts'
    ORDER BY
      CASE r.slug
        WHEN 'stunt-coordinator' THEN 0
        WHEN 'second-unit-director-stunts' THEN 1
        WHEN 'fight-choreographer' THEN 2
        ELSE 9
      END,
      pp.display_name
  `);
}

export type ProductionDoublingRow = {
  id: number;
  doubler_slug: string;
  doubler_name: string;
  doubler_profile_path: string | null;
  doubler_company_slug: string | null;
  doubled_slug: string;
  doubled_name: string;
  doubled_profile_path: string | null;
  kind: string;
  character_name: string | null;
  notes: string | null;
};

/**
 * Doubling credits associated with a single production. Powers the
 * Stunts block on /films/[slug] — the actor↔doubler pairs that
 * worked on this film, with character names so the reader can match
 * each pair to the on-screen role.
 */
export async function getDoublingCreditsForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionDoublingRow[]> {
  return db.execute<ProductionDoublingRow>(sql`
    SELECT
      sdc.id,
      doubler.slug AS doubler_slug,
      doubler.display_name AS doubler_name,
      doubler.profile_path AS doubler_profile_path,
      doubler.stunt_company_slug AS doubler_company_slug,
      doubled.slug AS doubled_slug,
      doubled.display_name AS doubled_name,
      doubled.profile_path AS doubled_profile_path,
      sdc.kind::text AS kind,
      sdc.character_name,
      sdc.notes
    FROM stunt_doubling_credits sdc
    JOIN people doubler ON doubler.id = sdc.doubler_person_id
    JOIN people doubled ON doubled.id = sdc.doubled_person_id
    WHERE sdc.production_id = ${productionId}
    ORDER BY
      CASE sdc.kind::text WHEN 'primary_double' THEN 0 ELSE 1 END,
      doubler.display_name
  `);
}

export type ProductionStuntCompanyRow = {
  slug: string;
  name: string;
  member_count: number;
  member_names: string[];
};

/**
 * Stunt companies associated with a production — derived: a company
 * is "on" a production if any of its members has a stunt-credit on
 * that production (crew_assignments / sequence credits / doubling
 * credits). Member-name list lets the page render which performers
 * brought the company onto this film.
 */
export async function getStuntCompaniesForProduction(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionStuntCompanyRow[]> {
  return db.execute<ProductionStuntCompanyRow>(sql`
    WITH crew_pids AS (
      SELECT DISTINCT ca.person_id
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.production_id = ${productionId}
        AND r.category = 'stunts'
      UNION
      SELECT DISTINCT ssc.person_id
      FROM stunt_sequence_credits ssc
      JOIN stunt_sequences ss ON ss.id = ssc.sequence_id
      WHERE ss.production_id = ${productionId}
      UNION
      SELECT DISTINCT sdc.doubler_person_id AS person_id
      FROM stunt_doubling_credits sdc
      WHERE sdc.production_id = ${productionId}
    ),
    company_membership AS (
      SELECT DISTINCT scm.company_id, scm.person_id
      FROM stunt_company_members scm
      JOIN crew_pids cp ON cp.person_id = scm.person_id
    )
    SELECT
      sc.slug,
      sc.name,
      COUNT(DISTINCT cm.person_id)::int AS member_count,
      ARRAY_AGG(DISTINCT p.display_name ORDER BY p.display_name) AS member_names
    FROM company_membership cm
    JOIN stunt_companies sc ON sc.id = cm.company_id
    JOIN people p ON p.id = cm.person_id
    GROUP BY sc.id, sc.slug, sc.name
    ORDER BY member_count DESC, sc.name
  `);
}

/**
 * @deprecated use getDoublingHistory(db, slug, 'doubled') directly.
 */
export async function getDoublingHistoryForActor(
  db: SeedDb = defaultDb,
  actorSlug: string,
): Promise<DoublingCreditRow[]> {
  return getDoublingHistory(db, actorSlug, 'doubled');
}
