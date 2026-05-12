// One-shot: replace the dead Interstellar "Cornfield" keyframe URL
// with a fresh TMDb backdrop path. The hand-curated caption is
// preserved. Verified-alive at write time via curl.
import { db, sql } from '../src/index.ts';

const result = await db.execute<{ id: number; image_url: string }>(sql`
  UPDATE production_keyframes
  SET image_url = 'https://image.tmdb.org/t/p/w1280/2ssWTSVklAEc98frZUQhgtGHx7s.jpg',
      updated_at = NOW()
  WHERE image_url = 'https://image.tmdb.org/t/p/w1280/iiPB9a0pUxsUjoyBNhiIzJYPtps.jpg'
  RETURNING id, image_url
`);

if (result.length === 0) {
  console.log('  [!] no row matched — already fixed?');
} else {
  for (const r of result) console.log(`  [~] id=${r.id} → ${r.image_url}`);
}

process.exit(0);
