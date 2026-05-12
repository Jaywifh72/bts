# Security

## Reporting

If you believe you've found a security vulnerability, please open a private
GitHub Security Advisory at
[github.com/Jaywifh72/bts/security/advisories/new](https://github.com/Jaywifh72/bts/security/advisories/new)
rather than a public issue.

## Current posture

`pnpm audit` runs on every CI build via Dependabot. Known issues at the
time of writing are tracked here so the audit is intentional, not silent.

**Last audit baseline:** 2026-05-12 (post-Next-16 merge) — **1 advisory
(moderate)**. Down from 18 at the start of the security pass.

### Tracked / pending upgrade

| Package | Severity | Current | Patched | Path | Notes |
|---|---|---|---|---|---|
| `postcss` | Moderate | 8.4.31 (transitive via next) | ≥8.5.10 | indirect via `next` 16 | XSS in CSS stringifier. No untrusted CSS rendered in this app, so real-world exposure is low. Resolves on next postcss bump upstream from Next. |

### Resolved (security pass 2026-05-12)

| Package | Old | New | Severity Resolved |
|---|---|---|---|
| `next` | 14.2.35 | 16.2.6 | **High × multiple** — DoS via Server Components / Image API, SSRF, request smuggling in rewrites, XSS in beforeInteractive, middleware bypass, RSC cache poisoning. Migration done via `@next/codemod@latest upgrade` (PR #15) — 46 files codemod-converted, 2 manual fixes (async `headers()` in opengraph-image files). |
| `react`, `react-dom` | 18.3.1 | 19.2.6 | Required peer for Next 16. Async params propagate; ref-as-prop is fine in our code. |
| `drizzle-orm` | 0.36.4 | 0.45.2 | **High** — SQL injection via `sql.identifier()` improperly escaped values. Cascade tests adjusted for the new wrapped-error shape. |
| `@sentry/nextjs` | 8.55.2 | 10.52.0 | Moderate (transitive `file-type` DoS). |
| `eslint` | 8.57.1 | 10.3.0 | Maintenance — keeps lint config supported. |
| `jimp` | 0.22.12 | 1.6.1 | Moderate transitive. |
| `playwright`, `postcss` (direct), `rollup`, `file-type` | minor/transitive bumps | latest | Moderate-to-high CVEs in build tooling and image processing. |

### Open Dependabot PRs (triage queue)

- **#13** `zod` 3.25 → 4.4 — major bump. Zod 4 changed parse error shape + some type inference patterns. Needs deliberate review.
- **#14** `dotenv` 16 → 17 — major bump. Mostly internal; should be safe with CI verification.

The weekly Dependabot sweep continues; major bumps will keep appearing as
individual PRs (per `.github/dependabot.yml` config).

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
