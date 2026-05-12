// Probe the actual response Jimp is seeing.
{
  const res = await fetch('https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg', {
    headers: { Accept: 'image/jpeg', 'User-Agent': 'StudioProBot/1.0 (phash)' },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`probe: status=${res.status} content-type=${res.headers.get('content-type')} bytes=${buf.length} first12=${[...buf.subarray(0, 12)].map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
}

import { computePhash, hammingDistance } from '../src/embeddings/phash.ts';

// Same image at two TMDb resolutions — should be near-identical pHash
// (Hamming distance ≤ ~5).
const urls = [
  'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
  'https://image.tmdb.org/t/p/w500/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
  // Different image — should be far away (Hamming distance > 20).
  'https://image.tmdb.org/t/p/w1280/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
];

const hashes: bigint[] = [];
for (const u of urls) {
  console.log(`fetching ${u}...`);
  const t0 = Date.now();
  const h = await computePhash(u);
  console.log(`  hash=${h.toString(16).padStart(16, '0')}  (${Date.now() - t0}ms)`);
  hashes.push(h);
}
console.log('\nHamming distances:');
console.log(`  same image, w1280 vs w500:    ${hammingDistance(hashes[0]!, hashes[1]!)}`);
console.log(`  different images, w1280 vs w1280: ${hammingDistance(hashes[0]!, hashes[2]!)}`);
process.exit(0);
