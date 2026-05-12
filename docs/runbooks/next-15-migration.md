# Next 14 → 15 migration

## Why

Next 14.2.x has **15 outstanding CVEs** (per `pnpm audit` 2026-05-12), all
patched in Next 15.5.16+:

- DoS via Server Components (high)
- DoS via Image Optimization API (moderate)
- SSRF in application code via crafted URLs (high)
- HTTP request smuggling in rewrites (moderate)
- Middleware / Proxy bypass in Pages Router applications (high)
- XSS in beforeInteractive scripts (moderate)
- XSS in App Router (moderate)
- Cache poisoning in React Server Components (low/moderate)

Studio Pro has partial mitigations (image-domain allowlist, no Pages
Router, rate limits) but the upgrade is the real fix.

## Scope

**41 files in `apps/web/app/`** declare `params` or `searchParams` types.
In Next 15 both became `Promise`, so every signature + access site needs
updating. Run:

```bash
grep -rln 'params: \{\|searchParams: \{' apps/web/app/ | wc -l
# → 41 (2026-05-12 baseline)
```

Other breaking changes that affect this codebase:
- **Default fetch caching** changed from `force-cache` to `no-store`.
  Any `fetch()` in server components that assumed caching now needs
  `{ cache: 'force-cache' }` or `revalidate` explicitly. Audit:
  ```bash
  grep -rn 'fetch(' apps/web/app/ apps/web/lib/ | grep -v 'rate-limit'
  ```
- **`runtime` and `dynamic` route segment configs** unchanged but worth
  scanning.
- **React 19** is the required peer dep. Async `params` propagate.
  `ref` is no longer auto-forwarded — `forwardRef` calls can be removed.
  Hydration error format changed.
- **Sentry**: already on `@sentry/nextjs` 10.x which supports Next 15.

## Migration steps

### 1. Branch + codemod

```bash
git checkout -b next-15-migration
npx @next/codemod@latest upgrade
```

The codemod will:
- Bump `next`, `react`, `react-dom` (and types) in package.json
- Run `next-async-request-api` against `app/**` to await `params` /
  `searchParams` automatically
- Update `next.config.mjs` segment names that changed
- Update import paths that moved

Expect ~30 of the 41 files to convert cleanly. The codemod misses:
- Destructuring patterns inside generateMetadata arguments
- Some opengraph-image.tsx params (different signature)
- searchParams used inside non-page server actions

### 2. Manual cleanup checklist

Run these after the codemod:

- [ ] `pnpm typecheck` — most failures will be `params.slug` where the
      codemod missed an await
- [ ] Audit `generateStaticParams` callers — return type unchanged but
      Promise<T> expectation on `params` propagates to `generateMetadata`
- [ ] Check `apps/web/app/films/[slug]/opengraph-image.tsx` and
      `crew/[slug]/opengraph-image.tsx` — opengraph-image params have a
      different shape than page params
- [ ] Audit `fetch()` calls in server components — if you relied on the
      default `force-cache`, add it explicitly
- [ ] React 19: remove any `forwardRef` calls in your client components
      (ref is now a regular prop on function components)
- [ ] Hydration: search-bar, top-nav drawer, and any client-state UIs
      need a hydration sanity check after upgrade

### 3. Test pass

```bash
pnpm typecheck                  # must be green
pnpm --filter @bts/db test      # should still be 61/61
pnpm --filter @bts/web build    # should complete (this exercises async params)
DATABASE_POOL_MAX=2 pnpm --filter @bts/web start   # needs prior build
pnpm --filter @bts/web e2e      # smoke pack 11/11
```

### 4. Live verification

Spot-check critical routes against the running server:

```bash
for path in / /films /films/dune-part-two-2024 /crew /crew/roger-deakins \
           /gear /search /lookbook /methodology; do
  echo -n "$path: "
  curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" "http://localhost:3000$path"
done
```

All should be 200 and < 1s.

### 5. Re-audit

```bash
pnpm audit --prod
```

Should drop from 15 advisories to ~0-2 (anything remaining is Sentry
transitive or similarly low-stakes).

### 6. Update SECURITY.md

Move the Next entry from "pending" to "resolved". Update the audit
baseline date.

## Rollback

If the migration breaks something subtle that isn't surfaced by typecheck
+ E2E + live spot-check:

```bash
git checkout master
git branch -D next-15-migration
```

Lockfile and package.json revert cleanly because the migration lives on
a branch. Drop the branch, file a focused fix-forward task.

## Time estimate

- Codemod + auto-fixes: ~15 min
- Manual cleanup of misses: ~30 min
- Test pass + live verification: ~30 min
- **Total: ~75 min** if no surprises. Double that if the codemod misses
  more than 5 files or if there's a Next-15-specific runtime issue.
