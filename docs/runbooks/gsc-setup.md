# Runbook — Google Search Console integration

## What this unlocks

Once GSC is wired, `/admin/seo` shows the live organic-search performance for `cinecanon.com`:

- Total clicks, impressions, CTR, average position over the last 28 days, each as a sparkline
- Top 25 search queries that brought users to the site
- Top 25 landing pages from organic search
- Top 25 source countries

Until this is configured, that page shows a setup checklist instead of data.

## Status (2026-05-26)

**GSC is wired via the OAuth refresh-token flow.** The page should be populating once the deployment carrying this commit lands. The `/admin/seo` header shows an `auth: oauth | service-account | none` badge that confirms which path is active.

## Why this matters

Without GSC, **there is no source of truth** for organic-Google performance. AEO data tells you how AI engines cite you; Vercel Analytics tells you who clicks; only GSC tells you what people are searching, what Google shows them, and where you rank.

## Two supported auth paths

The code (`apps/web/lib/gsc.ts`) accepts either. **OAuth is recommended** — it's what we run today. Service-account is kept as a fallback in case the refresh token ever gets revoked.

### Path A: OAuth refresh-token (recommended — currently active)

Used when GSC has a Domain-level property (e.g. `sc-domain:cinecanon.com`) and you want to grant access via a real Google account that owns the property.

**Required Vercel env vars (Production + Preview):**

| Var | Source |
|---|---|
| `GSC_OAUTH_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 client |
| `GSC_OAUTH_CLIENT_SECRET` | Paired with the client ID |
| `GSC_REFRESH_TOKEN` | Exchanged once via [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) signed in as the property owner, with scope `https://www.googleapis.com/auth/webmasters.readonly` |
| `GSC_SITE_URL` | `sc-domain:cinecanon.com` for a Domain property, or `https://www.cinecanon.com/` for a URL-prefix property |

**One-time setup (done by jay@jboileau.com on 2026-05-26):**

1. In Google Cloud Console → Create OAuth 2.0 client of type "Web application"
2. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI
3. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
4. Cog icon → check **"Use your own OAuth credentials"** → paste client ID + secret
5. Left panel, scroll to "Google Search Console API v1" → check `https://www.googleapis.com/auth/webmasters.readonly`
6. Click "Authorize APIs" → sign in as the property owner (jay@jboileau.com)
7. Click "Exchange authorization code for tokens" → copy the refresh_token from the response
8. Paste refresh_token + client ID + client secret into the three Vercel env vars above
9. Redeploy (push any commit, or click Redeploy in Vercel)

Refresh tokens don't expire unless revoked or unused for 6+ months.

### Path B: Service-account (fallback only)

Used when you'd rather not have human-account credentials in the stack. The `lib/gsc.ts` code falls back to this path when the OAuth vars are absent.

**Required Vercel env vars:**

| Var | Source |
|---|---|
| `GSC_SERVICE_ACCOUNT_EMAIL` | `*@*.iam.gserviceaccount.com` from the GCP service-account JSON |
| `GSC_SERVICE_ACCOUNT_KEY` | The full `private_key` value from the same JSON (keep the `\n` escapes verbatim) |
| `GSC_SITE_URL` | Same property identifier |

Setup steps:
1. GCP Console → IAM & Admin → Service Accounts → Create → enable Search Console API
2. Add a JSON key, download
3. In Search Console → Settings → Users and permissions, add the service-account email as Owner
4. Paste the two values into Vercel env vars, plus `GSC_SITE_URL`, then redeploy

## Verifying it works

1. Sign in as admin at https://www.cinecanon.com/admin
2. Click **SEO** in the admin nav
3. The page header should show `auth: oauth` (or `auth: service-account`)
4. You should see the four sparkline cards and three tables. If the property is new (< 72h since verification), the values may be 0 — that's a Google-side data lag, not a configuration issue
5. If the page shows the setup checklist instead, the env vars aren't loaded — check the Vercel deployment logs

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Page shows setup checklist | `isGscConfigured()` returns false → at least one var of one auth path is missing | Recheck the OAuth or service-account vars in Vercel are enabled for Production |
| Page shows red "GSC returned an error" | OAuth refresh token revoked, or service account isn't authorized on the property | OAuth: re-run the Playground exchange. Service-account: add the email as a user in GSC Settings |
| Tables empty but no error | Property is too new (< 72h since verification) | Wait. Google has a 2–3 day lag on data |
| `invalid_grant` errors | Refresh token expired (>6mo idle) or the OAuth client was deleted in GCP | Re-run the Playground exchange and replace `GSC_REFRESH_TOKEN` |
| Wrong property in `report.site` | `GSC_SITE_URL` env var mis-set | For Domain properties use `sc-domain:cinecanon.com`. For URL-prefix use `https://www.cinecanon.com/` (with trailing slash) |

## Cost

$0. The GSC API is free; we call it server-side per admin request (~once per page load when an admin views `/admin/seo`).
