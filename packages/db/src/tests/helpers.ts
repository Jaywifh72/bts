import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Match the runtime db.ts: return BIGINT as Number so id equality checks
// behave consistently across SELECT + INSERT RETURNING. See db.ts for the
// safety rationale (ids stay well under 2^53).
const BIGINT_AS_NUMBER = {
  to: 20,
  from: [20] as number[],
  serialize: (x: number | bigint | string) => x.toString(),
  parse: (x: string) => Number(x),
};

export function createTestDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required');
  const sql = postgres(url, { max: 5, types: { bigint: BIGINT_AS_NUMBER } });
  return { sql, db: drizzle(sql) };
}

export async function resetTestSchema(sql: postgres.Sql) {
  await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;');
}

export function expectOne<T>(rows: readonly T[], label = 'row'): T {
  const row = rows[0];
  if (!row) throw new Error(`Expected ${label} to exist`);
  return row;
}
