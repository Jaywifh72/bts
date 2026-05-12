import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-40 — auto-post newly-curated productions to Bluesky + Mastodon.
 *
 * "Newly-curated" = `data_tier = 'curated'` AND no row in
 * `social_post_log` for the (production, channel) pair. Idempotent
 * via the table's UNIQUE (production_id, channel) constraint.
 *
 * Without `BLUESKY_HANDLE`/`BLUESKY_APP_PASSWORD` or
 * `MASTODON_INSTANCE`/`MASTODON_TOKEN`, the channel is skipped.
 * `--dry-run` prints what would post without sending.
 */

const SITE = process.env.PUBLIC_SITE_URL ?? 'https://studiopro.dev';

type PendingProduction = {
  id: number;
  slug: string;
  title: string;
  release_year: number | null;
  synopsis: string | null;
};

function formatPostText(p: PendingProduction): string {
  const url = `${SITE}/films/${p.slug}`;
  const yearTag = p.release_year ? ` (${p.release_year})` : '';
  // Bluesky 300 char limit, Mastodon 500 default. Keep tight for both.
  const lead = `Now curated on Studio Pro: ${p.title}${yearTag}`;
  const synopsis = p.synopsis ? `\n\n${p.synopsis.slice(0, 140)}${p.synopsis.length > 140 ? '…' : ''}` : '';
  return `${lead}${synopsis}\n\n${url}`;
}

// ─── Bluesky ────────────────────────────────────────────────────────────────

async function postToBluesky(text: string): Promise<{ url: string }> {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) throw new Error('BLUESKY_HANDLE / BLUESKY_APP_PASSWORD not set');

  // 1. Create session for a bearer token.
  const session = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password }),
  });
  if (!session.ok) throw new Error(`Bluesky session ${session.status}: ${(await session.text()).slice(0, 200)}`);
  const { accessJwt, did } = (await session.json()) as { accessJwt: string; did: string };

  // 2. Post the record.
  const create = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessJwt}`,
    },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
      },
    }),
  });
  if (!create.ok) throw new Error(`Bluesky post ${create.status}: ${(await create.text()).slice(0, 200)}`);
  const { uri } = (await create.json()) as { uri: string };
  // Convert at:// URI to bsky.app web URL.
  const m = uri.match(/^at:\/\/(.+?)\/app\.bsky\.feed\.post\/(.+)$/);
  const webUrl = m ? `https://bsky.app/profile/${m[1]}/post/${m[2]}` : uri;
  return { url: webUrl };
}

// ─── Mastodon ───────────────────────────────────────────────────────────────

async function postToMastodon(text: string): Promise<{ url: string }> {
  const instance = process.env.MASTODON_INSTANCE;
  const token = process.env.MASTODON_TOKEN;
  if (!instance || !token) throw new Error('MASTODON_INSTANCE / MASTODON_TOKEN not set');

  const res = await fetch(`${instance.replace(/\/$/, '')}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: text, visibility: 'public' }),
  });
  if (!res.ok) throw new Error(`Mastodon ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { url } = (await res.json()) as { url: string };
  return { url };
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

export type SocialPostStats = {
  attempted: number;
  bluesky_sent: number;
  mastodon_sent: number;
  bluesky_skipped: number;
  mastodon_skipped: number;
  errors: number;
};

export async function postNewlyCurated(opts: { dryRun?: boolean; limit?: number } = {}): Promise<SocialPostStats> {
  const stats: SocialPostStats = {
    attempted: 0, bluesky_sent: 0, mastodon_sent: 0,
    bluesky_skipped: 0, mastodon_skipped: 0, errors: 0,
  };
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<PendingProduction>(sql`
    SELECT p.id, p.slug, p.title, p.release_year, p.synopsis
    FROM productions p
    WHERE p.data_tier = 'curated'
      AND NOT EXISTS (
        SELECT 1 FROM social_post_log spl
        WHERE spl.production_id = p.id
          AND spl.channel IN ('bluesky', 'mastodon')
          AND spl.status IN ('sent', 'dry_run')
        GROUP BY spl.production_id
        HAVING COUNT(DISTINCT spl.channel) >= 2
      )
    ORDER BY p.last_verified_at DESC NULLS LAST, p.id DESC
    ${limitClause}
  `);

  console.log(`social:post — ${targets.length} candidate productions${opts.dryRun ? ' (DRY RUN)' : ''}`);

  for (const p of targets) {
    stats.attempted++;
    const text = formatPostText(p);

    // Per-channel: skip if already sent. Try send. Log result.
    for (const channel of ['bluesky', 'mastodon'] as const) {
      const existing = await db.execute<{ id: number }>(sql`
        SELECT id FROM social_post_log
        WHERE production_id = ${p.id} AND channel = ${channel}
          AND status IN ('sent', 'dry_run')
      `);
      if (existing.length > 0) {
        if (channel === 'bluesky') stats.bluesky_skipped++; else stats.mastodon_skipped++;
        continue;
      }

      if (opts.dryRun) {
        console.log(`  [dry] ${p.slug} → ${channel}\n    ${text.replace(/\n/g, '\n    ')}`);
        await db.execute(sql`
          INSERT INTO social_post_log (production_id, channel, status, post_url)
          VALUES (${p.id}, ${channel}, 'dry_run', NULL)
          ON CONFLICT (production_id, channel) DO NOTHING
        `);
        continue;
      }

      try {
        const { url } = channel === 'bluesky'
          ? await postToBluesky(text)
          : await postToMastodon(text);
        console.log(`  [sent] ${p.slug} → ${channel}: ${url}`);
        await db.execute(sql`
          INSERT INTO social_post_log (production_id, channel, status, post_url)
          VALUES (${p.id}, ${channel}, 'sent', ${url})
          ON CONFLICT (production_id, channel) DO UPDATE
            SET status = 'sent', post_url = EXCLUDED.post_url, posted_at = NOW(), error = NULL
        `);
        if (channel === 'bluesky') stats.bluesky_sent++; else stats.mastodon_sent++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  [fail] ${p.slug} → ${channel}: ${msg}`);
        await db.execute(sql`
          INSERT INTO social_post_log (production_id, channel, status, error)
          VALUES (${p.id}, ${channel}, 'failed', ${msg})
          ON CONFLICT (production_id, channel) DO UPDATE
            SET status = 'failed', error = EXCLUDED.error, posted_at = NOW()
        `);
        stats.errors++;
      }
    }
  }

  console.log(`social:post done — ${JSON.stringify(stats)}`);
  return stats;
}
