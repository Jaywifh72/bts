# Upstash Redis — rate-limit backend

## Why

`apps/web/lib/rate-limit.ts` uses Upstash for distributed rate-limiting in
production. Without credentials it falls back to an **in-memory** map keyed
by IP — which is fine for a single-process dev server but useless on
Vercel/Fly/Render where each request can hit a different lambda.

The fallback is deliberate: we don't want builds to fail in environments
without Redis. But shipping to production without Upstash means the
rate-limits on `/api/import/letterboxd/match`, `/api/search/nl`,
`/api/search/semantic`, `/api/export/films.csv`, and the corrections form
are effectively disabled.

## Setup

1. **Create an Upstash database**
   - Go to https://console.upstash.com → "Create Database"
   - Region: pick the one closest to your Next.js deployment (Vercel:
     check your project's primary region; Fly: your primary node region)
   - Type: **Regional** (Global only matters if you have multiple
     deployment regions — overkill for now)
   - TLS: on (default)

2. **Copy credentials from the database's REST API tab**
   - `UPSTASH_REDIS_REST_URL` → `https://<id>.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → the long token string

3. **Set in your deployment env**
   - Vercel: Project Settings → Environment Variables → add both for
     Production + Preview
   - Fly: `fly secrets set UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=...`
   - Local (`apps/web/.env.local`):
     ```
     UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
     UPSTASH_REDIS_REST_TOKEN=<token>
     ```

## Verify

After deploying with the env set, hit a rate-limited endpoint 6 times in
quick succession:

```bash
for i in $(seq 1 6); do
  curl -sS -o /dev/null -w "%{http_code}\n" \
    "https://<your-domain>/api/export/films.csv?tier=curated"
done
```

Expected: first 5 → `200`, 6th → `429`. Without Upstash the in-memory
limiter would still produce that pattern on a single lambda but fail
randomly across multiple — so the test is more meaningful with several
parallel terminals.

## Cost

Upstash free tier: 10K commands/day + 256MB. Studio Pro's rate-limit
counters cost ~2 commands per request (INCR + EXPIRE), so 10K/day covers
~5K rate-limited requests/day. Pay-as-you-go: $0.20 per 100K commands
beyond that. Effectively free unless you cross 150K rate-limited requests
per day.

## Rollback

Remove the env vars → next deploy falls back to in-memory automatically.
No code change needed.
