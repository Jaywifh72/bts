# Auth Setup — OAuth Credentials

Both providers require an OAuth app per environment (dev + prod).

## Google

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth client ID → "Web application"
3. Authorized redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://<your-host>/api/auth/callback/google`
4. Copy Client ID → `AUTH_GOOGLE_ID`, Client Secret → `AUTH_GOOGLE_SECRET`.

## GitHub

1. https://github.com/settings/developers → "New OAuth App"
2. Authorization callback URL:
   - Dev: `http://localhost:3000/api/auth/callback/github`
   - Prod: `https://<your-host>/api/auth/callback/github`
3. Copy Client ID → `AUTH_GITHUB_ID`, generate secret → `AUTH_GITHUB_SECRET`.

## AUTH_SECRET

```bash
openssl rand -base64 32
```

Set as `AUTH_SECRET`. Required.

## Smoke test (after `pnpm web:dev`)

- Visit `/signin`, click each provider, complete OAuth.
- `/account` shows your profile.
- Sign out, sign back in with same provider → same user.
- Sign in with the other provider using the same email → same account (Google links by verified email; GitHub creates a separate account by design — see spec).
