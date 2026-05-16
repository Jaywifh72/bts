/**
 * One-shot applier for the UX-audit migrations (0059–0063). These were
 * hand-written rather than drizzle-kit generated, so they're not in
 * `meta/_journal.json` — `drizzle-kit migrate` skips them.
 *
 * Each migration's SQL is idempotent (ADD COLUMN IF NOT EXISTS,
 * CREATE INDEX IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
 * ADD VALUE IF NOT EXISTS) so re-running is safe.
 *
 * Run with: pnpm --filter @bts/db exec tsx scripts/apply-ux-audit-migrations.ts
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, sql } from '../src/index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  '0059_crew_assignments_is_primary.sql',
  '0060_entity_provenance_columns.sql',
  '0061_claim_entity_types_extension.sql',
  '0062_scoring_stages.sql',
  '0063_media_assets_provenance.sql',
];

async function main() {
  for (const file of MIGRATIONS) {
    const path = join(__dirname, '..', 'migrations', file);
    const sqlText = readFileSync(path, 'utf8');
    console.log(`→ applying ${file}`);

    if (file === '0061_claim_entity_types_extension.sql') {
      // ALTER TYPE … ADD VALUE can't run inside a transaction; run each
      // line individually so postgres autocommits between them.
      const adds = sqlText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('ALTER TYPE'));
      for (const stmt of adds) {
        const clean = stmt.replace(/;\s*$/, '');
        await db.execute(sql.raw(clean));
      }
    } else {
      // Other migrations: send the whole file as one batch. postgres-js
      // supports multi-statement queries via .unsafe() with no params.
      // Strip the leading comment block to avoid the parser tripping on
      // dashes inside quoted comments.
      try {
        await db.execute(sql.raw(sqlText));
      } catch (e) {
        console.error(`  ✗ failed: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
      }
    }
    console.log(`  ✓ ${file}`);
  }
  console.log('\nAll 5 UX-audit migrations applied.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Failed:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
