import postgres from 'postgres';
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });
  const r = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log(r.map((x: { table_name: string }) => x.table_name).join('\n'));
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
