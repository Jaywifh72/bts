// Phase 25 — backfill the per-entity `references` jsonb arrays
// across the editorial entity tables, into media_assets +
// media_associations with role='reference'.
//
// THE dedup payoff: when the same Variety / fxguide / Wikipedia URL
// appears in references jsonbs on multiple entity rows, the URL
// unique key on media_assets collapses them into one canonical row
// with N polymorphic associations. Before this script: same URL
// duplicated across N jsonbs. After: one media_assets row, N
// media_associations rows.
//
// We DO NOT modify the source jsonbs — they remain authoritative
// for the existing render surfaces during the transition. Phase 26
// rewrites the read paths to consult media_associations.
//
// Idempotent: same URL on a re-run upserts; same (asset, entity,
// role) is a no-op via the unique constraint.
import { db, sql, upsertMediaAsset, associateMedia, type MediaEntityType } from '../src/index.ts';

console.log('Phase 25 — backfill per-entity references jsonbs\n');

type EntitySpec = {
  table: string;
  entityType: MediaEntityType;
};

const ENTITIES: EntitySpec[] = [
  { table: 'vfx_houses',                entityType: 'vfx_house' },
  { table: 'stunt_companies',           entityType: 'stunt_company' },
  { table: 'stunt_schools',             entityType: 'stunt_school' },
  { table: 'stunt_rigging_techniques',  entityType: 'stunt_rigging_technique' },
  { table: 'safety_bulletins',          entityType: 'safety_bulletin' },
  { table: 'stunt_sequences',           entityType: 'stunt_sequence' },
];

type ReferenceItem = {
  title?: string;
  url?: string;
  publication?: string;
  kind?: string;
};

let totalRefsRead = 0;
let assetsCreated = 0;
let assetsRefreshed = 0;
let associationsMade = 0;
let assetsByUrl = new Map<string, number>();

function inferKind(ref: ReferenceItem): 'video' | 'document' | 'link' {
  const k = ref.kind?.toLowerCase() ?? '';
  if (k === 'video') return 'video';
  if (k === 'bulletin' || k === 'pdf') return 'document';
  return 'link';
}

for (const spec of ENTITIES) {
  // Use a parameter-free literal in the table name (safe — comes
  // from a fixed in-script enum, not user input).
  const rows = await db.execute<{ id: number; refs: ReferenceItem[] | null }>(sql`
    SELECT id, "references" AS refs FROM ${sql.identifier(spec.table)}
  `);

  let perTableRefs = 0;
  let perTableAssoc = 0;

  for (const row of rows) {
    const refs = Array.isArray(row.refs) ? row.refs : [];
    if (refs.length === 0) continue;

    for (const ref of refs) {
      if (!ref.url || !ref.title) continue;
      perTableRefs++;
      totalRefsRead++;

      const { id: assetId, created } = await upsertMediaAsset(db, {
        kind: inferKind(ref),
        url: ref.url,
        title: ref.title,
        publication: ref.publication ?? null,
        source: ref.publication ?? null,
        metadata: { origin: `backfill:references:${spec.table}` },
      });
      if (created) assetsCreated++;
      else assetsRefreshed++;
      assetsByUrl.set(ref.url, (assetsByUrl.get(ref.url) ?? 0) + 1);

      await associateMedia(db, {
        mediaAssetId: assetId,
        entityType: spec.entityType,
        entityId: row.id,
        role: 'reference',
      });
      associationsMade++;
      perTableAssoc++;
    }
  }
  console.log(`  ${spec.table.padEnd(32)} ${rows.length.toString().padStart(4)} rows · ${perTableRefs.toString().padStart(4)} refs · ${perTableAssoc.toString().padStart(4)} assoc`);
}

// Dedup-payoff metric: how many URLs ended up shared across multiple
// associations? An asset that came from N different entities' jsonbs
// is now one media_assets row with N media_associations.
const sharedUrls = [...assetsByUrl.entries()].filter(([, n]) => n > 1);
console.log(`\nshared URLs (cited on multiple entities): ${sharedUrls.length}`);
if (sharedUrls.length > 0) {
  for (const [url, n] of sharedUrls.slice(0, 6)) {
    console.log(`  ${n}× — ${url.slice(0, 90)}`);
  }
}

console.log(`\ntotals — refs read: ${totalRefsRead} · assets ${assetsCreated} created + ${assetsRefreshed} refreshed · ${associationsMade} associations`);
process.exit(0);
