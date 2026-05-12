import 'server-only';
import { db, sql } from '@bts/db';
import type { EntityConfig, FieldConfig } from './entity-registry';

/**
 * Coerce an HTML form-encoded value into the typed shape an INSERT
 * expects. Handles plain scalars; jsonb arrays come through as
 * JSON-stringified hidden fields and need a JSON.parse.
 */
function valueOf(form: FormData, field: FieldConfig): unknown {
  const raw = form.get(field.name);
  if (raw === null || raw === undefined) {
    if (field.default !== undefined) return field.default;
    return null;
  }
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (s === '') {
    if (field.default !== undefined) return field.default;
    return null;
  }
  switch (field.type) {
    case 'integer':
    case 'number': {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    case 'date':
      return s;
    case 'tags': {
      // Chip input writes a single hidden field with comma-separated tags
      // (the client component normalises whitespace + dedupes).
      const tags = s.split(',').map((t) => t.trim()).filter(Boolean);
      return tags;
    }
    case 'references':
    case 'kv-array':
    case 'photo-array':
      try {
        return JSON.parse(s);
      } catch {
        return [];
      }
    default:
      return s;
  }
}

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((x) => '"' + x.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

/**
 * Validate the form against the entity's required fields. Returns the
 * field name that's missing, or null if all required fields are present.
 */
function findMissingRequired(form: FormData, entity: EntityConfig): string | null {
  const all: FieldConfig[] = [
    ...entity.identification, ...entity.editorial, ...entity.structured, ...entity.jsonb,
  ];
  for (const f of all) {
    if (!f.required) continue;
    const v = form.get(f.name);
    if (v === null || (typeof v === 'string' && v.trim() === '')) return f.name;
  }
  return null;
}

export type CreateEntityResult =
  | { ok: true; slug: string; outcome: 'inserted' }
  | { ok: false; error: string; field?: string };

// ── Per-entity inserters ──────────────────────────────────────────

async function insertVfxHouse(form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  if (!slug || !name) return { ok: false, error: 'slug and name are required' };

  const tagline = (form.get('tagline') as string | null)?.trim() || null;
  const summary = (form.get('summary') as string | null)?.trim() || null;
  const founded_year = Number(form.get('founded_year')) || null;
  const headquarters = (form.get('headquarters') as string | null)?.trim() || null;
  const country = (form.get('country') as string | null)?.trim() || null;
  const parent_company = (form.get('parent_company') as string | null)?.trim() || null;
  const kind = (form.get('kind') as string | null)?.trim() || null;
  const website = (form.get('website') as string | null)?.trim() || null;
  const reel_url = (form.get('reel_url') as string | null)?.trim() || null;
  const careers_url = (form.get('careers_url') as string | null)?.trim() || null;
  const wikidata_id = (form.get('wikidata_id') as string | null)?.trim() || null;
  const specialties = (String(form.get('specialties') ?? '').trim().split(',').map((s) => s.trim()).filter(Boolean));
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      INSERT INTO vfx_houses
        (slug, name, founded_year, headquarters, country, parent_company,
         website, kind, specialties, tagline, summary,
         reel_url, careers_url, wikidata_id, "references")
      VALUES
        (${slug}, ${name}, ${founded_year}, ${headquarters}, ${country}, ${parent_company},
         ${website}, ${kind}, ${pgTextArray(specialties)}::text[],
         ${tagline}, ${summary},
         ${reel_url}, ${careers_url}, ${wikidata_id},
         ${JSON.stringify(references)}::jsonb)
      RETURNING slug
    `);
    return { ok: true, slug: row!.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function insertStuntCompany(form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  if (!slug || !name) return { ok: false, error: 'slug and name are required' };

  const tagline = (form.get('tagline') as string | null)?.trim() || null;
  const summary = (form.get('summary') as string | null)?.trim() || null;
  const founded_year = Number(form.get('founded_year')) || null;
  const headquarters = (form.get('headquarters') as string | null)?.trim() || null;
  const country = (form.get('country') as string | null)?.trim() || null;
  const parent_company = (form.get('parent_company') as string | null)?.trim() || null;
  const member_count = Number(form.get('member_count')) || null;
  const website = (form.get('website') as string | null)?.trim() || null;
  const reel_url = (form.get('reel_url') as string | null)?.trim() || null;
  const careers_url = (form.get('careers_url') as string | null)?.trim() || null;
  const wikidata_id = (form.get('wikidata_id') as string | null)?.trim() || null;
  const specialties = String(form.get('specialties') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const founder_names = String(form.get('founder_names') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      INSERT INTO stunt_companies
        (slug, name, founded_year, headquarters, country, parent_company,
         website, member_count, founder_names, specialties,
         tagline, summary, reel_url, careers_url, wikidata_id, "references")
      VALUES
        (${slug}, ${name}, ${founded_year}, ${headquarters}, ${country}, ${parent_company},
         ${website}, ${member_count},
         ${pgTextArray(founder_names)}::text[],
         ${pgTextArray(specialties)}::text[],
         ${tagline}, ${summary},
         ${reel_url}, ${careers_url}, ${wikidata_id},
         ${JSON.stringify(references)}::jsonb)
      RETURNING slug
    `);
    return { ok: true, slug: row!.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function insertStuntRigging(form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  const category = String(form.get('category') ?? '').trim();
  const tagline = String(form.get('tagline') ?? '').trim();
  const mechanism = String(form.get('mechanism') ?? '').trim();
  if (!slug || !name || !category || !tagline || !mechanism) {
    return { ok: false, error: 'slug, name, category, tagline, mechanism are all required' };
  }
  const safety = (form.get('safety_considerations') as string | null)?.trim() || null;
  const bulletin = (form.get('sag_aftra_bulletin') as string | null)?.trim() || null;
  const sort_order = Number(form.get('sort_order')) || 100;
  const tags = String(form.get('related_discipline_tags') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const variants = JSON.parse(String(form.get('common_variants') ?? '[]') || '[]');
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');
  const photos = JSON.parse(String(form.get('photos') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      INSERT INTO stunt_rigging_techniques
        (slug, name, category, tagline, mechanism,
         safety_considerations, sag_aftra_bulletin,
         common_variants, "references", photos,
         related_discipline_tags, sort_order)
      VALUES
        (${slug}, ${name}, ${category}::stunt_rigging_category_enum,
         ${tagline}, ${mechanism},
         ${safety}, ${bulletin},
         ${JSON.stringify(variants)}::jsonb,
         ${JSON.stringify(references)}::jsonb,
         ${JSON.stringify(photos)}::jsonb,
         ${pgTextArray(tags)}::text[],
         ${sort_order})
      RETURNING slug
    `);
    return { ok: true, slug: row!.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function insertSafetyBulletin(form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const number = String(form.get('bulletin_number') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  const category = String(form.get('category') ?? '').trim();
  const scope = String(form.get('scope') ?? '').trim();
  const summary = String(form.get('summary') ?? '').trim();
  if (!slug || !number || !title || !category || !scope || !summary) {
    return { ok: false, error: 'slug, bulletin_number, title, category, scope, summary are all required' };
  }
  const governing_body = (form.get('governing_body') as string | null)?.trim() || 'SAG-AFTRA';
  const last_revision_date = (form.get('last_revision_date') as string | null)?.trim() || null;
  const canonical_pdf_url = (form.get('canonical_pdf_url') as string | null)?.trim() || null;
  const sort_order = Number(form.get('sort_order')) || 100;
  const rigging_slugs = String(form.get('related_rigging_slugs') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const requirements = JSON.parse(String(form.get('key_requirements') ?? '[]') || '[]');
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      INSERT INTO safety_bulletins
        (slug, bulletin_number, title, category, governing_body,
         scope, summary, key_requirements,
         last_revision_date, canonical_pdf_url,
         "references", related_rigging_slugs, sort_order)
      VALUES
        (${slug}, ${number}, ${title},
         ${category}::safety_bulletin_category_enum,
         ${governing_body},
         ${scope}, ${summary},
         ${JSON.stringify(requirements)}::jsonb,
         ${last_revision_date ? sql`${last_revision_date}::date` : sql`NULL`},
         ${canonical_pdf_url},
         ${JSON.stringify(references)}::jsonb,
         ${pgTextArray(rigging_slugs)}::text[],
         ${sort_order})
      RETURNING slug
    `);
    return { ok: true, slug: row!.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const INSERTERS: Record<string, (form: FormData) => Promise<CreateEntityResult>> = {
  'vfx-house': insertVfxHouse,
  'stunt-company': insertStuntCompany,
  'stunt-rigging': insertStuntRigging,
  'safety-bulletin': insertSafetyBulletin,
};

export async function createEntity(
  type: string,
  form: FormData,
): Promise<CreateEntityResult> {
  const inserter = INSERTERS[type];
  if (!inserter) return { ok: false, error: `Unknown entity type: ${type}` };
  return inserter(form);
}

/**
 * Per-table count for the landing page. We don't strictly need this
 * to be in a query module since it's only ever called from the admin
 * landing — keeping it here keeps the entity-creation surface area
 * cohesive.
 */
export async function countEntities(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const rows = await db.execute<{ table_name: string; n: number }>(sql`
    SELECT 'vfx_houses' AS table_name, COUNT(*)::int AS n FROM vfx_houses
    UNION ALL
    SELECT 'stunt_companies', COUNT(*)::int FROM stunt_companies
    UNION ALL
    SELECT 'stunt_rigging_techniques', COUNT(*)::int FROM stunt_rigging_techniques
    UNION ALL
    SELECT 'safety_bulletins', COUNT(*)::int FROM safety_bulletins
  `);
  for (const r of rows) out[r.table_name] = r.n;
  return out;
}

// ── Edit-side: fetch existing row + dispatch UPDATE ────────────────

/**
 * Read an entity row keyed by (type, slug) and shape it as a flat
 * record the form fields can use as `existingValue`. Returns null
 * if the type is unknown or the slug doesn't resolve.
 */
export async function getEntityForEdit(
  type: string,
  slug: string,
): Promise<Record<string, unknown> | null> {
  switch (type) {
    case 'vfx-house': {
      const [row] = await db.execute<Record<string, unknown>>(sql`
        SELECT slug, name, founded_year, headquarters, country, parent_company,
               website, kind, specialties, tagline, summary,
               reel_url, careers_url, wikidata_id, "references"
        FROM vfx_houses WHERE slug = ${slug}
      `);
      return row ?? null;
    }
    case 'stunt-company': {
      const [row] = await db.execute<Record<string, unknown>>(sql`
        SELECT slug, name, founded_year, headquarters, country, parent_company,
               website, member_count, founder_names, specialties,
               tagline, summary, reel_url, careers_url, wikidata_id, "references"
        FROM stunt_companies WHERE slug = ${slug}
      `);
      return row ?? null;
    }
    case 'stunt-rigging': {
      const [row] = await db.execute<Record<string, unknown>>(sql`
        SELECT slug, name, category::text AS category, tagline, mechanism,
               safety_considerations, sag_aftra_bulletin,
               common_variants, "references", photos,
               related_discipline_tags, sort_order
        FROM stunt_rigging_techniques WHERE slug = ${slug}
      `);
      return row ?? null;
    }
    case 'safety-bulletin': {
      const [row] = await db.execute<Record<string, unknown>>(sql`
        SELECT slug, bulletin_number, title, category::text AS category,
               governing_body, scope, summary, key_requirements,
               last_revision_date::text AS last_revision_date,
               canonical_pdf_url, "references", related_rigging_slugs, sort_order
        FROM safety_bulletins WHERE slug = ${slug}
      `);
      return row ?? null;
    }
    default:
      return null;
  }
}

/**
 * Per-entity UPDATE dispatchers. Symmetric with the insert family —
 * keyed on the *original* slug from the URL, so even slug renames
 * are supported (the form's slug field becomes the new value, the
 * URL parameter is the row identifier).
 */

async function updateVfxHouse(originalSlug: string, form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  if (!slug || !name) return { ok: false, error: 'slug and name are required' };

  const tagline = (form.get('tagline') as string | null)?.trim() || null;
  const summary = (form.get('summary') as string | null)?.trim() || null;
  const founded_year = Number(form.get('founded_year')) || null;
  const headquarters = (form.get('headquarters') as string | null)?.trim() || null;
  const country = (form.get('country') as string | null)?.trim() || null;
  const parent_company = (form.get('parent_company') as string | null)?.trim() || null;
  const kind = (form.get('kind') as string | null)?.trim() || null;
  const website = (form.get('website') as string | null)?.trim() || null;
  const reel_url = (form.get('reel_url') as string | null)?.trim() || null;
  const careers_url = (form.get('careers_url') as string | null)?.trim() || null;
  const wikidata_id = (form.get('wikidata_id') as string | null)?.trim() || null;
  const specialties = String(form.get('specialties') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      UPDATE vfx_houses SET
        slug = ${slug}, name = ${name},
        founded_year = ${founded_year}, headquarters = ${headquarters},
        country = ${country}, parent_company = ${parent_company},
        website = ${website}, kind = ${kind},
        specialties = ${pgTextArray(specialties)}::text[],
        tagline = ${tagline}, summary = ${summary},
        reel_url = ${reel_url}, careers_url = ${careers_url},
        wikidata_id = ${wikidata_id},
        "references" = ${JSON.stringify(references)}::jsonb,
        updated_at = NOW()
      WHERE slug = ${originalSlug}
      RETURNING slug
    `);
    if (!row) return { ok: false, error: `No vfx_house with slug ${originalSlug}` };
    return { ok: true, slug: row.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function updateStuntCompany(originalSlug: string, form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  if (!slug || !name) return { ok: false, error: 'slug and name are required' };

  const tagline = (form.get('tagline') as string | null)?.trim() || null;
  const summary = (form.get('summary') as string | null)?.trim() || null;
  const founded_year = Number(form.get('founded_year')) || null;
  const headquarters = (form.get('headquarters') as string | null)?.trim() || null;
  const country = (form.get('country') as string | null)?.trim() || null;
  const parent_company = (form.get('parent_company') as string | null)?.trim() || null;
  const member_count = Number(form.get('member_count')) || null;
  const website = (form.get('website') as string | null)?.trim() || null;
  const reel_url = (form.get('reel_url') as string | null)?.trim() || null;
  const careers_url = (form.get('careers_url') as string | null)?.trim() || null;
  const wikidata_id = (form.get('wikidata_id') as string | null)?.trim() || null;
  const specialties = String(form.get('specialties') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const founder_names = String(form.get('founder_names') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      UPDATE stunt_companies SET
        slug = ${slug}, name = ${name},
        founded_year = ${founded_year}, headquarters = ${headquarters},
        country = ${country}, parent_company = ${parent_company},
        website = ${website}, member_count = ${member_count},
        founder_names = ${pgTextArray(founder_names)}::text[],
        specialties = ${pgTextArray(specialties)}::text[],
        tagline = ${tagline}, summary = ${summary},
        reel_url = ${reel_url}, careers_url = ${careers_url},
        wikidata_id = ${wikidata_id},
        "references" = ${JSON.stringify(references)}::jsonb,
        updated_at = NOW()
      WHERE slug = ${originalSlug}
      RETURNING slug
    `);
    if (!row) return { ok: false, error: `No stunt_company with slug ${originalSlug}` };
    return { ok: true, slug: row.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function updateStuntRigging(originalSlug: string, form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const name = String(form.get('name') ?? '').trim();
  const category = String(form.get('category') ?? '').trim();
  const tagline = String(form.get('tagline') ?? '').trim();
  const mechanism = String(form.get('mechanism') ?? '').trim();
  if (!slug || !name || !category || !tagline || !mechanism) {
    return { ok: false, error: 'slug, name, category, tagline, mechanism are all required' };
  }
  const safety = (form.get('safety_considerations') as string | null)?.trim() || null;
  const bulletin = (form.get('sag_aftra_bulletin') as string | null)?.trim() || null;
  const sort_order = Number(form.get('sort_order')) || 100;
  const tags = String(form.get('related_discipline_tags') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const variants = JSON.parse(String(form.get('common_variants') ?? '[]') || '[]');
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');
  const photos = JSON.parse(String(form.get('photos') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      UPDATE stunt_rigging_techniques SET
        slug = ${slug}, name = ${name},
        category = ${category}::stunt_rigging_category_enum,
        tagline = ${tagline}, mechanism = ${mechanism},
        safety_considerations = ${safety},
        sag_aftra_bulletin = ${bulletin},
        common_variants = ${JSON.stringify(variants)}::jsonb,
        "references" = ${JSON.stringify(references)}::jsonb,
        photos = ${JSON.stringify(photos)}::jsonb,
        related_discipline_tags = ${pgTextArray(tags)}::text[],
        sort_order = ${sort_order},
        updated_at = NOW()
      WHERE slug = ${originalSlug}
      RETURNING slug
    `);
    if (!row) return { ok: false, error: `No stunt_rigging_technique with slug ${originalSlug}` };
    return { ok: true, slug: row.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function updateSafetyBulletin(originalSlug: string, form: FormData): Promise<CreateEntityResult> {
  const slug = String(form.get('slug') ?? '').trim();
  const number = String(form.get('bulletin_number') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  const category = String(form.get('category') ?? '').trim();
  const scope = String(form.get('scope') ?? '').trim();
  const summary = String(form.get('summary') ?? '').trim();
  if (!slug || !number || !title || !category || !scope || !summary) {
    return { ok: false, error: 'all required fields must be set' };
  }
  const governing_body = (form.get('governing_body') as string | null)?.trim() || 'SAG-AFTRA';
  const last_revision_date = (form.get('last_revision_date') as string | null)?.trim() || null;
  const canonical_pdf_url = (form.get('canonical_pdf_url') as string | null)?.trim() || null;
  const sort_order = Number(form.get('sort_order')) || 100;
  const rigging_slugs = String(form.get('related_rigging_slugs') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const requirements = JSON.parse(String(form.get('key_requirements') ?? '[]') || '[]');
  const references = JSON.parse(String(form.get('references') ?? '[]') || '[]');

  try {
    const [row] = await db.execute<{ slug: string }>(sql`
      UPDATE safety_bulletins SET
        slug = ${slug}, bulletin_number = ${number}, title = ${title},
        category = ${category}::safety_bulletin_category_enum,
        governing_body = ${governing_body},
        scope = ${scope}, summary = ${summary},
        key_requirements = ${JSON.stringify(requirements)}::jsonb,
        last_revision_date = ${last_revision_date ? sql`${last_revision_date}::date` : sql`NULL`},
        canonical_pdf_url = ${canonical_pdf_url},
        "references" = ${JSON.stringify(references)}::jsonb,
        related_rigging_slugs = ${pgTextArray(rigging_slugs)}::text[],
        sort_order = ${sort_order},
        updated_at = NOW()
      WHERE slug = ${originalSlug}
      RETURNING slug
    `);
    if (!row) return { ok: false, error: `No safety_bulletin with slug ${originalSlug}` };
    return { ok: true, slug: row.slug, outcome: 'inserted' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const UPDATERS: Record<string, (slug: string, form: FormData) => Promise<CreateEntityResult>> = {
  'vfx-house': updateVfxHouse,
  'stunt-company': updateStuntCompany,
  'stunt-rigging': updateStuntRigging,
  'safety-bulletin': updateSafetyBulletin,
};

export async function updateEntity(
  type: string,
  originalSlug: string,
  form: FormData,
): Promise<CreateEntityResult> {
  const updater = UPDATERS[type];
  if (!updater) return { ok: false, error: `Unknown entity type: ${type}` };
  return updater(originalSlug, form);
}
