# Security

## Reporting

If you believe you've found a security vulnerability, please open a private
GitHub Security Advisory at
[github.com/Jaywifh72/bts/security/advisories/new](https://github.com/Jaywifh72/bts/security/advisories/new)
rather than a public issue.

## Current posture

`pnpm audit` runs on every CI build via Dependabot. Known issues at the
time of writing are tracked here so the audit is intentional, not silent.

**Last audit baseline:** 2026-05-12 — 15 advisories (5 high, 8 moderate,
2 low). **All remaining advisories are inside the `next` 14 dependency
tree.** The drizzle 0.36→0.45 SQL-injection (high), rollup path
traversal (high), and file-type DoS (moderate) advisories were resolved
by the corresponding Dependabot PRs.

### Tracked / pending upgrade

| Package | Severity | Current | Patched | Path | Notes |
|---|---|---|---|---|---|
| `next` | High (× several) | 14.2.35 | ≥15.5.16 | direct dep of `@bts/web` | DoS via Server Components / Image API, request smuggling in rewrites, SSRF, XSS in beforeInteractive, middleware bypass, cache poisoning. Next 14 → 15 is a major bump with breaking changes (App Router cache semantics, async params, route segment config keys, React 19 required). Separate planned migration. |
| `postcss` | Moderate | 8.4.31 (transitive via next) | ≥8.5.10 | indirect via `next` | Patched once Next 15 lands. |

### Resolved (since last commit)

| Package | Old | New | Severity Resolved |
|---|---|---|---|
| `drizzle-orm` | 0.36.4 | 0.45.2 | **High** — SQL injection via `sql.identifier()` improperly escaped values. Mitigated upstream + tests adjusted for the new wrapped-error shape. |
| `@sentry/nextjs` | 8.55.2 | 10.52.0 | Moderate (transitive `file-type` DoS). |
| `eslint` | 8.57.1 | 10.3.0 | Maintenance — keeps lint config supported. |
| `jimp` | 0.22.12 | 1.6.1 | Moderate transitive. |
| `playwright`, `postcss` (direct) | minor bumps | latest within carets | Moderate transitive. |

### Why not block on Next 14 → 15

App Router `params` became `Promise<...>` and must be awaited everywhere
they're used (films/crew/gear dynamic pages all touch this). Default
cache semantics changed from `force-cache` to `no-store` for `fetch()`,
so `revalidate` settings need re-validation. Route segment config keys
were renamed (some). And Next 15 requires React 19 (also a breaking
upgrade — server components, async params, ref-as-prop, etc.).

Both are queued as separate tasks. Dependabot reopens weekly; merge
intentionally when ready.

### Mitigations in place

- Postgres queries are parameterised via Drizzle's tagged-template `sql`
  — the SQL injection vector requires user-controlled identifiers, which
  our code paths do not expose to user input.
- The Image Optimization API is configured with explicit allowed domains
  (see `apps/web/next.config.mjs`); DoS vectors via arbitrary remote
  images are gated.
- The corrections form rate-limits at 5/hr per IP and honeypots
  bot submissions (`apps/web/app/corrections/actions.ts`).
- The admin section requires a constant-time-compared bearer token
  (`apps/web/middleware.ts`).

## Automation

- **Dependabot** (`.github/dependabot.yml`) opens weekly grouped PRs for
  minor/patch bumps in npm + github-actions. Major bumps come as
  individual PRs.
- **GitHub Security Alerts** are enabled at the repo level — Dependabot
  surfaces CVEs out-of-band from the scheduled bump cadence.
- **CI** runs typecheck + lint + db-tests + E2E build+smoke on every
  push; lockfile changes are validated automatically.
