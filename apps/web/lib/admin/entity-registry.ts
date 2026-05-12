/**
 * Entity creation registry — single source of truth for the
 * /admin/curate/new/[type] form pages.
 *
 * Each entity declares the fields its create form needs, grouped
 * into four sections (identification, editorial, structured, jsonb).
 * The form page renders generically from this config; the insert
 * dispatcher (entity-inserters.ts) maps the FormData back to a
 * typed Drizzle INSERT.
 *
 * Adding a new entity:
 *   1. Append a new EntityConfig below.
 *   2. Add the corresponding insert function in entity-inserters.ts.
 *   3. The /admin/curate landing + /admin/curate/new/[type] route
 *      pick it up automatically.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'markdown'        // multi-paragraph editorial prose; renders as larger textarea + char count
  | 'number'
  | 'integer'
  | 'date'
  | 'url'
  | 'slug'            // single line + "from name" button
  | 'select'
  | 'tags'            // text[] with chip input
  | 'references'      // jsonb [{title, url, publication?, kind?}]
  | 'kv-array'        // jsonb [{<keys[0]>, <keys[1]>}]
  | 'photo-array';    // jsonb [{url, caption, credit?}]

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** For 'select' — option values. */
  options?: string[];
  /** For 'kv-array' — keys + labels for each item. Default: ['heading', 'detail']. */
  itemKeys?: { key: string; label: string; type?: 'text' | 'textarea' }[];
  /** For 'markdown' / 'textarea' — pass-through rows attribute. */
  rows?: number;
  /** Default value injected when the field is left blank. */
  default?: string | number | boolean;
};

export type EntityConfig = {
  type: string;
  label: string;
  pluralLabel: string;
  table: string;
  /** Counted on the landing page so we surface dataset size. */
  countQueryTable?: string;
  description: string;
  /** Public route prefix where rows of this type live ('/vfx', '/stunts/rigging', …). */
  publicRoutePrefix: string;
  /** Sections rendered in this order. Empty section is skipped. */
  identification: FieldConfig[];
  editorial: FieldConfig[];
  structured: FieldConfig[];
  jsonb: FieldConfig[];
};

// ── VFX House ──────────────────────────────────────────────────────

const VFX_HOUSE: EntityConfig = {
  type: 'vfx-house',
  label: 'VFX house',
  pluralLabel: 'VFX houses',
  table: 'vfx_houses',
  description:
    'A working VFX studio. Editorial prose covers founders, signature work, and the studio\'s position in the modern pipeline.',
  publicRoutePrefix: '/vfx',
  identification: [
    { name: 'slug', label: 'Slug', type: 'slug', required: true, placeholder: 'wisp-fx', hint: 'Lowercase, dashed. Used in the URL.' },
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Wisp FX' },
    { name: 'website', label: 'Website', type: 'url', placeholder: 'https://wispfx.com' },
    { name: 'wikidata_id', label: 'Wikidata ID', type: 'text', placeholder: 'Q123456' },
  ],
  editorial: [
    { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'One-line studio identity', hint: 'Surfaced on cards across /vfx.' },
    { name: 'summary', label: 'Summary', type: 'markdown', rows: 8, hint: 'Two to four paragraphs covering founders, signature productions, and pipeline position.' },
  ],
  structured: [
    { name: 'founded_year', label: 'Founded year', type: 'integer', placeholder: '2010' },
    { name: 'headquarters', label: 'Headquarters', type: 'text', placeholder: 'London, UK' },
    { name: 'country', label: 'Country', type: 'text', placeholder: 'GB', hint: 'ISO 3166-1 alpha-2.' },
    { name: 'parent_company', label: 'Parent company', type: 'text', placeholder: 'Cinesite Group' },
    { name: 'kind', label: 'Kind', type: 'select', options: ['vfx', 'animation', 'previs', 'finishing', 'mocap'] },
    { name: 'specialties', label: 'Specialties', type: 'tags', hint: 'Examples: creature, environment, fluid sims, photo-real digi-doubles.' },
    { name: 'reel_url', label: 'Reel URL', type: 'url' },
    { name: 'careers_url', label: 'Careers URL', type: 'url' },
  ],
  jsonb: [
    { name: 'references', label: 'References', type: 'references' },
  ],
};

// ── Stunt Rigging Technique ────────────────────────────────────────

const STUNT_RIGGING: EntityConfig = {
  type: 'stunt-rigging',
  label: 'Stunt rigging technique',
  pluralLabel: 'Stunt rigging techniques',
  table: 'stunt_rigging_techniques',
  description:
    'A specialised stunt rig with mechanism, safety, variants, and the productions that put it on screen.',
  publicRoutePrefix: '/stunts/rigging',
  identification: [
    { name: 'slug', label: 'Slug', type: 'slug', required: true, placeholder: 'fan-descender' },
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Fan descender' },
    { name: 'category', label: 'Category', type: 'select', required: true, options: ['descender', 'wire', 'vehicle', 'fire', 'fall', 'fight', 'aerial', 'water'] },
  ],
  editorial: [
    { name: 'tagline', label: 'Tagline', type: 'text', required: true, hint: 'One-liner shown on glossary cards.' },
    { name: 'mechanism', label: 'Mechanism', type: 'markdown', rows: 8, required: true, hint: 'How the rig works mechanically. One paragraph minimum.' },
    { name: 'safety_considerations', label: 'Safety considerations', type: 'markdown', rows: 6, hint: 'Failure modes and the protocol that mitigates each.' },
    { name: 'sag_aftra_bulletin', label: 'SAG-AFTRA bulletin reference', type: 'text', placeholder: 'SAG-AFTRA Safety Bulletin #14', hint: 'Free-text — auto-resolves to a bulletin link if a matching number is indexed.' },
  ],
  structured: [
    { name: 'related_discipline_tags', label: 'Related discipline tags', type: 'tags', hint: 'Used to cross-link sequences whose discipline_tags overlap. e.g. "high-fall", "pole-cat".' },
    { name: 'sort_order', label: 'Sort order', type: 'integer', default: 100, hint: 'Lower sorts first within the category.' },
  ],
  jsonb: [
    { name: 'common_variants', label: 'Common variants', type: 'kv-array', itemKeys: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ] },
    { name: 'references', label: 'References', type: 'references' },
    { name: 'photos', label: 'Reference photos', type: 'photo-array' },
  ],
};

// ── SAG-AFTRA Safety Bulletin ──────────────────────────────────────

const SAFETY_BULLETIN: EntityConfig = {
  type: 'safety-bulletin',
  label: 'Safety bulletin',
  pluralLabel: 'Safety bulletins',
  table: 'safety_bulletins',
  description:
    'A SAG-AFTRA Safety Bulletin entry — number, title, scope, and the requirements it codifies.',
  publicRoutePrefix: '/stunts/safety',
  identification: [
    { name: 'slug', label: 'Slug', type: 'slug', required: true, placeholder: 'bulletin-14-stunts' },
    { name: 'bulletin_number', label: 'Bulletin number', type: 'text', required: true, placeholder: '14', hint: 'Just the number (no "#"). Letter suffixes allowed: "1A".' },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'select', required: true, options: [
      'firearms', 'pyrotechnics', 'fire', 'animals', 'aerial',
      'vehicles', 'water', 'stunts_general', 'environmental', 'medical',
    ] },
    { name: 'governing_body', label: 'Governing body', type: 'text', default: 'SAG-AFTRA' },
  ],
  editorial: [
    { name: 'scope', label: 'Scope', type: 'textarea', rows: 4, required: true, hint: 'One paragraph: when does this bulletin apply.' },
    { name: 'summary', label: 'Summary', type: 'markdown', rows: 8, required: true, hint: 'Editorial 2-3 paragraph context.' },
  ],
  structured: [
    { name: 'last_revision_date', label: 'Last revision date', type: 'date' },
    { name: 'canonical_pdf_url', label: 'Canonical PDF URL', type: 'url', placeholder: 'https://www.sagaftra.org/files/sa_documents/SafetyBulletin14.pdf' },
    { name: 'related_rigging_slugs', label: 'Related rigging slugs', type: 'tags', hint: 'Glossary slugs this bulletin governs. e.g. "high-fall-airbag", "fan-descender".' },
    { name: 'sort_order', label: 'Sort order', type: 'integer', default: 100 },
  ],
  jsonb: [
    { name: 'key_requirements', label: 'Key requirements', type: 'kv-array', itemKeys: [
      { key: 'heading', label: 'Heading', type: 'text' },
      { key: 'detail', label: 'Detail', type: 'textarea' },
    ] },
    { name: 'references', label: 'References', type: 'references' },
  ],
};

// ── Stunt Company ──────────────────────────────────────────────────

const STUNT_COMPANY: EntityConfig = {
  type: 'stunt-company',
  label: 'Stunt company',
  pluralLabel: 'Stunt companies',
  table: 'stunt_companies',
  description:
    'A stunt-coordination outfit — historic peer-elected associations or modern boutique action-design shops.',
  publicRoutePrefix: '/stunts/companies',
  identification: [
    { name: 'slug', label: 'Slug', type: 'slug', required: true, placeholder: '87eleven-action-design' },
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: '87Eleven Action Design' },
    { name: 'website', label: 'Website', type: 'url' },
    { name: 'wikidata_id', label: 'Wikidata ID', type: 'text', placeholder: 'Q123456' },
  ],
  editorial: [
    { name: 'tagline', label: 'Tagline', type: 'text' },
    { name: 'summary', label: 'Summary', type: 'markdown', rows: 8, hint: 'Founders, signature productions, working style.' },
  ],
  structured: [
    { name: 'founded_year', label: 'Founded year', type: 'integer' },
    { name: 'headquarters', label: 'Headquarters', type: 'text' },
    { name: 'country', label: 'Country', type: 'text', hint: 'ISO 3166-1 alpha-2.' },
    { name: 'parent_company', label: 'Parent company', type: 'text' },
    { name: 'specialties', label: 'Specialties', type: 'tags' },
    { name: 'founder_names', label: 'Founder names', type: 'tags' },
    { name: 'member_count', label: 'Member count', type: 'integer' },
    { name: 'reel_url', label: 'Reel URL', type: 'url' },
    { name: 'careers_url', label: 'Careers URL', type: 'url' },
  ],
  jsonb: [
    { name: 'references', label: 'References', type: 'references' },
  ],
};

export const ENTITIES: EntityConfig[] = [
  VFX_HOUSE,
  STUNT_COMPANY,
  STUNT_RIGGING,
  SAFETY_BULLETIN,
];

export function getEntityConfig(type: string): EntityConfig | null {
  return ENTITIES.find((e) => e.type === type) ?? null;
}
