# Runbook — Google Search Console integration

## What this unlocks

Once GSC is wired, `/admin/seo` shows the live organic-search performance for `www.cinecanon.com`:

- Total clicks, impressions, CTR, average position over the last 28 days, each as a sparkline
- Top 25 search queries that brought users to the site
- Top 25 landing pages from organic search
- Top 25 source countries

Until this is configured, that page shows a setup checklist instead of data.

## Why this matters

Without GSC, **there is no source of truth** for organic-Google performance. AEO data tells you how AI engines cite you; Vercel Analytics tells you who clicks; only GSC tells you what people are searching, what Google shows them, and where you rank. GSC is the foundation of SEO measurement — wire this **before** any other SEO work.

## Time required

15 minutes of your time, one-time setup. After that the dashboard refreshes per request.

## Prerequisites

- Owner-level Cloudflare access to add a DNS TXT record on `cinecanon.com`
- A Google Cloud Console account (the same Google account you use for Vercel is fine)
- Vercel project Owner or Editor role

---

## Step 1 — Verify cinecanon.com in Search Console

1. Open https://search.google.com/search-console/welcome
2. Pick **Domain** property (not URL prefix). Enter `cinecanon.com`.
3. Google gives you a TXT record. Copy the `google-site-verification=...` value.
4. In Cloudflare → `cinecanon.com` zone → DNS records → **Add record**:
   - Type: `TXT`
   - Name: `@` (apex)
   - Content: the full `google-site-verification=...` string Google gave you
   - TTL: Auto
   - Proxy status: DNS only (grey cloud)
5. Wait ~5 min for DNS propagation, then click **Verify** in the GSC dialog.

GSC may take 24–72 hours after verification before it starts populating data. (That's a Google-side warm-up — there's nothing on our side to do during the wait.)

## Step 2 — Create a service account in Google Cloud

1. Open https://console.cloud.google.com/
2. Create a new project (or pick an existing one): name it `cinecanon-gsc-reader` or similar
3. Enable the **Google Search Console API**:
   - https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
   - Click **Enable** on the project you just created
4. Create a service account:
   - IAM & Admin → Service Accounts → **Create service account**
   - Name: `cinecanon-gsc-reader`
   - Skip the optional role grants (we authorize via GSC instead)
   - **Done**
5. Click into the new service account → **Keys** tab → **Add key → Create new key → JSON**
6. A JSON file downloads. Keep it. It contains the email + private key you'll need next.

## Step 3 — Grant the service account read access to your GSC property

1. Open the downloaded JSON. The `client_email` field looks like `cinecanon-gsc-reader@cinecanon-gsc-reader.iam.gserviceaccount.com`. Copy it.
2. Back in Search Console → **Settings → Users and permissions → Add user**:
   - Email: paste the `client_email`
   - Permission: **Owner** (Restricted is also fine but Owner gives you future room)
   - **Add**

The service account is now authorized to read your GSC data.

## Step 4 — Wire the credentials into Vercel

Three environment variables, all in **Production** AND **Preview** scopes:

1. Open https://vercel.com/jeanjacquesboileau-2392s-projects/cinecanon/settings/environment-variables

2. Add `GSC_SERVICE_ACCOUNT_EMAIL`
   - Value: the `client_email` from the JSON
   - Environments: Production, Preview

3. Add `GSC_SERVICE_ACCOUNT_KEY`
   - Value: the **entire** `private_key` string from the JSON, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers and all `\n` escapes — paste exactly as it appears in the JSON
   - Environments: Production, Preview
   - This is a multi-line value with literal `\n` characters; Vercel preserves them correctly

4. Add `GSC_SITE_URL`
   - Value: `https://www.cinecanon.com/` (trailing slash matters — GSC stores sites with it)
   - Environments: Production, Preview

## Step 5 — Redeploy

Vercel redeploys automatically when env vars change in a production deployment, but if it doesn't:
- Vercel → Deployments → latest → **Redeploy**
- Or push a no-op commit (`git commit --allow-empty -m "chore: pick up GSC env"` and push)

## Step 6 — Verify

1. Sign in as admin at https://www.cinecanon.com/admin
2. Click **SEO** in the admin nav
3. You should see the four sparkline cards (Clicks, Impressions, CTR, Avg position) and the three tables (Top queries, Top landing pages, Top countries)
4. If the page still shows the setup checklist instead of data, the env vars aren't loaded — check the Vercel deployment logs

If you see "GSC returned an error", the most common cause is the service-account email isn't a verified user on the GSC property — re-do Step 3.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Setup checklist still showing | `isGscConfigured()` returns false → at least one env var is missing or unset | Recheck the three env vars in Vercel, confirm they're enabled for Production |
| "GSC returned an error" | Service account isn't authorized on the property | Re-do Step 3 — add the service account email as a user in GSC Settings |
| Tables empty but no error | Property is too new (< 72h since verification) | Wait. Google has a 2–3 day lag on data |
| `invalid_grant` in Vercel logs | The `\n` escapes in the private key were stripped during paste | Re-add `GSC_SERVICE_ACCOUNT_KEY`, this time copying the JSON value EXACTLY including all `\n` |

## Cost

$0. The GSC API is free; we call it server-side per admin request (~once per page load when an admin views `/admin/seo`). Volume is negligible.
