// Phase 22 smoke test — proves the polymorphic media model works
// end-to-end:
//   1. Upsert a single media asset
//   2. Associate it to 3 different entity types (production, person,
//      stunt company) with appropriate roles
//   3. Read it back from each entity to confirm the polymorphic
//      lookup resolves the same source row
//   4. Read the asset's associations from the asset side
//
// Cleanup at the end so the test is idempotent — re-running drops
// the test asset and its associations (CASCADE handles the joins).
import {
  db, sql,
  upsertMediaAsset, associateMedia, listMediaForEntity, listEntitiesForMedia,
} from '../src/index.ts';

const TEST_URL = 'https://variety.com/2019/film/news/john-wick-stunt-choreography-1203221056/';

console.log('Phase 22 smoke test — polymorphic media\n');

// ── 1. Upsert the asset ───────────────────────────────────────────

const { id: assetId, created } = await upsertMediaAsset(db, {
  kind: 'link',
  url: TEST_URL,
  title: 'How John Wick redefined action choreography',
  publication: 'Variety',
  source: 'variety',
  publishedAt: '2019-03-15',
});
console.log(`asset id=${assetId} created=${created}\n`);

// ── 2. Resolve the entity ids we want to associate to ────────────

const [production] = await db.execute<{ id: number; title: string }>(sql`
  SELECT id, title FROM productions WHERE slug = 'avengers-endgame-2019'
`);
const [person] = await db.execute<{ id: number; display_name: string }>(sql`
  SELECT id, display_name FROM people WHERE slug = 'chad-stahelski'
`);
const [company] = await db.execute<{ id: number; name: string }>(sql`
  SELECT id, name FROM stunt_companies WHERE slug = '87eleven-action-design'
`);

if (!production || !person || !company) {
  console.error('ABORT — one of the test entities is missing.');
  process.exit(1);
}

// ── 3. Associate the SAME asset to all three with different roles ─

await associateMedia(db, {
  mediaAssetId: assetId,
  entityType: 'production',
  entityId: production.id,
  role: 'reference',
  notes: 'Cited as background on the John Wick choreography lineage.',
});
await associateMedia(db, {
  mediaAssetId: assetId,
  entityType: 'person',
  entityId: person.id,
  role: 'subject',
  captionOverride: 'Stahelski profile — directorial transition.',
});
await associateMedia(db, {
  mediaAssetId: assetId,
  entityType: 'stunt_company',
  entityId: company.id,
  role: 'reference',
});
console.log('associated asset to 3 entities (production/person/company)\n');

// ── 4. Read it back from each entity ──────────────────────────────

const fromProduction = await listMediaForEntity(db, {
  entityType: 'production', entityId: production.id, limit: 5,
});
const fromPerson = await listMediaForEntity(db, {
  entityType: 'person', entityId: person.id, limit: 5,
});
const fromCompany = await listMediaForEntity(db, {
  entityType: 'stunt_company', entityId: company.id, limit: 5,
});

console.log(`from production "${production.title}":`);
for (const r of fromProduction) {
  console.log(`  → ${r.title}  [${r.role}]  cap: ${r.caption_override ?? r.caption ?? '—'}`);
}
console.log(`\nfrom person "${person.display_name}":`);
for (const r of fromPerson) {
  console.log(`  → ${r.title}  [${r.role}]  cap: ${r.caption_override ?? r.caption ?? '—'}`);
}
console.log(`\nfrom company "${company.name}":`);
for (const r of fromCompany) {
  console.log(`  → ${r.title}  [${r.role}]`);
}

// ── 5. Read the inverse — every entity associated with the asset ─

const inverse = await listEntitiesForMedia(db, assetId);
console.log(`\nfrom asset id=${assetId} (inverse):`);
for (const r of inverse) {
  console.log(`  ↳ ${r.entity_type}/${r.entity_id}  [${r.role}]  cap: ${r.caption_override ?? '—'}`);
}

// ── 6. Cleanup so the test is idempotent ──────────────────────────

await db.execute(sql`DELETE FROM media_assets WHERE id = ${assetId}`);
console.log('\ncleaned up — asset + associations removed.');

process.exit(0);
