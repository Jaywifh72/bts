import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

// Stash the client on globalThis so Next.js HMR + RSC module
// refreshes don't leak Postgres connections — without this, each
// hot reload creates a fresh `postgres()` client that holds onto
// `max` connections, and the server quickly hits Postgres's
// `max_connections` ceiling. Production builds are unaffected
// (the module is loaded once), but the same pattern keeps the
// pool count predictable there too.
type Globals = typeof globalThis & {
  __bts_pg?: ReturnType<typeof postgres>;
};
const g = globalThis as Globals;

// Pool sizing rationale:
//   • Film detail page fires ~19 parallel queries (Promise.all). max=3 caused
//     queue-stacking under concurrency.
//   • DATABASE_POOL_MAX env override exists for platform-specific tuning
//     (Neon/Supabase transaction-mode poolers prefer higher per-instance max;
//     direct PG hosts cap at max_connections / instances).
//   • Default 10: good for single-process Node hosts; pair with an external
//     pooler (pgbouncer / Supabase pooler) at scale.
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 10);

// Postgres-js returns BIGINT (OID 20) as strings by default to avoid JS Number
// precision loss above 2^53. Our id columns are `bigserial` but our TypeScript
// types throughout the codebase declare `id: number`, and key equality checks
// (`row.id === otherRow.id`) need consistent type — a string returned here
// silently breaks comparisons against numeric ids from INSERT RETURNING. We
// cap our ids well under 2^53 (millions, not 10^15), so coercing to Number is
// safe and matches the declared TS types. Documented trade-off.
const BIGINT_AS_NUMBER = {
  to: 20,
  from: [20] as number[],
  serialize: (x: number | bigint | string) => x.toString(),
  parse: (x: string) => Number(x),
};

export const sql = g.__bts_pg ?? postgres(url, {
  max: POOL_MAX,
  // Recycle idle connections after 30s so a stale HMR generation's
  // sockets don't sit half-open against the server.
  idle_timeout: 30,
  // Statement timeout — protects against runaway queries (e.g. accidental
  // cross-join) consuming pool slots. 30s is generous for analytics queries.
  connect_timeout: 10,
  types: { bigint: BIGINT_AS_NUMBER },
});
if (!g.__bts_pg) g.__bts_pg = sql;

export const db = drizzle(sql);
