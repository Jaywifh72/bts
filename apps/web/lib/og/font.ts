/**
 * T6-5 — font loader for ImageResponse OG cards.
 *
 * `next/og`'s default font loader has a known Windows-path bug in dev
 * (it fails to find the bundled Noto fallback). Fix: always supply our
 * own font, which sidesteps the buggy default code path on every
 * platform and Vercel + local dev.
 *
 * Inter is fetched once at module load from rsms.me (Inter's canonical
 * CDN, served as TTF). The buffer is reused across requests via this
 * module-level Promise — under the dev server's hot reload that means
 * one fetch per process; in production it's one per cold start.
 */

// Google Fonts CSS endpoint. We resolve the TTF URL out of the returned
// stylesheet at runtime — fixed CDN paths drift, but this endpoint is the
// canonical pattern documented for @vercel/og.
const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700';

// Old Chrome UA gets WOFF (not woff2) from Google Fonts. satori supports
// WOFF, so we don't need to chase TTF specifically — WOFF buffers work.
const LEGACY_UA =
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/40.0.2214.85 Safari/537.36';

let resolvedFontsPromise: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null = null;

async function resolveFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  const css = await (await fetch(GOOGLE_FONTS_CSS, {
    headers: { 'User-Agent': LEGACY_UA },
    cache: 'force-cache',
  })).text();

  // Each @font-face block: `font-weight: <n>` + `src: url(<ttf>) format('truetype')`.
  // We walk blocks rather than do one massive regex so it's resilient to ordering.
  // Google Fonts CSS emits one @font-face per (weight, unicode-range).
  // The basic-latin block is the last one for each weight (Google orders
  // by descending unicode-range narrowness — cyrillic-ext first, latin
  // last). We pick the *last* match per weight to land on latin.
  const blocks = css.split('@font-face').slice(1);
  let regularUrl: string | null = null;
  let boldUrl: string | null = null;
  for (const block of blocks) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    // Accept either `truetype` or `woff` — satori handles both.
    const urlMatch = block.match(/src:\s*url\((https:[^)]+)\)\s*format\(['"](?:truetype|woff)['"]\)/);
    if (!weightMatch || !urlMatch) continue;
    const w = Number(weightMatch[1]);
    if (w === 400) regularUrl = urlMatch[1] ?? regularUrl;
    if (w === 700) boldUrl = urlMatch[1] ?? boldUrl;
  }
  if (!regularUrl || !boldUrl) {
    throw new Error('OG font CSS did not yield both 400 and 700 TTF URLs');
  }

  const [regular, bold] = await Promise.all([
    fetch(regularUrl, { cache: 'force-cache' }).then((r) => r.arrayBuffer()),
    fetch(boldUrl, { cache: 'force-cache' }).then((r) => r.arrayBuffer()),
  ]);
  return { regular, bold };
}

export function getInterRegular(): Promise<ArrayBuffer> {
  if (!resolvedFontsPromise) resolvedFontsPromise = resolveFonts();
  return resolvedFontsPromise.then((f) => f.regular);
}

export function getInterBold(): Promise<ArrayBuffer> {
  if (!resolvedFontsPromise) resolvedFontsPromise = resolveFonts();
  return resolvedFontsPromise.then((f) => f.bold);
}

/**
 * Helper: returns the `fonts` array shape ImageResponse expects.
 */
export async function ogFonts(): Promise<Array<{
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
}>> {
  const [regular, bold] = await Promise.all([getInterRegular(), getInterBold()]);
  return [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ];
}
