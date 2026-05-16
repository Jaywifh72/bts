import postgres from 'postgres';
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });
  const r = await sql`SELECT data_tier, count(*) FROM productions GROUP BY data_tier ORDER BY count(*) DESC`;
  console.table(r);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
