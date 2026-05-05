/**
 * T4-1 — manufacturer brand identity. Logos require licensing per brand
 * so we use brand colors + monogram instead. Pros recognize the
 * red/gold/blue palette instantly; this is enough visual identity to
 * make ARRI, Cooke, Panavision distinguishable in a grid.
 *
 * Color values are official brand colors where known; conservative
 * neutral grey otherwise.
 */

export type Brand = {
  /** Hex color used as a tinted accent on the card. */
  accent: string;
  /** 1-2 letter monogram for the badge tile. */
  monogram: string;
};

const BRANDS: Record<string, Brand> = {
  arri:                   { accent: '#cc0000', monogram: 'ARRI' },
  'arri-rental':          { accent: '#cc0000', monogram: 'AR' },
  cooke:                  { accent: '#a08644', monogram: 'CK' },
  panavision:             { accent: '#003e7e', monogram: 'PV' },
  zeiss:                  { accent: '#0052b6', monogram: 'Z' },
  'leitz-cine':           { accent: '#cc0000', monogram: 'L' },
  angenieux:              { accent: '#1a4d8c', monogram: 'A' },
  'atlas-lens':           { accent: '#222222', monogram: 'AT' },
  tiffen:                 { accent: '#005a8b', monogram: 'TF' },
  'schneider-kreuznach':  { accent: '#1a3a8a', monogram: 'SK' },
  imax:                   { accent: '#005a89', monogram: 'IMX' },
  'red-digital-cinema':   { accent: '#e10600', monogram: 'RED' },
  'sony-cinema':          { accent: '#000000', monogram: 'S' },
  mitchell:               { accent: '#3d3d3d', monogram: 'M' },
  vantage:                { accent: '#ba0c2f', monogram: 'HK' },
  'bausch-lomb':          { accent: '#003366', monogram: 'BL' },
  lomo:                   { accent: '#a52a2a', monogram: 'LM' },
};

const FALLBACK: Brand = { accent: '#52525b', monogram: '?' };

export function getBrand(slug: string): Brand {
  return BRANDS[slug] ?? FALLBACK;
}
