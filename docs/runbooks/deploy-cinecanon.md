# Deploy to cinecanon.com

Single-page runbook for first-deploy of CineCanon. Stack: **Cloudflare DNS + TLS** in front, **Vercel** hosting the Next.js app, **Neon** hosting Postgres with pgvector.

Total elapsed time (no scripts, no AI): ~45 minutes.

---

## 0 · Prereqs

- Cloudflare account with `cinecanon.com` already in your zone list.
- Vercel account (free tier is fine to start).
- Neon account (free tier is fine; upgrade later if needed).
- Local clone with `master` pushed to GitHub (`Jaywifh72/bts`).

---

## 1 · Provision Postgres on Neon (~5 min)

1. Neon → **Create project**.
   - Name: `cinecanon-prod`
   - Region: `US East (Ohio)` (matches the Vercel `iad1` region pinned in `vercel.json` — keeps DB latency low).
   - Postgres version: 16.
2. Confirm **pgvector** is enabled (Neon → Database → Extensions). It's available out-of-the-box on Neon; just verify.
3. From the Neon dashboard, copy **two** connection strings:
   - **Pooled** (the one with `-pooler` in the hostname) → this is your `DATABASE_URL`. Build-time queries hit this.
   - **Direct** (the one without `-pooler`) → this is your `DATABASE_URL_UNPOOLED`. Migrations hit this.

4. Apply migrations against the **direct** URL (pooled URLs can drop session state mid-migration):

   ```bash
   DATABASE_URL='postgres://...prod-direct...' \
     pnpm --filter @bts/db exec tsx scripts/apply-ux-audit-migrations.ts

   # The repo's other hand-written migration too:
   DATABASE_URL='postgres://...prod-direct...' \
     pnpm --filter @bts/db exec drizzle-kit migrate

   # Verify (9-point check):
   DATABASE_URL='postgres://...prod-direct...' \
     pnpm --filter @bts/db exec tsx scripts/verify-ux-audit-migrations.ts
   ```

5. Seed the production data set (one-off, ~5–10 min):

   ```bash
   DATABASE_URL='postgres://...prod-direct...' \
     pnpm --filter @bts/db seed
   ```

---

## 2 · Set up Vercel project (~10 min)

1. Vercel → **Add New** → **Project** → **Import Git Repository** → pick `Jaywifh72/bts`.
2. **Configure project** screen:
   - Framework Preset: `Next.js` (auto-detected).
   - **Root Directory: leave as `.`** (the repo root). `vercel.json` at the root has the explicit `buildCommand` + `outputDirectory` Vercel needs for the monorepo.
   - Build & Output: don't override; `vercel.json` handles it.
3. **Environment Variables** — set these *before* clicking Deploy:

   | Key | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | Neon **pooled** URL | Critical: pooled, not direct |
   | `NEXT_PUBLIC_SITE_URL` | `https://cinecanon.com` | No trailing slash |
   | `ADMIN_TOKEN` | random 32+ char string | `openssl rand -hex 32` |
   | `TMDB_READ_TOKEN` | from themoviedb.org settings | Required for poster/backdrop ingest |
   | `OPENAI_API_KEY` | (optional) | Only needed if running embeddings or /ask in prod |
   | `UPSTASH_REDIS_REST_URL` | (optional) | Distributed rate limit; falls back to in-mem otherwise |
   | `UPSTASH_REDIS_REST_TOKEN` | (optional) | Pairs with above |
   | `NEXT_PUBLIC_SENTRY_DSN` | (optional) | Error tracking |
   | `SIGLIP_ENCODER_URL` | (optional) | /lookbook upload feature |

4. Click **Deploy**. First build takes ~3–5 min. If it fails, see the troubleshooting section.

5. Once green, the project gets a free `*.vercel.app` URL — verify it works before adding the custom domain.

---

## 3 · Add cinecanon.com as a custom domain (~5 min)

1. Vercel project → **Settings** → **Domains** → **Add**.
2. Add **both**:
   - `cinecanon.com` (apex)
   - `www.cinecanon.com` (Vercel will set `www` to redirect to apex)
3. Vercel will display the DNS records it needs. You'll see something like:
   - `A` record on `@` → `76.76.21.21`
   - `CNAME` record on `www` → `cname.vercel-dns.com`

   (Exact IPs change; use whatever Vercel shows.)

---

## 4 · Configure DNS at Cloudflare (~5 min)

1. Cloudflare dashboard → `cinecanon.com` zone → **DNS** → **Records**.
2. **Delete or update** any existing `A` / `CNAME` records on `@` and `www` that point elsewhere (parking page, old host, etc.).
3. **Add** the records Vercel told you to. For each one:
   - **Type**: `A` (apex) or `CNAME` (`www`).
   - **Name**: `@` or `www`.
   - **Target / IPv4 address**: paste from Vercel.
   - **Proxy status**: **DNS only (grey cloud)** for the *first* validation. Orange-cloud (proxied) breaks Vercel's domain verification because Vercel needs to see the raw IP during the cert handshake.
4. Save. DNS propagation is usually <2 min on Cloudflare; can be up to 5.
5. Back in Vercel → **Domains** — it'll auto-validate within 30–60s and issue a Let's Encrypt cert.

### After validation succeeds: turn Cloudflare proxy back on (optional but recommended)

Once Vercel shows "✓ Valid Configuration" on both domains:

1. Cloudflare → DNS → toggle both records to **proxied (orange cloud)**.
2. Cloudflare → SSL/TLS → set encryption mode to **Full (Strict)**. This keeps the Vercel cert intact while letting Cloudflare terminate TLS at its edge.
3. Cloudflare → Rules → Page Rules / Cache Rules → set the cache level for `/api/*` to **Bypass** (so dynamic endpoints aren't cached at the edge).

The orange-cloud mode gives you DDoS protection, WAF, and edge caching for free. Costs nothing on the Cloudflare free plan.

---

## 5 · Verify the deploy (~5 min)

```bash
curl -sS https://cinecanon.com/api/health | jq
# expect: { "ok": true, "db": "reachable", "migrations": "applied", "latency_ms": <int> }

curl -sI https://cinecanon.com/ | head -5
# expect: HTTP/2 200 ; server: vercel ; (and cf-ray when Cloudflare proxy is on)
```

Click through the smoke surfaces:

- `/` — archive-this-week rail renders, shot wall populates
- `/films/[any-slug]` — citations, ACES flow, primary-DP chips
- `/decades/2020` — timeline + format-share + signature-DPs
- `/locations/1` (or any id) — sun arc renders for that day
- `/methodology` — coverage gauges render with live numbers
- ⌘K from any page — palette opens
- `/admin` — gated by `ADMIN_TOKEN`; should prompt if not authenticated

---

## 6 · Wire continuous deploys

Pushing to `master` on GitHub now auto-deploys to Vercel (free tier gets unlimited deploys). Vercel's Preview deployments give every PR a unique URL — useful for review before merge.

---

## Troubleshooting

### Build fails on Vercel with "too many clients"
Your `DATABASE_URL` is pointing at Neon's **direct** URL, not the **pooled** one. Switch to the pooled URL in Vercel's env vars and redeploy.

### Build hangs on "Generating static pages"
Probably the same connection-pool issue. The repo's `next.config.mjs` pins `experimental.cpus: 2` to cap build concurrency — confirm that change is on `master`.

### Domain shows "Invalid Configuration" in Vercel
Cloudflare is still proxying with the orange cloud during validation. Toggle the records to grey cloud (DNS only), wait 60s, click "Refresh" in Vercel.

### `/admin` returns 401 in prod
`ADMIN_TOKEN` env var wasn't set on Vercel. Add it, redeploy.

### Migrations don't apply via drizzle-kit
The repo's UX-audit migrations (0058–0063) are hand-written and not in drizzle's `_journal.json`. Always run `scripts/apply-ux-audit-migrations.ts` first, then `drizzle-kit migrate` for anything else.

### "pgvector extension does not exist"
Neon → Database → Extensions → enable `vector` manually. (Should be on by default; verify.)

---

## Rollback

Vercel keeps every previous deployment indefinitely. To roll back:

1. Vercel project → **Deployments** → find the last green deploy → **⋯** menu → **Promote to Production**.
2. Cloudflare DNS doesn't need to change; the rollback is instant from a CDN perspective.

To roll back schema:

The hand-written migrations 0059–0063 are **all additive** (no DROP). To roll back, manually `ALTER TABLE … DROP COLUMN` the new columns, drop the new tables (`scoring_stages`, `production_scoring_stages`), drop the new enum values (Postgres ≥10 supports this since v17 via `ALTER TYPE … DROP VALUE`, otherwise live with the unused enum value). The data in those columns is lost on rollback — not recoverable from the migrations themselves.

---

## Cost shape (first 30 days)

- Cloudflare: **$0** (free plan handles cinecanon.com fine).
- Vercel: **$0** for the free tier — covers ~100 GB bandwidth, 100k function invocations, and unlimited builds/deploys. You'll be well under all three for the first months.
- Neon: **$0** on the free tier — 0.5 GB storage, ~250 hours of compute. Upgrade to **Launch ($19/mo)** when the project hits its limits.
- Domain: pre-paid, your existing registration.

Total: **$0–$19/mo** in the early period.
