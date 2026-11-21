# CineCanon QA Report — 2026-11-02

## Summary

- The live site at https://cinecanon.com was unreachable from this session's network environment; the full sweep was conducted against the local repository at `/home/user/bts` (branch `master`). All findings are based on static code analysis of 133 public page routes and 16 API route handlers. Live HTTP status checks could not be performed.
- The site is structurally sound: no broken route handlers, no 5xx-prone code paths without guards, no missing critical page files. The root error boundary, 404 handler, and TMDb attribution footer are all correctly implemented.
- The most impactful finding is a **large sitemap gap**: the `sitemap-core.xml` covers only ~25 URLs, while the site has over 100 public sections. Major sections — `/awards`, `/sound`, `/music`, `/editing`, `/production-design`, `/costume-hair-makeup`, `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`, all 13 `/for-<role>` role-landing pages, and all 4 Phase 4 tools — are absent from every sitemap segment. This directly limits crawl coverage for the majority of the editorial depth.
- The `/decisions` page renders a raw deployment-error fallback message visible to all users when the DB query fails: "Decision trees coming online — table not yet migrated on this environment."
- 36 production files use `console.error`/`console.warn` in violation of the CLAUDE.md convention ("Don't add console.log or console.error in production code paths — use Sentry"); two of these are in the homepage's hot path.

---

## Critical Issues

**P0-1 — /decisions renders a deployment-error message to all users**
File: `/home/user/bts/apps/web/app/decisions/page.tsx`, line 57.
When `listDecisionTrees(db)` throws (e.g. table not migrated), the page renders:
```
Decision trees coming online — table not yet migrated on this environment.
```
This reads as a developer/ops message leaking into production. The fallback should either be a graceful empty state ("No decision trees yet") or the error should be caught silently without surfacing environment language. The `decision_trees` migration (`0087_craft_decision_trees.sql`) exists in the repo, so the table should be present in prod — but if it is absent, this message appears to all visitors. **This is the only P0 candidate**; it is not site-breaking but exposes an internal ops message to end users.

---

## High Priority Issues

**P1-1 — Phase 4 tools absent from sitemap-core.xml**
The four tools that just landed in Phase 4 have no sitemap entries:
- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

The `sitemap-core.xml` includes five older tools (`frame-lines`, `loadout`, `coverage`, `aces`, `cdl`) but was not updated when Phase 4 shipped. These pages exist, the tools index (`/tools/page.tsx`) links to them, and `llms.txt` mentions them by name — but XML search-engine sitemaps do not include them, so Googlebot cannot discover them via the sitemap path.
File: `/home/user/bts/apps/web/app/sitemap-core.xml/route.ts`

**P1-2 — Majority of editorial sections absent from all five sitemap segments**
The following routes exist as pages but appear in zero sitemap files (`sitemap-core.xml`, `sitemap-films.xml`, `sitemap-crew.xml`, `sitemap-gear.xml`, `sitemap-vfx.xml`):

High-traffic sections: `/awards`, `/sound`, `/music`, `/editing`, `/production-design`, `/costume-hair-makeup`, `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`, `/decades`, `/references`, `/queries`, `/shots`, `/lookbook`, `/about`, `/methodology`

Role-landing pages (13): `/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-coordinators`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-editors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`, `/for-sound-mixers`

These are explicitly linked from the footer, nav, and `llms.txt`, but search engines relying on sitemap discovery will not crawl them unless they follow footer or nav links organically. The sitemap-index at `/sitemap.xml` declares only five segments (`core`, `films`, `crew`, `gear`, `vfx`); there is no `sitemap-editorial.xml` or equivalent.
File: `/home/user/bts/apps/web/app/sitemap-core.xml/route.ts`

**P1-3 — 36 production page files use console.error/console.warn in violation of CLAUDE.md**
CLAUDE.md states: "Don't add console.log or console.error in production code paths — use Sentry." Two console.error calls are in the homepage's hot path (lines 79-80 in `/home/user/bts/apps/web/app/page.tsx`). The remaining 34 files use `console.warn` in catch blocks for "table missing" and query failure cases. These should call `Sentry.captureException` with tagged context so errors surface in the error observatory rather than being silently swallowed or logged to Vercel's transient log stream.

Notable files: `page.tsx` (homepage), `app/decisions/page.tsx`, `app/dossiers/[slug]/page.tsx`, `app/walkthroughs/[slug]/page.tsx`, `app/vfx/volumes/page.tsx`, `app/vfx/title-houses/[slug]/page.tsx`, and ~30 others.

**P1-4 — Empty alt="" on content poster images in data grids**
Film poster thumbnails rendered with `alt=""` in contexts where the visual is a content image (not purely decorative):
- `/home/user/bts/apps/web/app/ask/page.tsx` line 254 — search result film posters (results grid with no adjacent title element inside the `<Image>` tag; the `<h2>` is a sibling, not a label)
- `/home/user/bts/apps/web/components/productions/ProductionDetail.tsx` lines 888, 931, 979 — franchise collection member posters, semantically-similar film posters, related film posters
- `/home/user/bts/apps/web/app/crew/[slug]/page.tsx` line 848 — "Known for" poster thumbnails
- `/home/user/bts/apps/web/app/vfx/[slug]/page.tsx` line 172 — filmography poster thumbnails

The `ProductionCard` component correctly uses `alt={\`${title}${releaseYear...} poster\`}`, but these inline usages do not. Screen readers will skip these images entirely. The fix is to pass the film title as alt text for each usage.

---

## Medium Priority Issues

**P2-1 — /lookbook exposes "upload coming soon" text in the eyebrow label**
File: `/home/user/bts/apps/web/app/lookbook/page.tsx`, line 39.
The `PageHero` eyebrow is set to `"Visual search · upload coming soon"`. This is user-visible on a route linked from the footer. "Coming soon" language in the eyebrow is fine for an internal staging env but feels unfinished in production. A neutral eyebrow like `"Visual search · palette browser"` (or the description already covers the limitation) would be cleaner.

**P2-2 — /ask page missing canonical link**
File: `/home/user/bts/apps/web/app/ask/page.tsx`.
The metadata export has no `alternates.canonical`. Because `/ask` accepts query parameters (`?q=...`, `?omit=...`), search engines may index hundreds of query-result URLs as separate pages without a canonical to consolidate them. All other key pages (`/films`, `/crew`, `/tools/*`, `/walkthroughs`, etc.) set `alternates: { canonical: ... }`. The fix is to add `alternates: { canonical: \`${siteUrl()}/ask\` }` so parameterised result pages point to the base /ask URL.

**P2-3 — /format/[slug] missing canonical link**
File: `/home/user/bts/apps/web/app/format/[slug]/page.tsx`.
`generateMetadata` returns `openGraph` data but no `alternates.canonical`. Format slug pages are statically generated from `FORMAT_TAXONOMY` and are in `sitemap-core.xml`, so crawlers can reach them, but without a self-referencing canonical, duplicate-content risk exists.

**P2-4 — Inconsistent Atom feed URL surface in llms.txt vs layout autodiscovery**
`layout.tsx` line 38 sets the Atom autodiscovery link to `/digest.xml` (a production-centred weekly digest of recently curated films).
`llms.txt` line 57 describes the "Atom update feed" as `/api/v1/aeo/digest.xml` (the AEO observatory's high-confidence-claim feed — a different feed with different content).
Footer also links to `/digest.xml` labelled "Weekly digest (Atom)".
These are two distinct feeds serving different purposes. AI crawlers and RSS readers that parse `llms.txt` will dereference `/api/v1/aeo/digest.xml` expecting a production digest, but the human-readable autodiscovery points at `/digest.xml`. The `llms.txt` should clarify these are different feeds with distinct purposes, or the sitemap-index should include both.

**P2-5 — /stunts/coordinators and /awards/cinematography are redirect stubs with no metadata**
Both files are:
```
import { redirect } from 'next/navigation';
export default function Page(): never { redirect('/target'); }
```
with no `export const metadata`. When an AI crawler or legacy link dereferences these URLs, Next.js issues a 307 (temporary) redirect, which some crawlers do not follow reliably. The redirect type should be a permanent 308 (or the Next.js `permanentRedirect()`) since these are known stable mappings, and brief metadata (`title`, `robots: noindex`) should be added.
Files: `/home/user/bts/apps/web/app/stunts/coordinators/page.tsx`, `/home/user/bts/apps/web/app/awards/cinematography/page.tsx`

**P2-6 — homepage uses console.error in fire-and-forget catch of homepage data fetches**
Files: `/home/user/bts/apps/web/app/page.tsx` lines 79–80.
```js
listRecentlyResolvedCorrections(db, 5).catch((e) => { console.error('[homepage] listRecentlyResolvedCorrections failed', e); return []; }),
listRecentCitations(db, 5).catch((e) => { console.error('[homepage] listRecentCitations failed', e); return []; }),
```
These are in the homepage's server-side render path. If these queries fail in production, the error is swallowed to Vercel's transient log and not tracked in Sentry. Operators cannot set alerts on this failure mode.

---

## Low Priority Issues

**P3-1 — /ask page title is 24 characters (below 30-character SEO guideline)**
Rendered as "Ask anything | CineCanon". The recommended range is 30–60 characters. A more descriptive title like "Ask anything — Natural-language film search | CineCanon" (55 chars) would be within range and better represent the page's utility.
File: `/home/user/bts/apps/web/app/ask/page.tsx`

**P3-2 — /tools/stunt-rig-picker meta description is 91 characters (below 120-character minimum)**
Current: "Wire descent vs decelerator vs airbag — answer four questions, get a ranked recommendation." (91 chars). Should be expanded to 120–160 chars with context about stunt safety, SAG-AFTRA bulletins, or the decision criteria used.
File: `/home/user/bts/apps/web/app/tools/stunt-rig-picker/page.tsx`

**P3-3 — /ask meta description is 193 characters (above 160-character maximum)**
Current description is 193 chars and will be truncated in SERPs at ~160. The excess should be trimmed to the most impactful sentence.
File: `/home/user/bts/apps/web/app/ask/page.tsx`

**P3-4 — No OG image on tool sub-pages**
The four Phase 4 tool pages (scoring-session-cost, stunt-rig-picker, hdr-target-picker, anamorphic-vs-spherical) and other tool pages have no per-page `opengraph-image.tsx`. They fall back to the root OG card which shows "Cinematic technical reference" — not tool-specific. Film and crew pages have per-page OG images. For social sharing and AI Overview cards, per-tool OG images would improve click-through.

**P3-5 — shouldEmitClaimReview rubric in llms.txt has no automated sync check**
The comment on line 20 of `llms.txt/route.ts` says the rubric table in llms.txt "MUST match shouldEmitClaimReview() in lib/jsonLd.tsx — if you change the emission gate, update this file." There is no test, linter rule, or assertion to enforce this. If the emission gate changes, the llms.txt description of which claims AI engines can trust becomes stale without any warning.

**P3-6 — /format/[slug] generateMetadata title is too short for some format slugs**
The format page title is `"Shot on ${fmt.label}"` — e.g. "Shot on 35mm Film" (18 chars). The template suffix `| CineCanon` brings it to ~29 chars, still below the 30-char soft minimum.

---

## Pages Crawled

All analysis is from the local repository (`/home/user/bts`). The live site https://cinecanon.com was unreachable from this session (DNS resolution failure for `cinecanon.com`). The following routes were individually inspected:

| Route | Source | Status |
|---|---|---|
| `/` | `app/page.tsx` | Inspected — no issues blocking render |
| `/layout.tsx` | `app/layout.tsx` | Inspected — TMDb attribution in Footer, OG root card present |
| `/films/[slug]` | `app/films/[slug]/page.tsx` | Inspected — canonical, JSON-LD Movie + BreadcrumbList + ClaimReview |
| `/crew/[slug]` | `app/crew/[slug]/page.tsx` | Inspected — canonical, JSON-LD Person + BreadcrumbList |
| `/ask` | `app/ask/page.tsx` | Inspected — missing canonical, description too long, title too short |
| `/walkthroughs/[slug]` | `app/walkthroughs/[slug]/page.tsx` | Inspected — canonical OK, ClaimReview emission OK |
| `/dossiers/[slug]` | `app/dossiers/[slug]/page.tsx` | Inspected — canonical OK, ClaimReview emission OK |
| `/tools` | `app/tools/page.tsx` | Inspected — no canonical on index |
| `/tools/scoring-session-cost` | `app/tools/scoring-session-cost/page.tsx` | Inspected — not in sitemap |
| `/tools/stunt-rig-picker` | `app/tools/stunt-rig-picker/page.tsx` | Inspected — not in sitemap, short description |
| `/tools/hdr-target-picker` | `app/tools/hdr-target-picker/page.tsx` | Inspected — not in sitemap |
| `/tools/anamorphic-vs-spherical` | `app/tools/anamorphic-vs-spherical/page.tsx` | Inspected — not in sitemap |
| `/api/v1` | `app/api/v1/route.ts` | Inspected — discovery doc correct, all referenced endpoints exist |
| `/api/v1/aeo/precision` | `app/api/v1/aeo/precision/route.ts` | Exists |
| `/api/v1/aeo/claims` | `app/api/v1/aeo/claims/route.ts` | Exists |
| `/api/v1/aeo/digest.xml` | `app/api/v1/aeo/digest.xml/route.ts` | Exists |
| `/api/v1/productions/[slug]` | `app/api/v1/productions/[slug]/route.ts` | Exists |
| `/api/v1/crew/[slug]` | `app/api/v1/crew/[slug]/route.ts` | Exists |
| `/sitemap.xml` | `app/sitemap.xml/route.ts` | 5 segments; missing editorial, sound, music, awards, tools Phase 4 |
| `/sitemap-core.xml` | `app/sitemap-core.xml/route.ts` | Missing Phase 4 tools + most editorial pages |
| `/robots.txt` | `app/robots.ts` | OK — disallows /admin/, declares sitemap |
| `/llms.txt` | `app/llms.txt/route.ts` | OK — dynamic counts, Phase 4 tools mentioned; feed URL inconsistency vs layout.tsx |
| `/digest.xml` | `app/digest.xml/route.ts` | Exists — weekly productions digest |
| `/decisions` | `app/decisions/page.tsx` | P0: exposes "table not yet migrated" message |
| `/lookbook` | `app/lookbook/page.tsx` | P2: "coming soon" text in eyebrow |
| `/stunts/coordinators` | `app/stunts/coordinators/page.tsx` | 307 redirect stub, no metadata |
| `/awards/cinematography` | `app/awards/cinematography/page.tsx` | 307 redirect stub, no metadata |
| `/about` | `app/about/page.tsx` | Inspected — OK, has JSON-LD AboutPage |
| `/error.tsx` | `app/error.tsx` | OK — production-safe (hides raw message in prod, shows digest) |
| `/not-found.tsx` | `app/not-found.tsx` | OK |
| `/format/[slug]` | `app/format/[slug]/page.tsx` | Missing canonical |
| `/components/nav/Footer.tsx` | — | TMDb attribution present in global footer as required |

---

## Methodology

This sweep was conducted entirely from static source analysis of the Next.js 16 App Router codebase at `/home/user/bts` (branch `master`). The live site https://cinecanon.com could not be reached from this network environment (DNS resolution failure). Findings are based on:

1. Reading all `app/**/page.tsx` and `app/**/layout.tsx` files for metadata, canonical links, JSON-LD usage, and h1 presence.
2. Reading all `app/sitemap-*.xml/route.ts` files and diffing against the full route tree.
3. Grepping for `console.log`/`console.error`/`console.warn` across all app files.
4. Grepping for `alt=""` and comparing against context to classify decorative vs content images.
5. Checking for placeholder text (`TODO`, `FIXME`, `coming soon`, `coming online`, "table not yet migrated").
6. Inspecting the Footer component for TMDb attribution (present and correct).
7. Verifying that all routes referenced in the API discovery doc (`/api/v1/route.ts`) have corresponding `route.ts` files.
8. Checking `llms.txt` and `robots.ts` for accuracy and completeness.
9. Measuring title and description lengths against SEO guidelines (title 30–60 chars, description 120–160 chars).

---

## What to Fix First

The single highest-leverage fix is expanding `sitemap-core.xml` to include the Phase 4 tools and the major editorial sections. Over 80% of the site's unique content — awards, sound, music, editing, production design, costume/hair/makeup, walkthroughs, dossiers, decisions, all role-landing pages, and the lookbook — is completely invisible to search engines via XML sitemap discovery. This is especially urgent for the four Phase 4 tools that just landed and are already linked from the homepage's tools tile and `llms.txt`; a crawler hitting the sitemap will never find them. The `/decisions` fallback message ("table not yet migrated on this environment") should also be fixed immediately as it is the only item that looks broken to a real user, and the fix is a one-line copy change. After that, adding `alternates.canonical` to `/ask` and `/format/[slug]` and migrating all `console.warn/error` catch blocks to `Sentry.captureException` would resolve the remaining high-priority findings.
