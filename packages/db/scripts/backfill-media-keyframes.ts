// Phase 24 — backfill production_keyframes into media_assets +
// media_associations.
//
// Each keyframe row becomes:
//   1. One media_assets row (kind='image', URL upsert)
//   2. One media_associations row (entity_type='production', role='subject')
//   3. When scene_id is set, an additional 'scene' association
//
// Curated keyframes are sparse (~2 rows in the corpus today) but
// this same backfill handles whatever volume gets seeded later.
import { db, sql, upsertMediaAsset, associateMedia } from '../src/index.ts';

console.log('Phase 24 — backfill production_keyframes\n');

type KeyFrameRow = {
  id: number;
  production_id: number;
  scene_id: number | null;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

const rows = await db.execute<KeyFrameRow>(sql`
  SELECT id, production_id, scene_id, image_url, caption, sort_order
  FROM production_keyframes
`);
console.log(`keyframes to backfill: ${rows.length}\n`);

let assetsCreated = 0;
let assetsRefreshed = 0;
let productionAssociations = 0;
let sceneAssociations = 0;

for (const k of rows) {
  // Build a synthetic title from the caption when present, falling
  // back to the production-id (we don't have a clean string fallback
  // since image keyframes don't carry their own title in the schema).
  const titleHint = k.caption?.slice(0, 80) ?? `Key frame #${k.id}`;

  const { id: assetId, created } = await upsertMediaAsset(db, {
    kind: 'image',
    url: k.image_url,
    title: titleHint,
    caption: k.caption,
    metadata: {
      origin: 'backfill:production_keyframes',
      source_id: k.id,
      sort_order: k.sort_order,
    },
  });
  if (created) assetsCreated++;
  else assetsRefreshed++;

  await associateMedia(db, {
    mediaAssetId: assetId,
    entityType: 'production',
    entityId: k.production_id,
    role: 'subject',
    sortOrder: k.sort_order,
  });
  productionAssociations++;

  if (k.scene_id !== null) {
    await associateMedia(db, {
      mediaAssetId: assetId,
      entityType: 'scene',
      entityId: k.scene_id,
      role: 'subject',
      sortOrder: k.sort_order,
    });
    sceneAssociations++;
  }
}

console.log(`assets — ${assetsCreated} created, ${assetsRefreshed} refreshed`);
console.log(`production associations: ${productionAssociations}`);
console.log(`scene associations: ${sceneAssociations}`);
process.exit(0);
