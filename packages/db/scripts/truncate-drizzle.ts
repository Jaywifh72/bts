import postgres from 'postgres';
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });
  await sql.unsafe(`TRUNCATE drizzle."__drizzle_migrations" RESTART IDENTITY CASCADE`);
  console.log('drizzle.__drizzle_migrations truncated');
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
