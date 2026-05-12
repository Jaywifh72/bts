import { db, sql } from '../src/index.ts';
const rows = await db.execute(sql`
  SELECT DISTINCT unnest(safety_bulletins_followed) AS b FROM stunt_sequences
  ORDER BY b
`);
for (const r of rows) console.log(JSON.stringify(r));
process.exit(0);
