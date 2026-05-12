// Phase 26 verification — full state of the polymorphic media model
// after Phases 23/24/25 backfills.
import { db, sql } from '../src/index.ts';

const summary = await db.execute<{
  total_assets: number;
  total_associations: number;
  videos: number;
  images: number;
  links: number;
  documents: number;
  audio: number;
}>(sql`
  SELECT
    (SELECT COUNT(*)::int FROM media_assets) AS total_assets,
    (SELECT COUNT(*)::int FROM media_associations) AS total_associations,
    (SELECT COUNT(*)::int FROM media_assets WHERE kind = 'video') AS videos,
    (SELECT COUNT(*)::int FROM media_assets WHERE kind = 'image') AS images,
    (SELECT COUNT(*)::int FROM media_assets WHERE kind = 'link') AS links,
    (SELECT COUNT(*)::int FROM media_assets WHERE kind = 'document') AS documents,
    (SELECT COUNT(*)::int FROM media_assets WHERE kind = 'audio') AS audio
`);
console.log('Polymorphic media state:');
console.log(`  total assets:       ${summary[0]!.total_assets}`);
console.log(`  total associations: ${summary[0]!.total_associations}`);
console.log(`  by kind: video=${summary[0]!.videos} image=${summary[0]!.images} link=${summary[0]!.links} document=${summary[0]!.documents} audio=${summary[0]!.audio}`);

const byEntityType = await db.execute<{ entity_type: string; n: number }>(sql`
  SELECT entity_type::text, COUNT(*)::int AS n
  FROM media_associations
  GROUP BY entity_type ORDER BY n DESC
`);
console.log(`\nassociations by entity type:`);
for (const r of byEntityType) console.log(`  ${r.entity_type.padEnd(28)} ${r.n.toString().padStart(4)}`);

const byRole = await db.execute<{ role: string; n: number }>(sql`
  SELECT role::text, COUNT(*)::int AS n
  FROM media_associations
  GROUP BY role ORDER BY n DESC
`);
console.log(`\nassociations by role:`);
for (const r of byRole) console.log(`  ${r.role.padEnd(20)} ${r.n.toString().padStart(4)}`);

const topShared = await db.execute<{ url: string; assoc_count: number }>(sql`
  SELECT mas.url, COUNT(ma.id)::int AS assoc_count
  FROM media_assets mas
  JOIN media_associations ma ON ma.media_asset_id = mas.id
  GROUP BY mas.url
  HAVING COUNT(ma.id) > 1
  ORDER BY assoc_count DESC
  LIMIT 8
`);
console.log(`\nmost-shared assets (one URL, many associations):`);
for (const r of topShared) {
  console.log(`  ${r.assoc_count.toString().padStart(3)}× ${r.url.slice(0, 90)}`);
}

process.exit(0);
