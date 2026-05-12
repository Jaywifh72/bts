// Phase 23 — backfill production_videos into media_assets +
// media_associations.
//
// Each published production_videos row becomes:
//   1. One media_assets row (kind='video', natural-key URL upsert)
//   2. One media_associations row (entity_type='production',
//      role='subject') tying the asset to its parent production
//
// For videos with category='stunts', we ALSO create person
// associations (role='reel') for each stuntperson with a credit on
// the parent production — so a stunt-categorised BTS video about
// Avengers Endgame automatically attaches to Bobby Holland Hanton,
// Sam Hargrave, etc. When the same URL would have been ingested
// twice (e.g., a video listed across two productions in a future
// expansion), the URL unique key dedupes it to a single asset with
// multiple associations.
//
// Idempotent — re-running collapses cleanly via the upsert + the
// (asset, entity, role) UNIQUE on associations.
import { db, sql, upsertMediaAsset, associateMedia } from '../src/index.ts';

console.log('Phase 23 — backfill production_videos\n');

type VideoRow = {
  id: number;
  production_id: number;
  source: 'youtube' | 'vimeo';
  external_id: string;
  url: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  published_at: string | null;
  category: string;
  status: string;
};

const videos = await db.execute<VideoRow>(sql`
  SELECT id, production_id, source::text, external_id, url, title,
         channel_name, thumbnail_url, duration_seconds, view_count,
         published_at::text, category::text, status::text
  FROM production_videos
  WHERE status = 'published'
`);
console.log(`videos to backfill: ${videos.length}\n`);

let assetsCreated = 0;
let assetsRefreshed = 0;
let productionAssociations = 0;
let personAssociations = 0;

for (const v of videos) {
  const { id: assetId, created } = await upsertMediaAsset(db, {
    kind: 'video',
    url: v.url,
    title: v.title,
    credit: v.channel_name,
    source: v.source,
    externalId: v.external_id,
    thumbnailUrl: v.thumbnail_url,
    durationSeconds: v.duration_seconds,
    publishedAt: v.published_at,
    metadata: {
      view_count: v.view_count,
      category: v.category,
      origin: 'backfill:production_videos',
      source_id: v.id,
    },
  });
  if (created) assetsCreated++;
  else assetsRefreshed++;

  // Production-side association — every video is the 'subject' of its
  // parent production page.
  await associateMedia(db, {
    mediaAssetId: assetId,
    entityType: 'production',
    entityId: v.production_id,
    role: 'subject',
  });
  productionAssociations++;

  // For stunt-category videos, fan out to every stunt person who has
  // a credit on the production. role='reel' marks it as part of the
  // person's curated work surface.
  if (v.category === 'stunts') {
    const peopleRows = await db.execute<{ person_id: number }>(sql`
      SELECT DISTINCT ca.person_id
      FROM crew_assignments ca
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.production_id = ${v.production_id}
        AND r.category = 'stunts'
      UNION
      SELECT DISTINCT ssc.person_id
      FROM stunt_sequence_credits ssc
      JOIN stunt_sequences ss ON ss.id = ssc.sequence_id
      WHERE ss.production_id = ${v.production_id}
      UNION
      SELECT DISTINCT sdc.doubler_person_id
      FROM stunt_doubling_credits sdc
      WHERE sdc.production_id = ${v.production_id}
    `);
    for (const p of peopleRows) {
      await associateMedia(db, {
        mediaAssetId: assetId,
        entityType: 'person',
        entityId: p.person_id,
        role: 'reel',
      });
      personAssociations++;
    }
  }
}

console.log(`assets — ${assetsCreated} created, ${assetsRefreshed} refreshed`);
console.log(`production associations: ${productionAssociations}`);
console.log(`person (stunt-fan-out) associations: ${personAssociations}`);
process.exit(0);
