# CineCanon QA Sweep — 2026-06-22

## Summary

**Crawl scope:** Static analysis of the codebase at `/home/user/bts` (branch `master`). Live network egress to cinecanon.com is blocked by the sandbox proxy, so this report is derived entirely from source code, route structure, and metadata definitions. All findings are code-level; live HTTP status codes are inferred from route definitions and fallback patterns.

**Pages catalogued:** 133 public `page.tsx` routes (excluding `/admin`).

**Defect totals:**

| Severity | Count | Description |
|---|---|---|
| P0 — Broken | 0 | No hard 5xx, dead routes, or broken sitemap links found at the code level |
| P1 — Degraded | 7 | Sitemap gap, console violations, missing structured data, empty alt text, orphaned pages, missing noindex, API doc mismatch |
| P2 — Polish | 6 | Title/description length, missing breadcrumb JSON-LD, homepage title redundancy |

---

## P0 — Broken

No P0 defects found at the source level. The following structural safeguards are in place:

- All `[slug]` detail pages (`/films/[slug]`, `/crew/[slug]`, `/gear/...`, `/walkthroughs/[slug]`, etc.) call `notFound()` on missing records rather than rendering empty pages.
- The root error boundary (`app/error.tsx`) does not expose raw error messages in production — it emits only the opaque `error.digest` reference.
- No 5xx-generating patterns (unguarded `db.execute` without try/catch on public routes) were found in non-admin routes. The majority of newer sections wrap their DB calls in `try/catch` with `.warn()` fallback.
- `/robots.ts`, `/sitemap.xml` (index), and `/llms.txt` all have route handlers that return valid content.
- No broken internal links were found in the nav or footer against existing `page.tsx` files.

---

## P1 — Degraded

### P1-1 — Massive sitemap gap: 63+ index routes omitted from all sitemap segments

**Severity: P1 — this directly limits search-engine crawl coverage of content that is live and linked.**

The sitemap architecture covers 5 segments (`core`, `films`, `crew`, `gear`, `vfx`), but `sitemap-core.xml` was last updated with only ~23 static URLs. The following entire editorial sections have **zero sitemap presence** across all five segments:

**Departments/categories (index + sub-index pages):**
- `/sound`, `/sound/adr-studios`, `/sound/effects`, `/sound/foley`, `/sound/houses`, `/sound/post`, `/sound/effects/libraries`, `/sound/mixers`
- `/music`, `/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`, `/music/supervision-agencies`, `/music/cue-guides`
- `/editing`, `/editing/editors`, `/editing/walkthroughs`
- `/production-design`, `/production-design/designers`, `/production-design/works`
- `/costume-hair-makeup`, `/costume-hair-makeup/designers`, `/costume-hair-makeup/costume-works`, `/costume-hair-makeup/makeup-works`, `/costume-hair-makeup/construction-houses`, `/costume-hair-makeup/effects-houses`
- `/vfx/volumes`, `/vfx/title-houses`, `/vfx/shot-breakdowns`
- `/stunts/companies`, `/stunts/coordinators`
- `/gear/rentals`, `/equipment/specs`

**Discovery/cross-cut pages:**
- `/references`, `/awards`, `/awards/cinematography`, `/decades`, `/locations`, `/shots`, `/societies`, `/queries` (index, not individual queries), `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`

**Informational pages:**
- `/about`, `/methodology`

**For-professionals pages (all 12):**
- `/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-editors`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`, `/for-coordinators`

**Phase 4 tools (the four most recently shipped):**
- `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`

**Source:** `apps/web/app/sitemap-core.xml/route.ts` lines 8–38.

---

### P1-2 — `console.warn` / `console.error` in production server-component code

**Severity: P1 — violates the project's own convention ("Sentry first") and leaks table names + query errors to server logs without structured context for alerting.**

22 production server-component files contain `console.warn` or `console.error` calls outside of admin routes. The pattern is consistent: a DB query is wrapped in `try/catch` and the caught error is dumped to `console.warn` rather than `Sentry.captureException`. Affected non-admin files include:

- `apps/web/app/editing/walkthroughs/page.tsx:19`
- `apps/web/app/sound/effects/libraries/[slug]/page.tsx:32,40`
- `apps/web/app/sound/effects/libraries/page.tsx:23`
- `apps/web/app/sound/adr-studios/[slug]/page.tsx:28`
- `apps/web/app/sound/adr-studios/page.tsx:19`
- `apps/web/app/sound/houses/page.tsx:41`
- `apps/web/app/dossiers/[slug]/page.tsx:43`
- `apps/web/app/vfx/volumes/[slug]/page.tsx:42`
- `apps/web/app/vfx/volumes/page.tsx:28`
- `apps/web/app/vfx/shot-breakdowns/page.tsx:19`
- `apps/web/app/vfx/title-houses/[slug]/page.tsx:37`
- `apps/web/app/vfx/title-houses/page.tsx:24`
- `apps/web/app/production-design/works/page.tsx:19`
- `apps/web/app/partnerships/[slug]/page.tsx:48`
- `apps/web/app/partnerships/page.tsx:24`
- `apps/web/app/gear/rentals/[slug]/page.tsx:40`
- `apps/web/app/gear/rentals/page.tsx:24`
- `apps/web/app/music/orchestras/[slug]/page.tsx:40`, `page.tsx:24`
- `apps/web/app/music/cue-guides/page.tsx:19`
- `apps/web/app/music/scoring-stages/page.tsx:23`
- `apps/web/app/music/supervision-agencies/[slug]/page.tsx:28`, `page.tsx:19`
- `apps/web/app/costume-hair-makeup/construction-houses/[slug]/page.tsx:28`, `page.tsx:19`
- `apps/web/app/page.tsx:79–80` (homepage)
- `apps/web/app/api/search/nl/route.ts:78`

Additionally, the homepage (`page.tsx` lines 79–80) uses `console.error` for `listRecentlyResolvedCorrections` and `listRecentCitations` failures — these are user-visible page sections that silently fail without Sentry notification.

---

### P1-3 — Missing JSON-LD structured data on 16 pages

**Severity: P1 — CineCanon's GEO/AEO strategy depends on ClaimReview and entity schema being available to AI crawlers. Pages without JSON-LD are invisible to that pipeline.**

The following pages have no `<JsonLd>` component and no inline `application/ld+json` script:

**All 12 for-professionals pages** (`/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-editors`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`, `/for-coordinators`) — these pages have good metadata but no Schema.org type, making them invisible to structured-data consumers.

**Phase 4 tools (all 4):** `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical` — the existing tools (`/tools/cdl`, `/tools/aces`, `/tools/coverage`) also lack JSON-LD, but the Phase 4 pages are the most recently shipped and their omission is most likely to be noticed.

**Gear/VFX/Stunts detail pages** lack BreadcrumbList JSON-LD even though film and crew detail pages have it. Specifically:
- `apps/web/app/gear/[manufacturer]/page.tsx`
- `apps/web/app/gear/[manufacturer]/[series]/page.tsx`
- `apps/web/app/gear/[manufacturer]/[series]/[item]/page.tsx`
- `apps/web/app/vfx/[slug]/page.tsx`
- All stunts sub-detail pages (`/stunts/companies/[slug]`, `/stunts/rigging/[slug]`, `/stunts/safety/[slug]`, `/stunts/sequences/[productionSlug]/[sequenceSlug]`)

---

### P1-4 — Empty `alt=""` on content images in `MediaGallery` and `ProductionDetail`

**Severity: P1 — WCAG 2.2 AA violation on content images; also harms SEO image indexing.**

`apps/web/components/productions/MediaGallery.tsx:34` — TMDb backdrop thumbnails in the horizontal scroll strip are served with `alt=""`. These are content images (film stills, not icons or decorative separators), and they contain the film's visual identity. An appropriate alt such as `{title} backdrop {i+1}` is both accessible and crawlable.

`apps/web/components/productions/ProductionDetail.tsx:888,931` — Collection member poster thumbnails and similar-production poster thumbnails both use `alt=""`. While the parent `<Link>` contains the film title as text, screen readers skip the image entirely, losing any visual context.

`apps/web/app/vfx/[slug]/page.tsx:172` — Production poster thumbnails in the VFX house's filmography list use `alt=""`.

`apps/web/app/gear/[manufacturer]/[series]/page.tsx:268` — Production poster thumbnails in lens/camera filmography list use `alt=""`.

`apps/web/app/crew/[slug]/page.tsx:848` — Production poster thumbnails in the crew filmography use `alt=""`.

---

### P1-5 — `/import/letterboxd` is a completely orphaned page

**Severity: P1 — the page exists, has functional JS, and calls the `/api/import/letterboxd/match` route, but no link to it exists anywhere in the app (nav, footer, account page, or any other page).**

`apps/web/app/import/letterboxd/page.tsx` — the only inbound reference in the entire codebase is from the LetterboxdImport component itself (which is the page's own child). There is no link from `/account`, the footer, the top nav, or any `/films` page. The feature is effectively dark.

---

### P1-6 — `/signin` and `/account` missing `robots: noindex`

**Severity: P1 — search engines can index authentication pages. `/bookmarks` correctly has `robots: { index: false, follow: false }` but `/signin` and `/account` do not.**

- `apps/web/app/signin/page.tsx` has `title`, `description`, no robots override.
- `apps/web/app/account/page.tsx` has only `{ title: 'Account' }` — no description, no robots override.

Google may index `https://cinecanon.com/signin` with a description "Sign in to CineCanon to save references and build lookbooks." This wastes crawl budget and exposes the auth surface to the SERP.

---

### P1-7 — `/api/v1` discovery document does not document `/api/v1/crew/{slug}`

**Severity: P1 — the endpoint is live, is used by the crew-page OG image generator, and is part of the "stable surface" per the CLAUDE.md docs, but is absent from the `/api/v1` root discovery JSON.**

`apps/web/app/api/v1/route.ts` lists `production`, `search_suggest`, `aeo_precision`, `aeo_claims`, and `aeo_digest_atom` endpoints. The `crew` endpoint at `/api/v1/crew/{slug}` is missing entirely. External integrators who read the discovery document will not know the endpoint exists.

---

## P2 — Polish

### P2-1 — Short `<title>` tags on 7 major section pages

The following pages produce titles well below the 30-character recommended minimum when the ` | CineCanon` template suffix is applied. Google typically rewrites titles shorter than ~30 characters from the page's `<h1>` or OG title, which may produce inconsistent SERP display:

| Route | Full title (with template) | Length |
|---|---|---|
| `/gear` | `Gear \| CineCanon` | 16 chars |
| `/tools` | `Tools \| CineCanon` | 17 chars |
| `/awards` | `Awards \| CineCanon` | 18 chars |
| `/references` | `References \| CineCanon` | 22 chars |
| `/ask` | `Ask anything \| CineCanon` | 24 chars |
| `/walkthroughs` | `Walkthroughs \| CineCanon` | 24 chars |
| `/dossiers` | `Craft Dossiers \| CineCanon` | 26 chars |

Source: `apps/web/app/{gear,tools,awards,references,ask,walkthroughs,dossiers}/page.tsx` — `title` fields.

---

### P2-2 — `/about` page title is over 60 characters

`apps/web/app/about/page.tsx` has `title: 'About CineCanon — Sources, Curation & Citation Tiers'`. With template: `About CineCanon — Sources, Curation & Citation Tiers | CineCanon` = **66 characters**. Google typically truncates to ~60 characters in search results, cutting off " | CineCanon".

---

### P2-3 — Meta descriptions out of range on multiple pages

**Too long (>160 chars):**
- `/ask`: 191 chars — `apps/web/app/ask/page.tsx`
- `/awards`: 274 chars — `apps/web/app/awards/page.tsx`
- `/references`: 223 chars — `apps/web/app/references/page.tsx`
- `/films`: 165 chars — `apps/web/app/films/page.tsx`
- `/for-gaffers`: 182 chars — `apps/web/app/for-gaffers/page.tsx`

**Too short (<120 chars):**
- `/walkthroughs`: 119 chars — `apps/web/app/walkthroughs/page.tsx`
- `/about`: 115 chars — `apps/web/app/about/page.tsx`

---

### P2-4 — Four pages missing `alternates.canonical`

The following pages define `metadata` but omit `alternates: { canonical: '...' }`. This is not critical (Next.js may infer the canonical), but it is inconsistent with every other page in the codebase:

- `/societies` — `apps/web/app/societies/page.tsx`
- `/format` — `apps/web/app/format/page.tsx`
- `/search` — `apps/web/app/search/page.tsx` (moot since it's `noindex`, but still inconsistent)
- `/bookmarks` — `apps/web/app/bookmarks/page.tsx` (also `noindex`)

---

### P2-5 — Homepage title rendered twice via template

`apps/web/app/layout.tsx` defines `title.template: '%s | CineCanon'` and `title.default: 'CineCanon — Cinematic Technical Reference'`. `apps/web/app/page.tsx` then sets `title: 'CineCanon — Cinematic Technical Reference'` explicitly. Next.js 15 applies the template to any page-level title string, so the browser tab and SERP entry read `CineCanon — Cinematic Technical Reference | CineCanon`. The word "CineCanon" appears twice. Consider using `title: { absolute: 'CineCanon — Cinematic Technical Reference' }` on the homepage to bypass the template.

---

### P2-6 — `/lookbook` page is unlinked from nav/footer and not in any sitemap

`apps/web/app/lookbook/page.tsx` exists, has a canonical, and accurately documents the in-development SigLIP-2 visual search feature. However it is not linked from the footer, top nav, or any other page, and is absent from all sitemaps. Since the page explicitly serves as a "coming soon" placeholder with a call-to-action to `/shots`, it should either be linked (P1 promotion if it should be discoverable) or retain the current dark state while the feature ships. The `eyebrow="Visual search · upload coming soon"` copy is visible on the page, which is appropriate for an in-development feature — the issue is purely discoverability.

---

## Appendix — Full URL Status Table

The sandbox proxy blocks direct HTTP access to cinecanon.com; the table below is derived from source code analysis. "Inferred Status" means: the route file exists and returns an appropriate response; "MISSING FROM SITEMAP" is a separate concern from HTTP status.

| URL | Route File | Inferred Status | Sitemap | Notes |
|---|---|---|---|---|
| `https://cinecanon.com/` | `app/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/films` | `app/films/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/crew` | `app/crew/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/gear` | `app/gear/page.tsx` | 200 | YES (core) | Short title |
| `https://cinecanon.com/ask` | `app/ask/page.tsx` | 200 | YES (core) | Short title; long desc |
| `https://cinecanon.com/tools` | `app/tools/page.tsx` | 200 | YES (core) | Short title |
| `https://cinecanon.com/awards` | `app/awards/page.tsx` | 200 | NOT in sitemap | Short title; long desc |
| `https://cinecanon.com/references` | `app/references/page.tsx` | 200 | NOT in sitemap | Short title; long desc |
| `https://cinecanon.com/walkthroughs` | `app/walkthroughs/page.tsx` | 200 | NOT in sitemap | Short title; short desc |
| `https://cinecanon.com/dossiers` | `app/dossiers/page.tsx` | 200 | NOT in sitemap | Short title |
| `https://cinecanon.com/decisions` | `app/decisions/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/partnerships` | `app/partnerships/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/about` | `app/about/page.tsx` | 200 | NOT in sitemap | Long title; short desc |
| `https://cinecanon.com/methodology` | `app/methodology/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/locations` | `app/locations/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/decades` | `app/decades/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/shots` | `app/shots/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/societies` | `app/societies/page.tsx` | 200 | NOT in sitemap | No canonical tag |
| `https://cinecanon.com/format` | `app/format/page.tsx` | 200 | YES (core — format slugs) | No canonical tag; index not in sitemap |
| `https://cinecanon.com/queries` | `app/queries/page.tsx` | 200 | NOT in sitemap | Individual queries ARE in sitemap |
| `https://cinecanon.com/queries/alexa65-sphero` | `app/queries/alexa65-sphero/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/queries/dune-part-two-lenses` | `app/queries/dune-part-two-lenses/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/queries/magic-hour-2023` | `app/queries/magic-hour-2023/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/vfx` | `app/vfx/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/vfx/{slug}` | `app/vfx/[slug]/page.tsx` | 200 | YES (vfx) | No breadcrumb JSON-LD; empty alt on poster |
| `https://cinecanon.com/vfx/volumes` | `app/vfx/volumes/page.tsx` | 200 | NOT in sitemap | console.warn on query fail |
| `https://cinecanon.com/vfx/title-houses` | `app/vfx/title-houses/page.tsx` | 200 | NOT in sitemap | console.warn on query fail |
| `https://cinecanon.com/vfx/shot-breakdowns` | `app/vfx/shot-breakdowns/page.tsx` | 200 | NOT in sitemap | console.warn on query fail |
| `https://cinecanon.com/stunts` | `app/stunts/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/stunts/people` | `app/stunts/people/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/stunts/sequences` | `app/stunts/sequences/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/stunts/lineage` | `app/stunts/lineage/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/stunts/rigging` | `app/stunts/rigging/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/stunts/safety` | `app/stunts/safety/page.tsx` | 200 | YES (core) | — |
| `https://cinecanon.com/stunts/companies` | `app/stunts/companies/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/stunts/coordinators` | `app/stunts/coordinators/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/sound` | `app/sound/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/sound/adr-studios` | `app/sound/adr-studios/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/sound/effects` | `app/sound/effects/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/sound/foley` | `app/sound/foley/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/sound/houses` | `app/sound/houses/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/sound/post` | `app/sound/post/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/sound/mixers` | `app/sound/mixers/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/sound/effects/libraries` | `app/sound/effects/libraries/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/music` | `app/music/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/music/composers` | `app/music/composers/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/music/scoring-stages` | `app/music/scoring-stages/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/music/orchestras` | `app/music/orchestras/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/music/supervisors` | `app/music/supervisors/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/music/supervision-agencies` | `app/music/supervision-agencies/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/music/cue-guides` | `app/music/cue-guides/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/editing` | `app/editing/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/editing/editors` | `app/editing/editors/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/editing/walkthroughs` | `app/editing/walkthroughs/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/production-design` | `app/production-design/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/production-design/designers` | `app/production-design/designers/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/production-design/works` | `app/production-design/works/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/costume-hair-makeup` | `app/costume-hair-makeup/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/costume-hair-makeup/designers` | `app/costume-hair-makeup/designers/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/costume-hair-makeup/costume-works` | `app/costume-hair-makeup/costume-works/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/costume-hair-makeup/makeup-works` | `app/costume-hair-makeup/makeup-works/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/costume-hair-makeup/construction-houses` | `app/costume-hair-makeup/construction-houses/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/costume-hair-makeup/effects-houses` | `app/costume-hair-makeup/effects-houses/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/gear/rentals` | `app/gear/rentals/page.tsx` | 200 | NOT in sitemap | console.warn |
| `https://cinecanon.com/equipment/specs` | `app/equipment/specs/page.tsx` | 200 | NOT in sitemap | — |
| `https://cinecanon.com/tools/scoring-session-cost` | `app/tools/scoring-session-cost/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/tools/stunt-rig-picker` | `app/tools/stunt-rig-picker/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/tools/hdr-target-picker` | `app/tools/hdr-target-picker/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/tools/anamorphic-vs-spherical` | `app/tools/anamorphic-vs-spherical/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-dps` | `app/for-dps/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-colorists` | `app/for-colorists/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-gaffers` | `app/for-gaffers/page.tsx` | 200 | NOT in sitemap | No JSON-LD; long desc |
| `https://cinecanon.com/for-editors` | `app/for-editors/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-sound-mixers` | `app/for-sound-mixers/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-sound-designers` | `app/for-sound-designers/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-composers` | `app/for-composers/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-music-supervisors` | `app/for-music-supervisors/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-production-designers` | `app/for-production-designers/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-costume-designers` | `app/for-costume-designers/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-makeup-artists` | `app/for-makeup-artists/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/for-coordinators` | `app/for-coordinators/page.tsx` | 200 | NOT in sitemap | No JSON-LD |
| `https://cinecanon.com/lookbook` | `app/lookbook/page.tsx` | 200 | NOT in sitemap | Unlinked; "coming soon" |
| `https://cinecanon.com/import/letterboxd` | `app/import/letterboxd/page.tsx` | 200 | NOT in sitemap | Fully orphaned |
| `https://cinecanon.com/signin` | `app/signin/page.tsx` | 200 | NOT in sitemap | Missing noindex |
| `https://cinecanon.com/account` | `app/account/page.tsx` | 200 (or 307 to /signin) | NOT in sitemap | Missing noindex; missing description |
| `https://cinecanon.com/bookmarks` | `app/bookmarks/page.tsx` | 200 | NOT in sitemap | Correctly noindex |
| `https://cinecanon.com/search` | `app/search/page.tsx` | 200 | NOT in sitemap | Correctly noindex |
| `https://cinecanon.com/robots.txt` | `app/robots.ts` | 200 | N/A | Correct; disallows /admin/ |
| `https://cinecanon.com/sitemap.xml` | `app/sitemap.xml/route.ts` | 200 | N/A | Sitemap index; 5 segments |
| `https://cinecanon.com/llms.txt` | `app/llms.txt/route.ts` | 200 | N/A | Dynamic; well-structured |
| `https://cinecanon.com/digest.xml` | `app/digest.xml/route.ts` | 200 | N/A | Atom feed; referenced in footer |
| `https://cinecanon.com/api/v1` | `app/api/v1/route.ts` | 200 | N/A | Missing crew endpoint in discovery doc |
| `https://cinecanon.com/api/v1/productions/{slug}` | `app/api/v1/productions/[slug]/route.ts` | 200/404 | N/A | Documented; functional |
| `https://cinecanon.com/api/v1/crew/{slug}` | `app/api/v1/crew/[slug]/route.ts` | 200/404 | N/A | Undocumented in discovery doc |
| `https://cinecanon.com/api/v1/aeo/claims` | `app/api/v1/aeo/claims/route.ts` | 200 | N/A | Documented |
| `https://cinecanon.com/api/v1/aeo/precision` | `app/api/v1/aeo/precision/route.ts` | 200 | N/A | Documented |
| `https://cinecanon.com/api/v1/aeo/digest.xml` | `app/api/v1/aeo/digest.xml/route.ts` | 200 | N/A | Documented |

---

## What I'd Fix First

The most impactful single action is expanding `sitemap-core.xml` to include all 63+ missing index pages. Right now, entire departments — Sound, Music, Editing, Production Design, Costume/Hair/Makeup, and all twelve for-professionals landing pages — are completely invisible to search engines and AI crawlers despite being live and fully linked in the footer. This gap directly undermines CineCanon's GEO/AEO strategy: the `llms.txt` file and ClaimReview schema do their job, but if Googlebot and GPTBot never discover `/sound` or `/for-dps`, no amount of structured-data quality on those pages matters. The fix is a one-file edit to `apps/web/app/sitemap-core.xml/route.ts` adding the roughly 50 missing static URLs, and adding the four Phase 4 tools as well. After that, address the 22 `console.warn` calls in production server components by replacing them with `Sentry.captureException` calls so the team gets actionable alerts when newly-shipped DB tables (volumes, title-houses, orchestras, supervision-agencies) have query failures, rather than silent empty-state renders with no visibility into how frequently they occur.
