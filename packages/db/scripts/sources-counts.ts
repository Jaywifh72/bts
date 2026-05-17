import postgres from 'postgres';
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });
  const r = await sql`SELECT
    (SELECT count(*) FROM production_sources) AS production_sources,
    (SELECT count(DISTINCT production_id) FROM production_sources) AS productions_with_sources,
    (SELECT count(*) FROM productions WHERE data_tier='curated') AS curated_productions`;
  console.table(r);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
