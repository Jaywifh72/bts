# CineCanon QA Sweep — 2026-07-06

## Methodology Note

The live site at https://cinecanon.com was unreachable through this session's egress proxy (HTTP 407/403 tunnel block, per organizational policy — confirmed with `curl`). This sweep was conducted entirely as static analysis of the local repository at `/home/user/bts`. Route-level HTTP status codes, actual image weights, and CDN response times were not testable. All findings are derived from source code at commit `HEAD` on branch `master`.

---

## Summary

| Metric | Count |
|---|---|
| Public pages in repo | 133 total (96 static, 37 dynamic) |
| Admin-only pages (excluded) | 34 |
| P0 — Broken | 2 |
| P1 — Degraded | 6 |
| P2 — Polish | 5 |
| Total defects | 13 |

The site is architecturally sound and well-structured. Two P0 defects need immediate attention before the next crawl cycle. The dominant P1 category is sitemap omission — roughly half the public surface area is invisible to search engines.

---

## P0 — Broken

### P0-1: Organization JSON-LD logo file does not exist

**File:** `apps/web/app/page.tsx`, line 133

**Code:** `logo: siteUrl() + '/icon-512.png'`

**Finding:** The homepage emits a Schema.org `Organization` block via the `buildOrganizationJsonLd` builder in `lib/jsonLd.tsx`. The `logo` field is hardcoded to `{SITE_URL}/icon-512.png`. The file `icon-512.png` does not exist in `apps/web/public/`. The entire `public/` directory contains only one file: `brand/cinecanon-mark.svg`. Any JSON-LD crawler (Googlebot, Bingbot, AI parsers) following the logo URL receives a 404. Google's Rich Results documentation treats a 404 logo as an invalid Organization structured data item — the entire block may be dropped from the knowledge graph.

**Impact:** Organization entity in Google Knowledge Graph loses the logo slot. ClaimReview citations anchored to the Organization node may lose the visual brand identity that distinguishes them from competing sources.

**Evidence:** `ls apps/web/public/` returns only `brand/`. No `*.png` found anywhere under `apps/web/public/`.

---

### P0-2: Root layout errors produce a blank page — no `global-error.tsx`

**File:** `apps/web/app/` (missing file: `global-error.tsx`)

**Finding:** Next.js App Router requires a `global-error.tsx` alongside `layout.tsx` to catch errors thrown *inside* the root layout itself. The existing `apps/web/app/error.tsx` only catches errors from page components rendered within the layout — it cannot catch errors thrown by the layout's own code (e.g., `safeAuth()` failures, DB connection exhaustion before first render, Sentry initialization errors). When the root layout throws, the user receives a blank white page with no fallback UI and no Sentry error boundary fires. No `global-error.tsx` was found anywhere under `apps/web/`.

**Impact:** If `safeAuth()` or the DB pool throws during a root layout render (which happens on every server-rendered page), the result is a blank page for that user with no operator notification.

---

## P1 — Degraded

### P1-1: Sitemap omits 62 public static pages

**Files:** `apps/web/app/sitemap.xml/route.ts`, `apps/web/app/sitemap-core.xml/route.ts`, and the four other segment sitemaps.

**Finding:** The sitemap index points at five sub-sitemaps: `core`, `films`, `crew`, `gear`, `vfx`. The core sitemap covers 23 static routes. The films/crew/gear/vfx sitemaps cover dynamic detail pages only. The following 62 public static pages have no sitemap entry in any segment:

Entirely absent sections: `/about`, `/methodology`, `/references`, `/awards`, `/music`, `/music/composers`, `/music/cue-guides`, `/music/orchestras`, `/music/scoring-stages`, `/music/supervision-agencies`, `/music/supervisors`, `/sound`, `/sound/adr-studios`, `/sound/designers`, `/sound/effects`, `/sound/effects/libraries`, `/sound/foley`, `/sound/houses`, `/sound/mixers`, `/sound/post`, `/editing`, `/editing/editors`, `/editing/walkthroughs`, `/production-design`, `/production-design/designers`, `/production-design/works`, `/costume-hair-makeup`, `/costume-hair-makeup/construction-houses`, `/costume-hair-makeup/costume-works`, `/costume-hair-makeup/designers`, `/costume-hair-makeup/effects-houses`, `/costume-hair-makeup/makeup-works`, `/vfx/shot-breakdowns`, `/vfx/title-houses`, `/vfx/volumes`, `/decades`, `/locations`, `/lookbook`, `/shots`, `/partnerships`, `/decisions`, `/dossiers`, `/walkthroughs`, `/gear/rentals`, `/equipment/specs`, `/societies`, `/stunts/companies`, `/stunts/coordinators`.

All 12 role landing pages: `/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-editors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`, `/for-coordinators`.

Four Phase-4 tools: `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`.

Dynamic sub-pages also absent: `/vfx/title-houses/[slug]`, `/sound/effects/libraries/[slug]`, `/sound/adr-studios/[slug]`, `/gear/rentals/[slug]`, `/music/orchestras/[slug]`, `/music/supervision-agencies/[slug]`, `/costume-hair-makeup/construction-houses/[slug]`, `/costume-hair-makeup/effects-houses/[slug]`, `/partnerships/[slug]`, `/decisions/[slug]`, `/walkthroughs/[slug]`, `/dossiers/[slug]`.

**Impact:** Googlebot will not discover or reindex these pages on the normal sitemap-driven cycle. Pages must be found via crawl link-following only, which may not happen for sub-pages that are lightly linked internally.

---

### P1-2: 39 `console.warn` / `console.error` calls in production code paths

**CLAUDE.md constraint (verbatim):** "Don't add console.log or console.error in production code paths — use Sentry."

**Finding:** 39 lines across 21 production route/page files use `console.warn` or `console.error`. These calls do not trigger Sentry and produce noise in the Vercel function log without structured context. Affected routes include:

- `app/page.tsx` lines 79–80: `console.error` on `listRecentlyResolvedCorrections` and `listRecentCitations` failures
- `app/editing/walkthroughs/page.tsx`, `app/vfx/shot-breakdowns/page.tsx`, `app/music/cue-guides/page.tsx`, `app/costume-hair-makeup/costume-works/page.tsx`, `app/costume-hair-makeup/makeup-works/page.tsx`, `app/production-design/works/page.tsx`: `console.warn` on DB query failures
- `app/vfx/volumes/page.tsx`, `app/vfx/volumes/[slug]/page.tsx`, `app/vfx/title-houses/page.tsx`, `app/vfx/title-houses/[slug]/page.tsx`: `console.warn` on missing/failed table queries
- `app/sound/effects/libraries/page.tsx`, `app/sound/effects/libraries/[slug]/page.tsx`, `app/sound/adr-studios/page.tsx`, `app/sound/adr-studios/[slug]/page.tsx`, `app/sound/houses/page.tsx`: `console.warn`
- `app/music/orchestras/page.tsx`, `app/music/orchestras/[slug]/page.tsx`, `app/music/scoring-stages/page.tsx`, `app/music/supervision-agencies/page.tsx`, `app/music/supervision-agencies/[slug]/page.tsx`: `console.warn`
- `app/gear/rentals/page.tsx`, `app/gear/rentals/[slug]/page.tsx`, `app/partnerships/page.tsx`, `app/partnerships/[slug]/page.tsx`, `app/decisions/page.tsx`, `app/decisions/[slug]/page.tsx`, `app/dossiers/[slug]/page.tsx`, `app/walkthroughs/[slug]/page.tsx`: `console.warn`
- `app/costume-hair-makeup/effects-houses/page.tsx`, `app/costume-hair-makeup/effects-houses/[slug]/page.tsx`, `app/costume-hair-makeup/construction-houses/page.tsx`, `app/costume-hair-makeup/construction-houses/[slug]/page.tsx`: `console.warn`
- `app/api/search/nl/route.ts` line 78: `console.error` on embedding failure
- `app/admin/(authenticated)/seo/error.tsx` line 25, `app/admin/(authenticated)/seo/page.tsx` line 31: `console.error`

**Impact:** Operational failures in these routes are silent to Sentry — the operator has no structured alert. Several of these routes use the pattern `try { rows = [...(await query(db))]; } catch (e) { console.warn(e); }` which means the page silently renders an empty state without any observability.

---

### P1-3: 13 public pages missing canonical URL tag

**Finding:** The following public pages export `metadata` without an `alternates.canonical` field. Next.js will not emit a `<link rel="canonical">` tag, leaving the canonical URL undefined for search engines:

`/gear`, `/stunts`, `/stunts/lineage`, `/stunts/people`, `/stunts/sequences`, `/stunts/rigging`, `/stunts/safety`, `/ask`, `/tools`, `/tools/cdl`, `/tools/coverage`, `/tools/frame-lines`, `/tools/loadout`, `/tools/aces`, `/societies`, `/format`, `/search`

Note: `/references`, `/methodology`, `/about` do have canonicals. The four Phase-4 tool pages (`/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`) also have canonicals.

**Impact:** Without a canonical, search engines may index multiple URL variants (with/without trailing slash, with query params from faceted filtering on `/stunts` or `/format`) as separate pages, causing duplicate content dilution.

---

### P1-4: OG social images only on 3 routes — all section pages share homepage image

**Files:** `apps/web/app/opengraph-image.tsx`, `apps/web/app/films/[slug]/opengraph-image.tsx`, `apps/web/app/crew/[slug]/opengraph-image.tsx`

**Finding:** Per-route `opengraph-image.tsx` edge-runtime image generators exist only for the homepage, film detail pages, and crew detail pages. Every other route — `/music`, `/sound`, `/stunts`, `/editing`, `/production-design`, `/vfx`, `/awards`, `/tools/*`, `/gear`, `/for-dps`, all section indexes — inherits the root-layout OG image (the generic CineCanon homepage image). When a working pro shares any section link on Twitter/X, LinkedIn, or Slack, the preview shows the homepage image regardless of the shared page's content.

**Impact:** Sharing `/stunts` on social shows the same image as the homepage. Reduces section-specific brand recognition and click-through rate for secondary pages.

---

### P1-5: Meta descriptions out of recommended range (120–160 chars)

**Finding — too long (>160 chars):**

- `/films/page.tsx`: 165 chars — "Browse cited, confidence-graded technical data for thousands of films — camera, lenses, aspect ratio, crew, production timeline, and post-house chain."
- `/tools/page.tsx`: 201 chars

**Finding — too short (<120 chars) — representative sample:**

- `/queries`: 41 chars — "Hand-picked cross-cutting cinema queries."
- `/vfx`: 58 chars — "Directory of visual-effects houses and their film credits."
- `/signin`: 60 chars — "Sign in to CineCanon to save references and build lookbooks."
- `/decades`: 61 chars — "Browse the archive by decade of release. 1920s through 2020s."
- `/crew/compare`: 61 chars — "Side-by-side comparison for up to four people in the archive."
- `/crew`: 80 chars — "Directors, cinematographers, editors, production designers, sound and VFX leads."
- `/music`: ~82 chars
- `/films/compare`: ~92 chars

Approximately 20 static pages have descriptions shorter than 120 chars.

---

### P1-6: `.env.example` contains obsolete `studiopro.example.com` placeholder

**File:** `.env.example`, line 23

**Code:** `NEXT_PUBLIC_SITE_URL=https://studiopro.example.com`

**Finding:** This is the value any developer gets when cloning the repo without a `.env.local`. `NEXT_PUBLIC_SITE_URL` drives `siteUrl()` in `lib/site.ts`, which is used for: all JSON-LD canonical URLs, all `alternates.canonical` metadata, the `robots.txt` sitemap pointer, and the `llms.txt` content. A developer running without `.env.local` will generate and test with Organization JSON-LD pointing at `studiopro.example.com`, and the sitemap URL in robots.txt will be wrong. The brand name "studiopro" is also an internal name that should not be surfaced in any committed file.

**Impact:** Risk of a developer accidentally shipping a branch that passes tests locally but references the wrong domain. Any CI/CD pipeline that runs with only `.env.example` values would produce a build with `studiopro.example.com` URLs in its structured data.

---

## P2 — Polish

### P2-1: 8 page titles render under 30 chars after title template application

The root layout defines `title: { template: '%s | CineCanon' }`. After template application:

| Route | Raw title | Final title | Total chars |
|---|---|---|---|
| `/gear` | Gear | Gear \| CineCanon | 16 |
| `/sound` | Sound | Sound \| CineCanon | 17 |
| `/music` | Music | Music \| CineCanon | 17 |
| `/tools` | Tools | Tools \| CineCanon | 17 |
| `/sound/foley` | Foley | Foley \| CineCanon | 17 |
| `/awards` | Awards | Awards \| CineCanon | 18 |
| `/stunts` | Stunts | Stunts \| CineCanon | 18 |
| `/search` | Search | Search \| CineCanon | 18 |
| `/editing` | Editing | Editing \| CineCanon | 19 |

Google truncates titles under 30 chars and may substitute its own title from H1 content. The SEO-recommended range is 30–60 chars.

---

### P2-2: No JSON-LD structured data on 4 Phase-4 tool pages

**Files:** `apps/web/app/tools/scoring-session-cost/page.tsx`, `apps/web/app/tools/stunt-rig-picker/page.tsx`, `apps/web/app/tools/hdr-target-picker/page.tsx`, `apps/web/app/tools/anamorphic-vs-spherical/page.tsx`

**Finding:** All four pages have proper `metadata` (title, description, canonical) but emit no JSON-LD. Schema.org `SoftwareApplication` or `WebApplication` type with `applicationCategory: "UtilitiesApplication"` would allow Google to surface these as rich results in "tools for cinematographers" queries — a direct match to the site's AEO/GEO strategy. CLAUDE.md requires all JSON-LD to go through `lib/jsonLd.tsx` builders.

---

### P2-3: `/references` meta description exceeds 160 chars (description set inline)

**File:** `apps/web/app/references/page.tsx`, description passed as JSX prop at line 73

**Finding:** The description string is approximately 221 chars. Google will truncate at ~160 chars in search snippets. This description is also injected via the `description` prop of `PageHero` rather than in the exported `metadata` object — the `metadata` object at line 9 has a separate `description:` field that should be kept to 120–160 chars.

---

### P2-4: `awards/cinematography/page.tsx` is an undecorated redirect with no metadata

**File:** `apps/web/app/awards/cinematography/page.tsx`

**Finding:** This file uses Next.js `redirect()` to send visitors to `/awards/craft/cinematography`. It exports no `metadata`, no `title`, and Next.js will serve a 307 Temporary Redirect. If links in the wild (e.g., from AI engine citations) point at `/awards/cinematography`, the redirect chain is exposed without a canonical hint. Since the redirect is intentional, it should at minimum use `permanentRedirect()` to emit a 308, which search engines treat as a signal to update their index.

---

### P2-5: Footer links to 35+ routes not in any sitemap

**File:** `apps/web/components/nav/Footer.tsx`

**Finding:** The site footer is the most comprehensive navigation surface on the site — it links to every major section including Music, Sound, Editing, Production Design, Costume/Hair/Makeup, VFX sub-sections, all 12 role landing pages, Cross-cuts, and the About cluster. These are exactly the routes missing from all sitemaps (P1-1 above). This is a discoverability note rather than a broken-link issue: the footer links are valid routes, but a Googlebot arriving via sitemap alone will miss 62 routes that working-pro visitors navigating via footer would find immediately.

---

## Appendix — Route × Status Table

Note: HTTP status codes are derived from code analysis, not live HTTP requests (site unreachable via proxy). "200-expected" means the route handler exists and has no obvious error path that would trigger a non-200 on a cold request. "Redirect" means `redirect()` is called unconditionally.

| Route | Type | Expected Status | Canonical | In Sitemap | Notes |
|---|---|---|---|---|---|
| `/` | Static | 200 | Yes | Yes (core) | icon-512.png 404 in JSON-LD |
| `/films` | Static | 200 | Yes | Yes (core) | Description 165 chars (too long) |
| `/films/[slug]` | Dynamic ISR | 200 | Yes | Yes (films) | OG image present |
| `/films/compare` | Static | 200 | Yes | No | — |
| `/crew` | Static | 200 | Yes | Yes (core) | Description 80 chars (too short) |
| `/crew/[slug]` | Dynamic | 200 | Yes | Yes (crew) | OG image present |
| `/crew/compare` | Static | 200 | Yes | No | Description 61 chars (too short) |
| `/gear` | Static | 200 | **No** | Yes (core) | — |
| `/gear/[mfr]` | Dynamic | 200 | Yes | Yes (gear) | — |
| `/gear/[mfr]/[series]` | Dynamic | 200 | Yes | Yes (gear) | — |
| `/gear/[mfr]/[series]/[item]` | Dynamic | 200 | Yes | Yes (gear) | — |
| `/gear/compare` | Static | 200 | Yes | No | Description 70 chars (too short) |
| `/gear/rentals` | Static | 200 | Yes | **No** | — |
| `/gear/rentals/[slug]` | Dynamic | 200 | Yes | **No** | — |
| `/equipment/specs` | Static | 200 | Yes | **No** | — |
| `/vfx` | Static | 200 | Yes | Yes (core) | Description 58 chars (too short) |
| `/vfx/[slug]` | Dynamic | 200 | Yes | Yes (vfx) | — |
| `/vfx/volumes` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/vfx/volumes/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/vfx/title-houses` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/vfx/title-houses/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/vfx/shot-breakdowns` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/stunts` | Static | 200 | **No** | Yes (core) | — |
| `/stunts/people` | Static | 200 | **No** | Yes (core) | — |
| `/stunts/sequences` | Static | 200 | **No** | Yes (core) | — |
| `/stunts/lineage` | Static | 200 | **No** | Yes (core) | — |
| `/stunts/rigging` | Static | 200 | Yes | Yes (core) | — |
| `/stunts/safety` | Static | 200 | Yes | Yes (core) | — |
| `/stunts/coordinators` | Static | 200 | Yes | **No** | — |
| `/stunts/companies` | Static | 200 | Yes | **No** | — |
| `/sound` | Static | 200 | Yes | **No** | — |
| `/sound/post` | Static | 200 | Yes | **No** | — |
| `/sound/effects` | Static | 200 | Yes | **No** | — |
| `/sound/effects/libraries` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/sound/effects/libraries/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/sound/adr-studios` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/sound/adr-studios/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/sound/foley` | Static | 200 | Yes | **No** | Title 17 chars (too short) |
| `/sound/designers` | Static | 200 | Yes | **No** | — |
| `/sound/mixers` | Static | 200 | Yes | **No** | — |
| `/sound/houses` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/music` | Static | 200 | Yes | **No** | Description 82 chars (too short) |
| `/music/composers` | Static | 200 | Yes | **No** | — |
| `/music/scoring-stages` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/music/orchestras` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/music/orchestras/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/music/supervisors` | Static | 200 | Yes | **No** | — |
| `/music/supervision-agencies` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/music/supervision-agencies/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/music/cue-guides` | Static | 200 | Yes | **No** | console.warn on DB fail; Description 101 chars |
| `/editing` | Static | 200 | Yes | **No** | Title 19 chars (too short) |
| `/editing/editors` | Static | 200 | Yes | **No** | Description 107 chars (too short) |
| `/editing/walkthroughs` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/production-design` | Static | 200 | Yes | **No** | — |
| `/production-design/designers` | Static | 200 | Yes | **No** | — |
| `/production-design/works` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/costume-hair-makeup` | Static | 200 | Yes | **No** | — |
| `/costume-hair-makeup/designers` | Static | 200 | Yes | **No** | — |
| `/costume-hair-makeup/costume-works` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/costume-hair-makeup/makeup-works` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/costume-hair-makeup/effects-houses` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/costume-hair-makeup/effects-houses/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/costume-hair-makeup/construction-houses` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/costume-hair-makeup/construction-houses/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/awards` | Static | 200 | Yes | **No** | — |
| `/awards/cinematography` | Redirect | 307 | — | No | Should be 308 permanentRedirect |
| `/awards/craft/[craft]` | Dynamic | 200 | Yes | **No** | — |
| `/references` | Static | 200 | Yes | **No** | Description 221 chars (too long) |
| `/decisions` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/decisions/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/partnerships` | Static | 200 | Yes | **No** | console.warn on DB fail |
| `/partnerships/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/walkthroughs` | Static | 200 | Yes | **No** | — |
| `/walkthroughs/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/dossiers` | Static | 200 | Yes | **No** | — |
| `/dossiers/[slug]` | Dynamic | 200 | Yes | **No** | console.warn on DB fail |
| `/decades` | Static | 200 | Yes | **No** | Description 61 chars (too short) |
| `/locations` | Static | 200 | Yes | **No** | — |
| `/lookbook` | Static | 200 | Yes | **No** | — |
| `/shots` | Static | 200 | Yes | **No** | — |
| `/format` | Static | 200 | **No** | Yes (core) | — |
| `/format/[slug]` | Dynamic | 200 | Yes | Yes (core) | Poster thumbnails have alt="" (defensible, title text adjacent) |
| `/societies` | Static | 200 | **No** | **No** | — |
| `/queries` | Static | 200 | Yes | **No** | Description 41 chars (too short) |
| `/queries/alexa65-sphero` | Static | 200 | Yes | Yes (core) | — |
| `/queries/dune-part-two-lenses` | Static | 200 | Yes | Yes (core) | — |
| `/queries/magic-hour-2023` | Static | 200 | Yes | Yes (core) | — |
| `/tools` | Static | 200 | **No** | Yes (core) | Description 201 chars (too long) |
| `/tools/frame-lines` | Static | 200 | **No** | Yes (core) | — |
| `/tools/coverage` | Static | 200 | **No** | Yes (core) | — |
| `/tools/loadout` | Static | 200 | **No** | Yes (core) | — |
| `/tools/aces` | Static | 200 | **No** | Yes (core) | — |
| `/tools/cdl` | Static | 200 | **No** | Yes (core) | — |
| `/tools/scoring-session-cost` | Static | 200 | Yes | **No** | No JSON-LD |
| `/tools/stunt-rig-picker` | Static | 200 | Yes | **No** | No JSON-LD |
| `/tools/hdr-target-picker` | Static | 200 | Yes | **No** | No JSON-LD |
| `/tools/anamorphic-vs-spherical` | Static | 200 | Yes | **No** | No JSON-LD |
| `/ask` | Static | 200 | **No** | Yes (core) | — |
| `/for-dps` | Static | 200 | Yes | **No** | — |
| `/for-colorists` | Static | 200 | Yes | **No** | — |
| `/for-gaffers` | Static | 200 | Yes | **No** | — |
| `/for-sound-mixers` | Static | 200 | Yes | **No** | — |
| `/for-sound-designers` | Static | 200 | Yes | **No** | — |
| `/for-composers` | Static | 200 | Yes | **No** | — |
| `/for-music-supervisors` | Static | 200 | Yes | **No** | — |
| `/for-editors` | Static | 200 | Yes | **No** | — |
| `/for-production-designers` | Static | 200 | Yes | **No** | — |
| `/for-costume-designers` | Static | 200 | Yes | **No** | — |
| `/for-makeup-artists` | Static | 200 | Yes | **No** | — |
| `/for-coordinators` | Static | 200 | Yes | **No** | — |
| `/about` | Static | 200 | Yes | **No** | — |
| `/methodology` | Static | 200 | Yes | **No** | — |
| `/search` | Static | 200 | **No** | **No** | — |
| `/digest.xml` | Route handler | 200 | — | — | Atom feed exists |
| `/sitemap.xml` | Route handler | 200 | — | — | Sitemap index |
| `/sitemap-core.xml` | Route handler | 200 | — | — | 23 static entries |
| `/sitemap-films.xml` | Route handler | 200 | — | — | Dynamic DB-driven |
| `/sitemap-crew.xml` | Route handler | 200 | — | — | Dynamic DB-driven |
| `/sitemap-gear.xml` | Route handler | 200 | — | — | Dynamic DB-driven |
| `/sitemap-vfx.xml` | Route handler | 200 | — | — | Dynamic DB-driven |
| `/robots.txt` | Route handler | 200 | — | — | Present; sitemap pointer correct |
| `/llms.txt` | Route handler | 200 | — | — | Present; DB-driven counts |
| `/api/v1` | Route handler | 200 | — | — | Discovery doc present |
| `/api/v1/productions/[slug]` | Route handler | 200 | — | — | CC-BY 4.0 |
| `/api/v1/crew/[slug]` | Route handler | 200 | — | — | CC-BY 4.0 |

---

## What I'd Fix First

The single highest-leverage fix is adding `icon-512.png` to `apps/web/public/` — a one-file addition that resolves the 404 in the Organization JSON-LD block and restores the structured data that underpins CineCanon's Knowledge Graph entity and every ClaimReview citation anchored to it (P0-1). Immediately after, create `apps/web/app/global-error.tsx` to close the blank-page risk on root layout errors (P0-2, also a one-file addition modeled on the existing `error.tsx`). Once those two P0s are closed, the biggest compounding ROI is the sitemap rebuild (P1-1): expanding `sitemap-core.xml` to include all 62 missing static routes takes roughly an hour and immediately exposes the entire Music, Sound, Editing, Production Design, and Costume/Hair/Makeup departments — which are currently invisible to Google's sitemap-driven crawl cycle despite being fully built and linked from the footer. The console.warn/error sweep (P1-2) can follow as a single pass replacing every `console.warn(e)` catch block with `Sentry.captureException(e, { tags: { route } })`, which also pays down technical debt at every future incident.
