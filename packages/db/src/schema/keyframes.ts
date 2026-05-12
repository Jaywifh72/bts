import { bigserial, bigint, integer, jsonb, text, timestamp, pgTable, index } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productions } from './productions.ts';
import { scenes } from './scenes.ts';

export const productionKeyframes = pgTable('production_keyframes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  sceneId: bigint('scene_id', { mode: 'number' })
    .references(() => scenes.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  // E-29: hex strings ordered most-dominant first, e.g. ["#1a1a1a", ...].
  palette: jsonb('palette').$type<string[]>(),
  // E-30: 64-bit perceptual hash for dedup; null until extracted.
  phash: bigint('phash', { mode: 'bigint' }),
  // E-28: 768-dim SigLIP-2 visual embedding; null until extracted.
  embedding: vector('embedding', { dimensions: 768 }),
  // 0053 — embedding model versioning (see productions schema).
  embeddingModel: text('embedding_model'),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionIdx: index('production_keyframes_production_idx').on(t.productionId, t.sortOrder),
  // Partial — phash is null until the dedup extractor runs.
  phashIdx: index('production_keyframes_phash_idx').on(t.phash).where(sql`${t.phash} IS NOT NULL`),
  // 0050 — reverse-lookup ("keyframes for this scene"). Partial since scene_id is nullable.
  sceneIdx: index('production_keyframes_scene_idx').on(t.sceneId).where(sql`${t.sceneId} IS NOT NULL`),
}));
