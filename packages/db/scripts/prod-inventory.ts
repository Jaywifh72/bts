import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL!;
  const useSsl = url.includes('sslmode=require') || url.includes('neon.tech');
  const sql = postgres(url, { ssl: useSsl ? 'require' : false, max: 1 });
  const q = await sql`SELECT
    (SELECT count(*) FROM productions) AS productions,
    (SELECT count(*) FROM productions WHERE poster_path IS NOT NULL) AS productions_with_poster,
    (SELECT count(*) FROM productions WHERE backdrop_path IS NOT NULL) AS productions_with_backdrop,
    (SELECT count(*) FROM productions WHERE tmdb_id IS NOT NULL) AS productions_with_tmdb_id,
    (SELECT count(*) FROM people) AS people,
    (SELECT count(*) FROM people WHERE profile_path IS NOT NULL) AS people_with_profile,
    (SELECT count(*) FROM people WHERE imdb_id IS NOT NULL) AS people_with_imdb_id,
    (SELECT count(*) FROM production_videos) AS videos,
    (SELECT count(*) FROM productions WHERE embedding IS NOT NULL) AS prod_embeddings,
    (SELECT count(*) FROM people WHERE embedding IS NOT NULL) AS people_embeddings,
    (SELECT count(*) FROM production_keyframes) AS keyframes,
    (SELECT count(*) FROM production_keyframes WHERE embedding IS NOT NULL) AS keyframes_with_embedding,
    (SELECT count(*) FROM media_assets) AS media_assets,
    (SELECT count(*) FROM production_awards) AS awards,
    (SELECT count(*) FROM crew_assignments) AS crew_assignments,
    (SELECT count(*) FROM sources) AS sources,
    (SELECT count(*) FROM vfx_houses) AS vfx_houses`;
  console.table(q[0]);
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
