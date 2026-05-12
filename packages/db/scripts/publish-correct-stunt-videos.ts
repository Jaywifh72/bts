// One-shot: publish the 2 stunt videos that the reclassifier
// correctly identified, so the categorisation is observable on
// the public film pages. The third match (a Parlotones music
// video on Inception) is a false positive — we leave it pending
// for manual triage.
import { db, sql } from '../src/index.ts';

const titlesToPublish = [
  'The Batman | Anatomy of the Car Chase | Warner Bros. Entertainment',
  'BLADE RUNNER 2049 - Fights Of The Future',
];

for (const title of titlesToPublish) {
  const result = await db.execute<{ id: number; production_slug: string }>(sql`
    UPDATE production_videos pv
    SET status = 'published',
        category_locked = true,
        updated_at = NOW()
    FROM productions p
    WHERE pv.production_id = p.id
      AND pv.title = ${title}
      AND pv.category = 'stunts'
    RETURNING pv.id, p.slug AS production_slug
  `);
  if (result.length > 0) {
    console.log(`  [~] published "${title}" → /films/${result[0]!.production_slug}`);
  } else {
    console.log(`  [!] not found: "${title}"`);
  }
}

process.exit(0);
