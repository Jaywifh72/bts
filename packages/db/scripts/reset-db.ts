import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { runSeed } from '../src/seed/run.ts';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  console.log('reset: dropping public schema');
  await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;');

  console.log('reset: running migrations');
  await migrate(db, { migrationsFolder: './migrations' });

  console.log('reset: seeding');
  await runSeed(db);

  await sql.end();
  console.log('reset: done');
}

main().catch((e) => { console.error('reset failed:', e); process.exit(1); });
