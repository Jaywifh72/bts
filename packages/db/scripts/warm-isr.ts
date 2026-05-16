/**
 * ISR cache warmer. Fetches every URL in cinecanon.com's sitemap
 * (films + crew + gear + vfx + core) with bounded concurrency so the
 * first-visitor doesn't eat the 5-10s cold-render hit.
 *
 * Skipped: the embedded sitemap entries that are already pre-rendered
 * at build (curated tier), and any URL that returns a non-200 status.
 *
 * Usage:
 *   tsx scripts/warm-isr.ts                       # default: all
 *   tsx scripts/warm-isr.ts --section films       # just one section
 *   tsx scripts/warm-isr.ts --concurrency 4       # tune parallelism
 */

const BASE = 'https://cinecanon.com';
const args = process.argv.slice(2);
const sectionFlag = args[args.indexOf('--section') + 1];
const concurrency = Number(args[args.indexOf('--concurrency') + 1]) || 3;
const delayMs = Number(args[args.indexOf('--delay') + 1]) || 100;
const SECTIONS = sectionFlag ? [sectionFlag] : ['core', 'films', 'crew', 'gear', 'vfx'];

async function fetchSitemap(name: string): Promise<string[]> {
  const r = await fetch(`${BASE}/sitemap-${name}.xml`);
  const xml = await r.text();
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
}

async function warm(url: string, attempt = 1): Promise<{ url: string; status: number; ms: number; bytes: number }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'cinecanon-warmer/1', accept: 'text/html', connection: 'close' },
    });
    const body = await r.text();
    return { url, status: r.status, ms: Date.now() - t0, bytes: body.length };
  } catch (e) {
    if (attempt < 3) {
      await new Promise((res) => setTimeout(res, 500 * attempt));
      return warm(url, attempt + 1);
    }
    return { url, status: 0, ms: Date.now() - t0, bytes: 0 };
  }
}

async function runPool<T>(items: T[], n: number, fn: (item: T, idx: number) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const all: string[] = [];
  for (const s of SECTIONS) {
    const urls = await fetchSitemap(s);
    console.log(`  sitemap-${s}: ${urls.length} URLs`);
    all.push(...urls);
  }
  console.log(`\nWarming ${all.length} URLs at concurrency ${concurrency}...\n`);

  const start = Date.now();
  let ok = 0;
  let slow = 0;
  let fail = 0;
  let totalBytes = 0;

  await runPool(all, concurrency, async (url, idx) => {
    if (delayMs > 0) await new Promise((res) => setTimeout(res, delayMs));
    const r = await warm(url);
    totalBytes += r.bytes;
    if (r.status === 200) ok++;
    else fail++;
    if (r.ms > 3000) slow++;
    if (idx % 100 === 0 || r.status !== 200 || r.ms > 5000) {
      const flag = r.status === 200 ? (r.ms > 5000 ? 'SLOW ' : '     ') : 'FAIL ';
      console.log(`${flag}[${idx + 1}/${all.length}] ${r.status} ${r.ms}ms ${(r.bytes / 1024).toFixed(0)}KB  ${url}`);
    }
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s. ok=${ok} fail=${fail} slow(>3s)=${slow} totalKB=${(totalBytes / 1024).toFixed(0)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
