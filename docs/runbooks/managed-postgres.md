# Managed Postgres — cutover from local Docker

## Decision: Neon vs Supabase

CineCanon needs **Postgres 16 + pgvector + pg_trgm**. Both Neon and
Supabase support that. Pick by use-case:

| | Neon | Supabase |
|---|---|---|
| Branching for previews | Yes (free) | No |
| Auto-scale to zero | Yes (cold-start ~500ms) | No |
| Connection pooling | Built-in (pgbouncer) | Built-in (supavisor) |
| Storage cost | $0.000164/GB-hr (~$0.12/GB/mo) | $0.021/GB/mo |
| Free tier | 0.5GB + 100h compute/mo | 500MB + 2GB egress/mo |
| Realtime / auth / storage bundled | No (just Postgres) | Yes |
| pgvector HNSW indexes | Supported | Supported |
| Best for CineCanon | **Yes — branch-per-PR + scale-to-zero** | Only if you want bundled auth |

**Recommendation: Neon.** CineCanon is a static-mostly site with periodic
admin ingest jobs. Scale-to-zero matches that load profile; per-PR branches
let Vercel preview deploys run against an isolated copy of the data.

## Cutover plan

### 1. Provision

- Sign up at https://neon.tech
- Create project: `studio-pro` (Postgres 16, region matching your Vercel
  region)
- In the project's SQL editor, enable extensions:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```

### 2. Dump local

```bash
# From repo root, with bts-postgres up:
docker exec bts-postgres pg_dump \
  -U bts -d bts -F c -f /tmp/bts.dump --no-owner --no-acl
docker cp bts-postgres:/tmp/bts.dump ./bts.dump
```

### 3. Restore to Neon

Get the connection string from Neon dashboard (Settings → Connection
Details → **direct connection**, not pooled — pg_restore doesn't like
pgbouncer).

```bash
pg_restore -d "postgresql://<user>:<pass>@<host>/bts?sslmode=require" \
  --no-owner --no-acl --clean --if-exists \
  ./bts.dump
```

Expect ~5–15min depending on data volume. The HNSW indexes are the slow
part; they rebuild during restore.

### 4. Verify

```bash
psql "postgresql://...neon.tech/bts?sslmode=require" -c \
  "SELECT COUNT(*) FROM productions; SELECT COUNT(*) FROM people; \
   SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm');"
```

Expect: production_count > 0, people_count > 0, both extensions listed.

### 5. Wire the app

Use Neon's **pooled** connection string (the one with `-pooler` in the
host) for the app — better for serverless cold starts:

```
DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.<region>.neon.tech/bts?sslmode=require
```

Set in Vercel/Fly. For local dev, keep the Docker connection string in
`.env.local` so you don't burn Neon compute hours on local work.

### 6. Migrations going forward

Run from local against Neon when you have new migrations:

```bash
DATABASE_URL="postgresql://...neon.tech/..." \
  pnpm --filter @bts/db migrate
```

The journal in `packages/db/migrations/meta/_journal.json` is the source
of truth for which migrations have run — drizzle won't re-apply.

### 7. Branching for previews

Once production is on Neon, every PR can have its own branch:

```bash
# In Vercel project settings:
# - Add env var: DATABASE_URL (production) = pooled prod string
# - Add env var: DATABASE_URL (preview) = $NEON_DATABASE_URL
# - Install the Neon Vercel integration → it sets NEON_DATABASE_URL
#   automatically to a branch-per-deployment
```

## Rollback

If the cutover misbehaves: revert `DATABASE_URL` to the Docker connection
string. The dump is still on disk; the Neon project can be deleted without
data loss elsewhere.

## Cost

For CineCanon's expected shape (~5GB data, low query volume, periodic
ingest spikes):
- Neon free: 0.5GB — **not enough**, need paid tier
- Neon Launch ($19/mo): 10GB storage + 300h compute — **fits**
- At scale: storage at $0.12/GB/mo + compute at $0.16/CU-hr

## What to do NOT migrate yet

- pgvector embeddings on `production_keyframes` — these are large
  (~3000 dims × N keyframes). Verify Neon's storage cost works before
  restoring them. Worst case: drop the column, migrate, regenerate with
  the embedding sweep script (E-25 in the augmentation plan).
