# Sentry — error tracking

## Why

`@sentry/nextjs` is in `apps/web/package.json` but not wired. Without a
DSN it's a no-op; with one we get:
- Server-component + route-handler exceptions with stack traces
- Client-side React errors (via the `error.tsx` boundary's `digest`)
- Performance traces for slow `/films/[slug]` server-render times
- Release tagging from git SHA

## Setup

The Sentry wizard is interactive and needs your auth — I can't run it.
Run yourself:

```bash
cd apps/web
npx @sentry/wizard@latest -i nextjs
```

The wizard will:
1. Open a browser to log into Sentry
2. Ask you to pick or create a project (pick "Next.js")
3. Write `sentry.client.config.ts`, `sentry.server.config.ts`,
   `sentry.edge.config.ts`, and update `next.config.mjs`
4. Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.sentry-build-plugin` (commit-
   safe — read by the build, not runtime)

## Recommended config tweaks after the wizard

In each of `sentry.{client,server,edge}.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Lower trace sampling — CineCanon is read-heavy, 10% is enough.
  tracesSampleRate: 0.1,
  // Send replays only on errors, not on every session.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,
  // Tag releases with git SHA — set by the build job.
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_SHA,
  // Don't ship dev errors.
  enabled: process.env.NODE_ENV === 'production',
});
```

In `apps/web/app/error.tsx`, after the existing implementation, add:

```ts
'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function ErrorBoundary({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  // ... existing JSX
}
```

## Verify

After deploy, trigger a known error:

```bash
curl -i "https://<your-domain>/api/v1/productions/__definitely-not-a-slug__"
```

→ Sentry dashboard should show the error within ~30s under
**Issues → All Unresolved**.

## Cost

Sentry free tier: 5K errors/month + 10K performance units. CineCanon's
expected error volume is low (it's a read-mostly site); free tier is
plenty until you're seeing real traffic.

## Rollback

Remove `NEXT_PUBLIC_SENTRY_DSN` → next build ships without telemetry. The
SDK calls become no-ops.
