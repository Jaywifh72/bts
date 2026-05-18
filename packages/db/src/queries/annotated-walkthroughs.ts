import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type WalkthroughRow = {
  slug: string;
  kind: string;
  headline: string;
  scene_label: string | null;
  lead_credit: string | null;
  lead_slug: string | null;
  lead_name: string | null;
  duration_s: number | null;
  production_slug: string;
  production_title: string;
  release_year: number | null;
  summary: string | null;
  body: string | null;
  tags: string[];
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  data_tier: string;
};

export type BeatRow = {
  timecode: string;
  timecode_s: string | null;
  duration_s: string | null;
  beat_kind: string | null;
  label: string;
  notes: string | null;
  sort_order: number;
};

export type WalkthroughWithBeats = WalkthroughRow & { beats: BeatRow[] };

export async function listWalkthroughs(
  db: SeedDb = defaultDb,
  opts: { kind?: string; limit?: number } = {},
): Promise<WalkthroughRow[]> {
  const kind = opts.kind ?? null;
  const limit = opts.limit ?? 200;
  return db.execute<WalkthroughRow>(sql`
    SELECT w.slug, w.kind, w.headline, w.scene_label, w.lead_credit,
           lp.slug AS lead_slug, lp.display_name AS lead_name,
           w.duration_s,
           p.slug AS production_slug, p.title AS production_title, p.release_year,
           w.summary, w.body, w.tags,
           COALESCE(w."references", '[]'::jsonb) AS "references",
           w.data_tier
      FROM annotated_walkthroughs w
      JOIN productions p ON p.id = w.production_id
      LEFT JOIN people lp ON lp.id = w.lead_person_id
     WHERE ${kind}::text IS NULL OR w.kind = ${kind}
     ORDER BY p.release_year DESC NULLS LAST, p.title, w.headline
     LIMIT ${limit}
  `);
}

export async function getWalkthroughBySlug(
  db: SeedDb = defaultDb,
  slug: string,
): Promise<WalkthroughWithBeats | null> {
  const rows = await db.execute<WalkthroughRow>(sql`
    SELECT w.slug, w.kind, w.headline, w.scene_label, w.lead_credit,
           lp.slug AS lead_slug, lp.display_name AS lead_name,
           w.duration_s,
           p.slug AS production_slug, p.title AS production_title, p.release_year,
           w.summary, w.body, w.tags,
           COALESCE(w."references", '[]'::jsonb) AS "references",
           w.data_tier
      FROM annotated_walkthroughs w
      JOIN productions p ON p.id = w.production_id
      LEFT JOIN people lp ON lp.id = w.lead_person_id
     WHERE w.slug = ${slug}
     LIMIT 1
  `);
  const w = rows[0];
  if (!w) return null;
  const beats = await db.execute<BeatRow>(sql`
    SELECT b.timecode, b.timecode_s, b.duration_s, b.beat_kind,
           b.label, b.notes, b.sort_order
      FROM walkthrough_beats b
      JOIN annotated_walkthroughs w ON w.id = b.walkthrough_id
     WHERE w.slug = ${slug}
     ORDER BY b.sort_order, b.timecode_s NULLS LAST
  `);
  return { ...w, beats: [...beats] };
}
