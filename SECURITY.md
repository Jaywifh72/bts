# Security

## Reporting

If you believe you've found a security vulnerability, please open a private
GitHub Security Advisory at
[github.com/Jaywifh72/bts/security/advisories/new](https://github.com/Jaywifh72/bts/security/advisories/new)
rather than a public issue.

## Current posture

`pnpm audit` runs on every CI build via Dependabot. Known issues at the
time of writing (2026-05) are tracked here so the audit is intentional,
not silent.

### Tracked / pending upgrade

| Package | Severity | Current | Patched | Path | Notes |
|---|---|---|---|---|---|
| `drizzle-orm` | High | 0.36.4 | ≥0.45.2 | direct dep of `@bts/db` | SQL injection via improperly escaped identifiers. Drizzle's API has churned across 9 minor versions; needs a deliberate bump with full test pass. Tracked: TODO open as separate ticket. |
| `next` | High (× several) | 14.2.35 | ≥15.5.16 | direct dep of `@bts/web` | DoS via Server Components / Image API, request smuggling in rewrites, SSRF, XSS in beforeInteractive, middleware bypass, cache poisoning. Next 14 → 15 is a major bump with breaking changes (App Router cache semantics, async params, etc.). Separate planned migration. |
| `postcss` | Moderate | 8.4.31 (transitive via next) | ≥8.5.10 | indirect via `next` | Patched once Next 15 lands (Next 15 ships with postcss ≥8.5.10). |
| `rollup` | High | <3.30.0 (transitive) | ≥3.30.0 | indirect via build tooling | Patched on Next/Tailwind bumps. |
| `file-type` | Moderate | <21.3.1 (transitive) | ≥21.3.1 | indirect via Sentry CLI | Resolves on next Sentry CLI bump (Dependabot handles). |

### Why not block on these now

The high-severity issues are real but require careful upgrade paths:
- **Drizzle 0.36 → 0.45**: minor-version chain with documented breaking
  changes in `sql` helpers + relational query builder. Bumping without
  a full test pass risks production query failures.
- **Next 14 → 15**: App Router `params` are now async, default cache
  semantics changed, route segment config keys renamed. Bumping is a
  multi-hour code change, not a 1-line bump.

Both are queued as separate tasks. Dependabot will keep PR'ing them
weekly; merge intentionally.

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
