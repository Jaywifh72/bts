import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

export function createTestDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required');
  const sql = postgres(url, { max: 5 });
  return { sql, db: drizzle(sql) };
}

export async function resetTestSchema(sql: postgres.Sql) {
  await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;');
}
