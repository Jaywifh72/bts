import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export type DecisionTreeRow = {
  slug: string;
  craft: string;
  title: string;
  question: string;
  summary: string | null;
  decision_factors: string[];
  references: Array<{ title: string; url: string; publication?: string; kind?: string }>;
};

export type DecisionOptionRow = {
  slug: string;
  label: string;
  summary: string | null;
  when_to_choose: string[];
  pros: string[];
  cons: string[];
  cost_band: string | null;
  complexity_band: string | null;
  example_films: string[];
  sort_order: number;
};

export type DecisionTreeWithOptions = DecisionTreeRow & {
  options: DecisionOptionRow[];
};

export async function listDecisionTrees(
  db: SeedDb = defaultDb,
  opts: { craft?: string; limit?: number } = {},
): Promise<DecisionTreeRow[]> {
  const craft = opts.craft ?? null;
  const limit = opts.limit ?? 200;
  return db.execute<DecisionTreeRow>(sql`
    SELECT slug, craft, title, question, summary, decision_factors,
           COALESCE("references", '[]'::jsonb) AS "references"
      FROM craft_decision_trees
     WHERE ${craft}::text IS NULL OR craft = ${craft}
     ORDER BY craft, title
     LIMIT ${limit}
  `);
}

export async function getDecisionTreeBySlug(
  db: SeedDb = defaultDb,
  slug: string,
): Promise<DecisionTreeWithOptions | null> {
  const trees = await db.execute<DecisionTreeRow>(sql`
    SELECT slug, craft, title, question, summary, decision_factors,
           COALESCE("references", '[]'::jsonb) AS "references"
      FROM craft_decision_trees
     WHERE slug = ${slug}
     LIMIT 1
  `);
  const tree = trees[0];
  if (!tree) return null;
  const options = await db.execute<DecisionOptionRow>(sql`
    SELECT o.slug, o.label, o.summary, o.when_to_choose, o.pros, o.cons,
           o.cost_band, o.complexity_band, o.example_films, o.sort_order
      FROM craft_decision_options o
      JOIN craft_decision_trees t ON t.id = o.tree_id
     WHERE t.slug = ${slug}
     ORDER BY o.sort_order, o.label
  `);
  return { ...tree, options: [...options] };
}
