import postgres from 'postgres';
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });
  const r = await sql`
    SELECT p.slug, count(*)::int AS sources
    FROM productions p
    JOIN production_sources ps ON ps.production_id = p.id
    GROUP BY p.slug
    ORDER BY sources DESC
    LIMIT 8`;
  console.table(r);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
