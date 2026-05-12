import { db, sql } from '../src/index.ts';

const total = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM production_color_pipelines
`);
console.log(`production_color_pipelines rows: ${total[0]!.n}`);

const filmsCovered = await db.execute<{ n: number }>(sql`
  SELECT COUNT(DISTINCT production_id)::int AS n FROM production_color_pipelines
`);
console.log(`distinct films with pipelines: ${filmsCovered[0]!.n}`);

const sample = await db.execute<{
  production_slug: string;
  title: string;
  release_year: number | null;
  pipeline_name: string;
  camera_log: string | null;
  idt: string | null;
  working_space: string | null;
  odt: string | null;
  deliverable: string | null;
}>(sql`
  SELECT p.slug AS production_slug, p.title, p.release_year,
         pcp.pipeline_name, pcp.camera_log, pcp.idt, pcp.working_space,
         pcp.odt, pcp.deliverable
  FROM production_color_pipelines pcp
  JOIN productions p ON p.id = pcp.production_id
  ORDER BY p.release_year DESC NULLS LAST, p.title, pcp.sort_order
  LIMIT 15
`);
console.log('\nsample:');
for (const r of sample) console.log(`  ${(r.release_year ?? '----').toString()} ${r.production_slug.padEnd(40)} ${r.pipeline_name}`);
if (sample.length > 0) {
  console.log('\nfirst row schema:');
  console.log(JSON.stringify(sample[0], null, 2));
}

// Distinct pipeline-name and odt values across the corpus
const pipelineNames = await db.execute<{ pipeline_name: string; n: number }>(sql`
  SELECT pipeline_name, COUNT(*)::int AS n
  FROM production_color_pipelines
  GROUP BY pipeline_name ORDER BY n DESC LIMIT 10
`);
console.log('\ndistinct pipeline_name values:');
for (const r of pipelineNames) console.log(`  ${r.n.toString().padStart(3)} ${r.pipeline_name}`);

process.exit(0);
