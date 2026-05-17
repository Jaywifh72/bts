/**
 * Craft taxonomy for the /awards section.
 *
 * Until the schema-side `crafts` + `award_categories` tables ship
 * (proposed migrations 0069-0072), we map existing award rows to
 * crafts at the application layer using (award_org, category text)
 * heuristics. The same patterns power both the TS-side helpers (for
 * label lookup) and the SQL fragments (for filtering / counting).
 *
 * To add a craft: append to `CRAFTS`, then add its detection rule to
 * `craftFromAward()` AND the SQL CASE in `craftCaseSql()`. Keep both
 * in sync — they must classify identically.
 */
import { sql, type SQL } from 'drizzle-orm';

export type CraftSlug =
  | 'cinematography' | 'editing' | 'production-design' | 'costume-design'
  | 'makeup-hairstyling'
  // Sound is split into three crafts because MPSE Golden Reel and CAS
  // distinguish them — see `craftFromAward` for the mapping rules. The
  // legacy 'sound' slug is kept as an alias-target inside the matcher so
  // existing seeded rows don't break.
  | 'sound-design' | 'dialogue-adr' | 'music-editing'
  | 'score' | 'music-supervision'
  | 'visual-effects' | 'stunts' | 'casting' | 'animation' | 'art-direction';

export type CraftDef = {
  slug: CraftSlug;
  name: string;
  /** Tagline shown on the craft landing page. */
  tagline: string;
  /** Sort order in dropdowns / landing grid. */
  sortOrder: number;
};

export const CRAFTS: CraftDef[] = [
  { slug: 'cinematography',     name: 'Cinematography',      tagline: 'DPs, gaffers, the camera department', sortOrder: 10 },
  { slug: 'editing',            name: 'Editing',             tagline: 'Picture and assembly',                  sortOrder: 20 },
  { slug: 'production-design',  name: 'Production Design',   tagline: 'World-building, sets, scenic',          sortOrder: 30 },
  { slug: 'costume-design',     name: 'Costume Design',      tagline: 'Character through wardrobe',             sortOrder: 40 },
  { slug: 'makeup-hairstyling', name: 'Makeup & Hairstyling',tagline: 'Prosthetics, beauty, character',         sortOrder: 50 },
  { slug: 'sound-design',       name: 'Sound Design & Foley',tagline: 'Designers, SFX editors, foley',          sortOrder: 60 },
  { slug: 'dialogue-adr',       name: 'Dialogue & ADR',      tagline: 'Production sound, dialogue editing, ADR', sortOrder: 65 },
  { slug: 'music-editing',      name: 'Music Editing',       tagline: 'Score editorial and integration',        sortOrder: 67 },
  { slug: 'score',              name: 'Original Score',      tagline: 'Composers and orchestration',            sortOrder: 70 },
  { slug: 'music-supervision',  name: 'Music Supervision',   tagline: 'Licensed song selection and clearance',  sortOrder: 75 },
  { slug: 'visual-effects',     name: 'Visual Effects',      tagline: 'Houses, supervisors, the VFX team',      sortOrder: 80 },
  { slug: 'stunts',             name: 'Stunts',              tagline: 'Coordinators, performers, rigging',      sortOrder: 90 },
  { slug: 'casting',            name: 'Casting',             tagline: 'Casting directors',                      sortOrder: 100 },
  { slug: 'animation',          name: 'Animation',           tagline: 'Animated features and shorts',           sortOrder: 110 },
  { slug: 'art-direction',      name: 'Art Direction',       tagline: 'Pre-2013 Oscar lineage of Production Design', sortOrder: 120 },
];

const CRAFT_BY_SLUG: Record<CraftSlug, CraftDef> = Object.fromEntries(
  CRAFTS.map((c) => [c.slug, c]),
) as Record<CraftSlug, CraftDef>;

export function getCraft(slug: string): CraftDef | null {
  return slug in CRAFT_BY_SLUG ? CRAFT_BY_SLUG[slug as CraftSlug] : null;
}

/**
 * Award orgs that are inherently craft-focused — every category they
 * award belongs to that craft, regardless of category text. Lets us
 * classify e.g. an ASC win for "Television Movie / Limited Series" as
 * cinematography even though the category string doesn't contain
 * 'cinematograph'.
 */
const ORG_TO_CRAFT: Record<string, CraftSlug> = {
  asc_award: 'cinematography',
  aso_award: 'cinematography',
  csc_award: 'cinematography',
  bsc_award: 'cinematography',
  camerimage: 'cinematography',
  eca: 'cinematography',
  ves_award: 'visual-effects',
  taurus_world_stunt_awards: 'stunts',
  sag_stunt_ensemble: 'stunts',
};

/**
 * Classify an award row by its (org, category) pair. Returns null for
 * non-craft categories (Best Picture, Best Director, Best Original
 * Song, Best Actor, etc.).
 *
 * Match order matters: org rules win first, then keyword rules. Within
 * keywords, more-specific patterns come before more-general ones
 * (e.g. 'art direction' before 'art' substring would be too greedy —
 * we use full-word patterns instead).
 */
export function craftFromAward(awardOrg: string, category: string): CraftSlug | null {
  const orgCraft = ORG_TO_CRAFT[awardOrg];
  if (orgCraft) return orgCraft;

  const c = category.toLowerCase();

  // Stunts FIRST (org match above already handled, this catches AMPAS-side
  // stunt categories should they ever appear).
  if (/stunt/.test(c)) return 'stunts';
  if (/cinematograph/.test(c)) return 'cinematography';
  // Music editing (MPSE Golden Reel) — match BEFORE generic 'editing'.
  if (/music editing|music editor/.test(c)) return 'music-editing';
  if (/\bediting\b|\bedited\b|film editing/.test(c)) return 'editing';
  if (/production design|production designer/.test(c)) return 'production-design';
  if (/art direction|art director/.test(c)) return 'art-direction';
  if (/costume/.test(c)) return 'costume-design';
  if (/makeup|make-up|hair/.test(c)) return 'makeup-hairstyling';
  // Sound family — order matters: dialogue/ADR first (most specific), then
  // design/effects/foley, then bare 'sound' → falls through to sound-design.
  if (/dialogue|dialog editor|\badr\b/.test(c)) return 'dialogue-adr';
  if (/sound design|sound effect|foley|sfx editor|supervising sound/.test(c)) return 'sound-design';
  // 'sound mixing' (CAS, AMPAS Best Sound) — production+post mix, classify as dialogue-adr lineage
  if (/sound mixing|sound mixer|re-recording mixer/.test(c)) return 'dialogue-adr';
  if (/\bsound\b(?!track)/.test(c)) return 'sound-design';
  // Music supervision — match BEFORE score patterns.
  if (/music supervis/.test(c)) return 'music-supervision';
  if (/original score|musical score|score(?! and song)/.test(c)) return 'score';
  if (/visual effect/.test(c)) return 'visual-effects';
  if (/casting/.test(c)) return 'casting';
  if (/animated|animation/.test(c)) return 'animation';

  return null;
}

/**
 * SQL fragment producing the craft slug for an award row. MUST match
 * `craftFromAward()` above — same priority order, same patterns.
 *
 * Inputs `orgCol` and `catCol` are raw column references (e.g.
 * `sql.raw('a.award_org::text')`, `sql.raw('a.category')`) so callers
 * can use this against any alias.
 */
export function craftCaseSql(orgCol: SQL, catCol: SQL): SQL {
  return sql`CASE
    WHEN ${orgCol} = 'asc_award'                  THEN 'cinematography'
    WHEN ${orgCol} = 'aso_award'                  THEN 'cinematography'
    WHEN ${orgCol} = 'csc_award'                  THEN 'cinematography'
    WHEN ${orgCol} = 'bsc_award'                  THEN 'cinematography'
    WHEN ${orgCol} = 'camerimage'                 THEN 'cinematography'
    WHEN ${orgCol} = 'eca'                        THEN 'cinematography'
    WHEN ${orgCol} = 'ves_award'                  THEN 'visual-effects'
    WHEN ${orgCol} = 'taurus_world_stunt_awards'  THEN 'stunts'
    WHEN ${orgCol} = 'sag_stunt_ensemble'         THEN 'stunts'
    WHEN ${catCol} ILIKE '%stunt%'                THEN 'stunts'
    WHEN ${catCol} ILIKE '%cinematograph%'        THEN 'cinematography'
    WHEN ${catCol} ILIKE '%editing%' OR ${catCol} ILIKE '%edited%' OR ${catCol} ILIKE '%film editing%' THEN 'editing'
    WHEN ${catCol} ILIKE '%production design%'    THEN 'production-design'
    WHEN ${catCol} ILIKE '%art direction%'        THEN 'art-direction'
    WHEN ${catCol} ILIKE '%costume%'              THEN 'costume-design'
    WHEN ${catCol} ILIKE '%makeup%' OR ${catCol} ILIKE '%make-up%' OR ${catCol} ILIKE '%hair%' THEN 'makeup-hairstyling'
    WHEN ${catCol} ILIKE '%music editing%' OR ${catCol} ILIKE '%music editor%' THEN 'music-editing'
    WHEN ${catCol} ILIKE '%dialogue%' OR ${catCol} ILIKE '%dialog editor%' OR ${catCol} ILIKE '%adr%' THEN 'dialogue-adr'
    WHEN ${catCol} ILIKE '%sound design%' OR ${catCol} ILIKE '%sound effect%' OR ${catCol} ILIKE '%foley%'
         OR ${catCol} ILIKE '%sfx editor%' OR ${catCol} ILIKE '%supervising sound%' THEN 'sound-design'
    WHEN ${catCol} ILIKE '%sound mixing%' OR ${catCol} ILIKE '%sound mixer%' OR ${catCol} ILIKE '%re-recording mixer%' THEN 'dialogue-adr'
    WHEN ${catCol} ILIKE '%sound%' AND ${catCol} NOT ILIKE '%soundtrack%' THEN 'sound-design'
    WHEN ${catCol} ILIKE '%music supervis%' THEN 'music-supervision'
    WHEN ${catCol} ILIKE '%original score%' OR ${catCol} ILIKE '%musical score%'
         OR (${catCol} ILIKE '%score%' AND ${catCol} NOT ILIKE '%score and song%') THEN 'score'
    WHEN ${catCol} ILIKE '%visual effect%'        THEN 'visual-effects'
    WHEN ${catCol} ILIKE '%casting%'              THEN 'casting'
    WHEN ${catCol} ILIKE '%animated%' OR ${catCol} ILIKE '%animation%' THEN 'animation'
    ELSE NULL
  END`;
}
