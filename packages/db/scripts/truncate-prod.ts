import postgres from 'postgres';

/**
 * Truncate all user tables in target DB (preserves schema + extensions).
 * Used before restoring a fresh data dump from local dev.
 */
async function main() {
  const url = process.env.DATABASE_URL!;
  if (!url.includes('neon.tech') && !process.env.FORCE) {
    console.error('Refusing to truncate non-Neon DB without FORCE=1');
    process.exit(1);
  }
  const sql = postgres(url, { ssl: 'require', max: 1 });
  // Get all user tables in public schema
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '__drizzle%'
      AND table_name NOT IN ('spatial_ref_sys')
    ORDER BY table_name`;
  console.log(`Truncating ${tables.length} tables...`);
  const list = tables.map((t) => `"public"."${t.table_name}"`).join(', ');
  await sql.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  console.log('All tables truncated.');
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
