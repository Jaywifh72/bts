/**
 * Typographic brand marks for the gear + VFX archive listings.
 *
 * We deliberately avoid bundling trademarked logo files. Instead each
 * brand gets a wordmark rendered with the project's existing typeface
 * stack, plus a chosen weight, case, tracking, and accent color that
 * evokes the brand without reproducing its proprietary letterforms.
 * This is the same nominative-use pattern Wikipedia, Letterboxd, and
 * IMDb use for brand pages.
 *
 * Colors are well-known publicly-stated brand colors used here as
 * editorial accents — not reproductions of brand marks.
 */

export type MarkStyle = {
  /** Display text shown in the wordmark — usually the brand short name. */
  text: string;
  /** Brand accent color (hex). Used as the foreground when contrast permits. */
  color: string;
  /** Typeface family — `serif` for heritage cinema brands, `sans` for tech. */
  family: 'serif' | 'sans' | 'mono';
  /** CSS font-weight. Heavier ≈ more dominant wordmark. */
  weight: 400 | 500 | 600 | 700 | 800 | 900;
  /** Letter case treatment. */
  case: 'upper' | 'normal' | 'small-caps';
  /** Tracking in em (e.g. -0.02 for tight, 0.15 for spaced caps). */
  tracking: number;
  /** Optional CSS font-style. */
  italic?: boolean;
};

const FALLBACK: MarkStyle = {
  text: '?',
  color: '#71717a',
  family: 'sans',
  weight: 700,
  case: 'upper',
  tracking: 0.05,
};

// ─── Equipment manufacturers + rental houses ───────────────────────
// Slugs match `equipment_manufacturers.slug` exactly; double-check
// against the rendered /gear page when adding entries.
const MANUFACTURERS: Record<string, MarkStyle> = {
  arri:                  { text: 'ARRI',        color: '#cc0000', family: 'sans',  weight: 900, case: 'upper',  tracking: -0.01 },
  'arri-rental':         { text: 'ARRI',        color: '#cc0000', family: 'sans',  weight: 900, case: 'upper',  tracking: -0.01 },
  cooke:                 { text: 'Cooke',       color: '#a08644', family: 'serif', weight: 500, case: 'normal', tracking: -0.01, italic: true },
  panavision:            { text: 'PANAVISION',  color: '#003e7e', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.08 },
  'panavision-rentals':  { text: 'PANAVISION',  color: '#003e7e', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.08 },
  zeiss:                 { text: 'ZEISS',       color: '#0052b6', family: 'sans',  weight: 700, case: 'upper',  tracking: 0.04 },
  'leitz-cine':          { text: 'Leitz',       color: '#cc0000', family: 'sans',  weight: 600, case: 'normal', tracking: 0 },
  angenieux:             { text: 'Angénieux',   color: '#1a4d8c', family: 'serif', weight: 500, case: 'normal', tracking: 0, italic: true },
  'atlas-lens':          { text: 'ATLAS',       color: '#9c8b6e', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.18 },
  tiffen:                { text: 'Tiffen',      color: '#005a8b', family: 'serif', weight: 500, case: 'normal', tracking: -0.005, italic: true },
  'schneider-kreuznach': { text: 'Schneider',   color: '#1a3a8a', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  'imax-corp':           { text: 'IMAX',        color: '#0089d0', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.02 },
  red:                   { text: 'RED',         color: '#e10600', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.02 },
  'sony-cinema':         { text: 'SONY',        color: '#dcdcdc', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.06 },
  'mitchell-camera':     { text: 'Mitchell',    color: '#a8a29e', family: 'serif', weight: 500, case: 'normal', tracking: 0 },
  'hawk-vantage':        { text: 'Hawk',        color: '#ba0c2f', family: 'serif', weight: 700, case: 'normal', tracking: 0 },
  'bausch-lomb':         { text: 'Bausch',      color: '#003366', family: 'serif', weight: 500, case: 'normal', tracking: 0 },
  'lomo-optics':         { text: 'Lomo',        color: '#a52a2a', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.06 },
  // Rental houses — neutral monochrome marks; brand differentiation
  // for these is by name, not by color.
  cinelease:             { text: 'Cinelease',   color: '#e4e4e7', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  'keslow-camera':       { text: 'Keslow',      color: '#e4e4e7', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  'nelson-cameras':      { text: 'Nelson',      color: '#e4e4e7', family: 'serif', weight: 500, case: 'normal', tracking: 0 },
  'otto-nemenz':         { text: 'Otto Nemenz', color: '#e4e4e7', family: 'serif', weight: 500, case: 'normal', tracking: 0 },
};

// ─── Stunt companies ────────────────────────────────────────────────
// Slugs match `stunt_companies.slug`. Action-coded palette — red /
// charcoal / cream — signalling that the stunt section is a separate
// editorial neighbourhood from gear and VFX.
const STUNT_COMPANIES: Record<string, MarkStyle> = {
  '87eleven-action-design':      { text: '87eleven',  color: '#e63946', family: 'sans',  weight: 800, case: 'normal', tracking: -0.02 },
  'stuntmens-association':       { text: 'SAMP',      color: '#c9a14a', family: 'serif', weight: 700, case: 'upper',  tracking: 0.10 },
  'stunts-unlimited':            { text: 'Stunts',    color: '#e4e4e7', family: 'sans',  weight: 800, case: 'normal', tracking: -0.01 },
  'ark-stunts':                  { text: 'ARK',       color: '#e63946', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.12 },
  'action-vehicles':             { text: 'Armstrong', color: '#e4e4e7', family: 'serif', weight: 600, case: 'normal', tracking: 0 },
  'real-id-stunts':              { text: 'Real ID',   color: '#e4e4e7', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  'the-stunt-people':            { text: 'TSP',       color: '#e4e4e7', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.10 },
  'action-4-reel':               { text: 'A4R',       color: '#e63946', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.12 },
};

// ─── Stunt schools ──────────────────────────────────────────────────
const STUNT_SCHOOLS: Record<string, MarkStyle> = {
  'international-stunt-school':       { text: 'ISS',     color: '#c9a14a', family: 'serif', weight: 700, case: 'upper',  tracking: 0.12 },
  'hollywood-stunt-driving-academy':  { text: 'HSDA',    color: '#e63946', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.06 },
  'ics-stunts':                       { text: 'ICS',     color: '#e4e4e7', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.08 },
  'british-action-academy':           { text: 'BAA',     color: '#c9a14a', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.10 },
  'thunder-road-stunt-school':        { text: 'Thunder', color: '#e4e4e7', family: 'serif', weight: 600, case: 'normal', tracking: 0 },
};

// ─── VFX houses ─────────────────────────────────────────────────────
// Slugs match `vfx_houses.slug`. Colors are warm gold/cream/red
// editorial accents — neutral palette per house except where the
// house has an obviously brand-coded primary (MPC red, ILM gold).
const VFX_HOUSES: Record<string, MarkStyle> = {
  ilm:            { text: 'ILM',        color: '#c5a572', family: 'serif', weight: 600, case: 'upper',  tracking: 0.06 },
  weta:           { text: 'Wētā',       color: '#e4e4e7', family: 'sans',  weight: 800, case: 'normal', tracking: -0.01 },
  dneg:           { text: 'DNEG',       color: '#e4e4e7', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.04 },
  framestore:     { text: 'Framestore', color: '#e4e4e7', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  mpc:            { text: 'MPC',        color: '#9b1c1c', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.04 },
  'mpc-film':     { text: 'MPC',        color: '#9b1c1c', family: 'sans',  weight: 900, case: 'upper',  tracking: 0.04 },
  'rodeo-fx':     { text: 'Rodeo FX',   color: '#e4e4e7', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  cinesite:       { text: 'Cinesite',   color: '#e4e4e7', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  'luma-pictures':{ text: 'Luma',       color: '#e4e4e7', family: 'serif', weight: 600, case: 'normal', tracking: 0 },
  scanline:       { text: 'Scanline',   color: '#1f4d8a', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  pixomondo:      { text: 'Pixomondo',  color: '#e4e4e7', family: 'sans',  weight: 700, case: 'normal', tracking: -0.005 },
  ilp:            { text: 'ILP',        color: '#e4e4e7', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.10 },
  rise:           { text: 'RISE',       color: '#e4e4e7', family: 'sans',  weight: 800, case: 'upper',  tracking: 0.10 },
};

const ALL: Record<string, MarkStyle> = { ...MANUFACTURERS, ...VFX_HOUSES, ...STUNT_COMPANIES, ...STUNT_SCHOOLS };

export function getBrandMark(slug: string, fallbackText?: string): MarkStyle {
  const hit = ALL[slug];
  if (hit) return hit;
  // Best-effort: use a uniform sans-caps treatment with the brand's
  // display name, so unknown houses still look intentional.
  return fallbackText
    ? { ...FALLBACK, text: fallbackText, color: '#a1a1aa' }
    : FALLBACK;
}
