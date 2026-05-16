import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Drop all FK constraints in public schema (so a data-only restore can
 * load tables in any order), saving their definitions to disk so we can
 * re-add them after the restore.
 */
async function main() {
  const url = process.env.DATABASE_URL!;
  const sql = postgres(url, { ssl: 'require', max: 1 });
  const mode = process.argv[2] ?? 'drop';

  if (mode === 'drop') {
    const fks = await sql<{ table_name: string; constraint_name: string; def: string }[]>`
      SELECT
        conrelid::regclass::text AS table_name,
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE contype = 'f'
        AND connamespace = 'public'::regnamespace
      ORDER BY conrelid::regclass::text, conname`;
    console.log(`Found ${fks.length} FK constraints`);
    const out = path.join(__dirname, '..', '..', '..', 'tmp', 'fks.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(fks, null, 2));
    console.log(`Saved FK definitions to ${out}`);
    for (const fk of fks) {
      await sql.unsafe(`ALTER TABLE ${fk.table_name} DROP CONSTRAINT "${fk.constraint_name}"`);
    }
    console.log(`Dropped ${fks.length} FK constraints`);
  } else if (mode === 'restore') {
    const inp = path.join(__dirname, '..', '..', '..', 'tmp', 'fks.json');
    const fks = JSON.parse(fs.readFileSync(inp, 'utf8')) as { table_name: string; constraint_name: string; def: string }[];
    console.log(`Re-adding ${fks.length} FK constraints (may take a few minutes)...`);
    let ok = 0;
    let fail = 0;
    for (const fk of fks) {
      try {
        await sql.unsafe(`ALTER TABLE ${fk.table_name} ADD CONSTRAINT "${fk.constraint_name}" ${fk.def} NOT VALID`);
        ok++;
      } catch (e) {
        console.error(`FAIL ${fk.table_name}.${fk.constraint_name}: ${(e as Error).message}`);
        fail++;
      }
    }
    console.log(`Done: ${ok} added, ${fail} failed`);
  } else {
    console.error(`Usage: tsx fk-toggle.ts <drop|restore>`);
    process.exit(1);
  }
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
