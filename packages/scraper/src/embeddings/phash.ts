import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-30 — perceptual hash extraction for keyframe dedup.
 *
 * Pipeline: fetch → grayscale → 32×32 downsample → 8×8 DCT → median
 * threshold → 64-bit hash. Hamming distance between two hashes ≈
 * visual similarity (≤5 = near-identical, ≤10 = same scene different
 * framing, >20 = unrelated).
 *
 * jimp does the decode + resize + grayscale; we do the DCT + threshold
 * inline. Stored as bigint (8 bytes) on `production_keyframes.phash`.
 */

// jimp is loaded lazily so importing this module doesn't pay the
// ~5MB hit unless we actually run extraction.
async function loadJimp() {
  const mod = await import('jimp');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any).default ?? mod;
}

/**
 * Standard pHash:
 *  1. Resize to 32×32 grayscale.
 *  2. 2D DCT-II — keep top-left 8×8 (low frequencies).
 *  3. Compute median of 8×8 (excluding DC at [0][0]).
 *  4. Each pixel ≥ median → bit 1, else bit 0 → 64-bit hash.
 */
export async function computePhash(imageUrl: string): Promise<bigint> {
  const Jimp = await loadJimp();
  // Fetch the bytes ourselves so we can pin the Accept header — jimp's
  // built-in fetcher advertises webp, and TMDb honors that, but jimp
  // 0.22 only decodes png/jpeg.
  const res = await fetch(imageUrl, {
    headers: {
      Accept: 'image/jpeg,image/png',
      'User-Agent': 'StudioProBot/1.0 (phash)',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${imageUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const img = await Jimp.read(buf);
  img.resize(32, 32).greyscale();

  // Pull luminance into a flat Float64Array (typed access avoids
  // strict-undefined issues and is faster for the inner loops).
  const N = 32;
  const pixels = new Float64Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // greyscale → R==G==B; read R only.
      pixels[y * N + x] = img.bitmap.data[(y * N + x) * 4];
    }
  }

  // 2D DCT-II via separable 1D passes. Only the top-left 8×8 matters.
  const rows = new Float64Array(N * 8);
  for (let y = 0; y < N; y++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0;
      for (let x = 0; x < N; x++) {
        sum += pixels[y * N + x]! * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
      }
      rows[y * 8 + u] = sum;
    }
  }
  const dct = new Float64Array(64);
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0;
      for (let y = 0; y < N; y++) {
        sum += rows[y * 8 + u]! * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N));
      }
      dct[v * 8 + u] = sum;
    }
  }

  // Median of 8×8 excluding DC term [0][0].
  const flat: number[] = [];
  for (let i = 1; i < 64; i++) flat.push(dct[i]!);
  flat.sort((a, b) => a - b);
  const median = flat[Math.floor(flat.length / 2)]!;

  // Build the 64-bit hash, MSB first.
  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    hash <<= 1n;
    if (dct[i]! >= median) hash |= 1n;
  }
  return hash;
}

/** Hamming distance between two 64-bit hashes. */
export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x !== 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

export type PhashStats = {
  attempted: number;
  hashed: number;
  errors: number;
};

export async function extractKeyFramePhashes(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<PhashStats> {
  const stats: PhashStats = { attempted: 0, hashed: 0, errors: 0 };
  const filterClause = opts.refresh ? sql`TRUE` : sql`phash IS NULL`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; image_url: string }>(sql`
    SELECT id, image_url FROM production_keyframes
    WHERE ${filterClause}
    ORDER BY id
    ${limitClause}
  `);

  console.log(`phash:extract — ${targets.length} key frames to process`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const hash = await computePhash(row.image_url);
      // Postgres bigint signed range; coerce to a signed two's-complement
      // bigint so the value round-trips through pg's bigint type.
      const signed = hash >= 1n << 63n ? hash - (1n << 64n) : hash;
      await db.execute(sql`
        UPDATE production_keyframes
        SET phash = ${signed.toString()}::bigint, updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.hashed++;
    } catch (e) {
      stats.errors++;
      console.error(`  keyframe ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `phash:extract done — attempted=${stats.attempted} hashed=${stats.hashed} errors=${stats.errors}`,
  );
  return stats;
}
