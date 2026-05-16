import { NextResponse } from 'next/server';
import { db, sql } from '@bts/db';

/**
 * Healthcheck endpoint for uptime monitoring + load balancers.
 *
 *   GET /api/health  →  200 { ok: true, db, migrations, latency_ms }
 *                       503 { ok: false, error: string }
 *
 * Checks:
 *   - Postgres is reachable.
 *   - UX-audit migrations 0059–0063 landed (cheap one-row probe).
 *
 * Intentionally cheap — uptime probes hit this every 30-60s, so it
 * runs two trivial queries and reports latency. Heavier health
 * (replication lag, ISR cache freshness, etc.) lives on
 * /admin/health behind auth.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const started = Date.now();
  try {
    // Sanity-probe: can we round-trip?
    const ping = await db.execute<{ ok: number }>(sql`SELECT 1::int AS ok`);
    if (ping[0]?.ok !== 1) {
      return NextResponse.json(
        { ok: false, error: 'DB ping returned unexpected shape' },
        { status: 503 },
      );
    }

    // Migration sentinel — confirm 0059's column landed. Cheap proof
    // the deploy is reading the right database.
    const sentinel = await db.execute<{ has_col: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'crew_assignments' AND column_name = 'is_primary'
      ) AS has_col
    `);
    const migrationsApplied = sentinel[0]?.has_col === true;

    const latency = Date.now() - started;
    return NextResponse.json(
      {
        ok: migrationsApplied,
        db: 'reachable',
        migrations: migrationsApplied ? 'applied' : 'pending',
        latency_ms: latency,
      },
      {
        status: migrationsApplied ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 200) : 'unknown',
        latency_ms: Date.now() - started,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
