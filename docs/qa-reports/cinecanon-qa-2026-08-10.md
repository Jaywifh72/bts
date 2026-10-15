# CineCanon QA Sweep — 2026-08-10

**Method:** Static code analysis of the local repo at `/home/user/bts` (branch `master`). Live-site HTTP testing was not possible in this session: the network egress proxy returned 403 Forbidden for `cinecanon.com:443` (organization egress policy). All findings are derived from reading source files. Live HTTP status codes are not reported; the prior crawl baseline (2026-05-21) is cross-referenced where relevant.

**Prior crawl baseline (2026-05-21):** 13,116 pages crawled — 13,104 × 2xx, 11 × network error, 0 × 4xx/5xx. 2,340 images probed — 1,702 × 400 (Next.js `/_next/image?…w=3840…` backdrop images).

---

## Summary

| Dimension | Count |
|---|---|
| Routes in repo (public, non-admin) | ~120 distinct page patterns |
| Routes with confirmed canonical URL | ~65 |
| Routes missing canonical (public-facing) | ~25+ |
| Routes absent from all sitemaps | ~40+ route groups |
| P0 defects | 1 (persistent broken-image wave, carried from prior crawl) |
| P1 defects | 8 |
| P2 defects | 9 |

---

## P0 — Broken

### P0-1 · 1,702 broken images via `/_next/image` with `w=3840` (backdrop images)

**Source:** Prior live crawl 2026-05-21.  
**Location:** `apps/web/components/productions/ProductionDetail.tsx` (and related components), anywhere `poster_path` or `backdrop_path` is passed to the Next.js `<Image>` component with `sizes` referencing the `3840` breakpoint.  
**Symptom:** `/_next/image?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw1280%2F<hash>.jpg&w=3840&q=75` returns HTTP 400 with 84 bytes (a JSON error body). Poster images (w154, w185, w500) are unaffected.  
**Impact:** Every film page that has a backdrop image used in a wide-layout slot shows a broken image box to users. Confirmed 1,702 unique broken URLs across the crawled surface.  
**Status:** Unknown if still present — live testing blocked. This issue was not present in the 2026-05-20 baseline and appeared in the 2026-05-21 full crawl. If still present, it is the single most impactful visual defect on the site.  
**Fix direction:** Investigate whether the Vercel `images.domains` or `remotePatterns` config accepts the `w=3840` breakpoint for `image.tmdb.org`; or remove `3840` from the `next.config` sizes array and add a more appropriate breakpoint that TMDb CDN will serve.

---

## P1 — Degraded

### P1-1 · Four Phase 4 decision tools absent from all sitemaps

**Location:** `apps/web/app/sitemap-core.xml/route.ts`  
**Routes affected:**
- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

All four pages have routes, metadata, and `alternates.canonical` properly set. They are linked from `/tools` (which is in `sitemap-core`), so Googlebot can discover them via crawl. However, they are absent from the sitemap, so they will not receive priority crawling signals and may be slower to index after updates.

The existing sitemap-core only covers the five tools that existed before Phase 4: `/tools/frame-lines`, `/tools/loadout`, `/tools/coverage`, `/tools/aces`, `/tools/cdl`. The four new tools need to be appended.

### P1-2 · Broad sitemap coverage gap — 40+ route groups excluded from all five sitemaps

**Location:** `apps/web/app/sitemap-core.xml/route.ts` and the four segment sitemaps.

The sitemap index covers: core static pages, `/films/*`, `/crew/*`, `/gear/*`, `/vfx/*`. The following significant public route groups are absent from every sitemap, meaning search engine discovery relies entirely on internal link crawling from those listed pages:

| Route group | In footer nav | In top nav | In any sitemap |
|---|---|---|---|
| `/about` | yes | no | no |
| `/methodology` | yes | no | no |
| `/awards` | yes | yes | no |
| `/walkthroughs` | no | no | no |
| `/walkthroughs/[slug]` | no | no | no |
| `/dossiers` | no | no | no |
| `/dossiers/[slug]` | no | no | no |
| `/decisions` | yes | no | no |
| `/decisions/[slug]` | no | no | no |
| `/partnerships` | yes | no | no |
| `/music` and all sub-routes | yes | yes (Craft) | no |
| `/sound` and all sub-routes | yes | yes (Craft) | no |
| `/editing` and sub-routes | yes | yes (Craft) | no |
| `/production-design` and sub-routes | yes | yes (Craft) | no |
| `/costume-hair-makeup` and sub-routes | yes | yes (Craft) | no |
| `/references` and `/references/[id]` | yes | yes | no |
| `/societies` and `/societies/[slug]` | no | no | no |
| `/lookbook` | no | no | no |
| `/shots` | yes | no | no |
| `/decades` and `/decades/[decade]` | yes | no | no |
| `/locations` and `/locations/[id]` | yes | no | no |
| `/queries` and static sub-pages | no | no | no* |
| All twelve `/for-*` landing pages | yes | no | no |
| `/stunts/companies` and `/stunts/companies/[slug]` | no | no | no |
| `/stunts/schools/[slug]` | no | no | no |
| `/gear/rentals` and `/gear/rentals/[slug]` | yes | no | no |
| `/equipment/specs` | yes | no | no |
| `/films/[slug]/loadout` | no | no | no |
| `/films/[slug]/scenes/[sceneSlug]` | no | no | no |
| `/music/scores/[productionSlug]` | no | no | no |

*Note: The three named query pages (`/queries/alexa65-sphero`, etc.) ARE in sitemap-core, but the `/queries` index page itself is not.

The `llms.txt` route at `/llms.txt/route.ts` lists all of these sections, so AI crawlers receive the full inventory. The mismatch is specifically between the standard XML sitemap and the actual route surface.

### P1-3 · Missing canonical URLs on sitemap-listed gear and format pages

**Location:** Multiple `generateMetadata` functions.

The following routes are listed in the segmented sitemaps but emit no `alternates.canonical` in their metadata, leaving Google to determine the canonical URL heuristically:

| Route | File |
|---|---|
| `/gear` (index) | `apps/web/app/gear/page.tsx` |
| `/gear/[manufacturer]` | `apps/web/app/gear/[manufacturer]/page.tsx` |
| `/gear/[manufacturer]/[series]` | `apps/web/app/gear/[manufacturer]/[series]/page.tsx` |
| `/gear/[manufacturer]/[series]/[item]` | `apps/web/app/gear/[manufacturer]/[series]/[item]/page.tsx` |
| `/format/[slug]` | `apps/web/app/format/[slug]/page.tsx` |
| `/stunts` (index) | `apps/web/app/stunts/page.tsx` |
| `/stunts/sequences` | `apps/web/app/stunts/sequences/page.tsx` |
| `/stunts/lineage` | `apps/web/app/stunts/lineage/page.tsx` |
| `/stunts/people` | `apps/web/app/stunts/people/page.tsx` |
| `/stunts/companies/[slug]` | `apps/web/app/stunts/companies/[slug]/page.tsx` |
| `/stunts/schools/[slug]` | `apps/web/app/stunts/schools/[slug]/page.tsx` |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | `apps/web/app/stunts/sequences/[productionSlug]/[sequenceSlug]/page.tsx` |
| `/stunts/rigging/[slug]` | `apps/web/app/stunts/rigging/[slug]/page.tsx` |
| `/tools` (index) | `apps/web/app/tools/page.tsx` |
| `/gear/compare` | `apps/web/app/gear/compare/page.tsx` |
| `/films/compare` | `apps/web/app/films/compare/page.tsx` |
| `/films/[slug]/loadout` | `apps/web/app/films/[slug]/loadout/page.tsx` |
| `/references/[id]` | `apps/web/app/references/[id]/page.tsx` |

Pages like `/films/[slug]`, `/crew/[slug]`, `/vfx/[slug]`, `/walkthroughs/[slug]`, `/dossiers/[slug]` do set canonical correctly.

### P1-4 · console.error in production homepage server component

**Location:** `apps/web/app/page.tsx:79–80`

```
listRecentlyResolvedCorrections(db, 5).catch((e) => { console.error('[homepage] listRecentlyResolvedCorrections failed', e); return []; }),
listRecentCitations(db, 5).catch((e) => { console.error('[homepage] listRecentCitations failed', e); return []; }),
```

CLAUDE.md explicitly states: "Don't add console.log or console.error in production code paths — use Sentry." These two catch handlers fire on the server during every homepage render that hits a query failure, but the error is logged to stdout and not captured by Sentry. A query failure that silently swallows the homepage's "Archive this week" content would be invisible in error dashboards.

### P1-5 · Widespread console.warn in production routes instead of Sentry

**Location:** 30+ instances across route files.

The following route files use `console.warn()` in catch blocks for DB query failures rather than `Sentry.captureException`. This means silent failures (missing table, schema migration not applied, unexpected DB error) produce stdout logs on Vercel but no alerting.

Representative examples (not exhaustive):
- `apps/web/app/walkthroughs/[slug]/page.tsx:50`
- `apps/web/app/dossiers/[slug]/page.tsx:43`
- `apps/web/app/decisions/[slug]/page.tsx:41`
- `apps/web/app/costume-hair-makeup/effects-houses/page.tsx:24`
- `apps/web/app/costume-hair-makeup/effects-houses/[slug]/page.tsx:37`
- `apps/web/app/vfx/volumes/page.tsx:28`
- `apps/web/app/music/orchestras/page.tsx:24`
- `apps/web/app/partnerships/page.tsx:24`
- `apps/web/app/sound/houses/page.tsx:41`
- `apps/web/app/sound/effects/libraries/page.tsx:23`

Pattern: these routes use a defensive try/catch that swallows the exception and renders an empty state. The console.warn signals the problem to a developer reading logs but does not create a Sentry event. Many of these are specifically guarding against "missing table" during deploy windows, per comments in the code. The defensive guard is correct; the observation medium should be Sentry, not console.

### P1-6 · Empty alt text on content images throughout the app

**Location:** Multiple component files.

`alt=""` is appropriate for purely decorative images. The following instances use `alt=""` on images that carry content meaning — the film's visual identity, a production still, a crew headshot thumbnail, or a frame capture — and should carry descriptive alt text instead:

| File | Line(s) | Context |
|---|---|---|
| `apps/web/app/crew/[slug]/page.tsx` | 848 | Film poster thumbnail in "Known for" section — title is available in `k.title` |
| `apps/web/components/productions/ProductionDetail.tsx` | 888, 931, 979 | Production images rendered within the film detail page |
| `apps/web/components/productions/MediaGallery.tsx` | 34 | Gallery images (behind-the-scenes stills) |
| `apps/web/app/format/[slug]/page.tsx` | 96 | Format page production poster |
| `apps/web/app/vfx/[slug]/page.tsx` | 172 | Production poster in VFX house filmography |
| `apps/web/app/gear/[manufacturer]/[series]/page.tsx` | 268 | Film poster in series filmography |
| `apps/web/app/ask/page.tsx` | 254 | Result image |

Instances on admin pages and on the user-menu avatar (`UserMenu.tsx`) where `alt=""` is intentional (the adjacent text labels the element) are excluded.

### P1-7 · Crew page meta description has no length cap

**Location:** `apps/web/app/crew/[slug]/page.tsx:87`

```typescript
description: person.biography ?? undefined,
```

TMDb-imported biographies routinely run 300–500 characters. The crew page passes the raw biography directly to the meta description with no truncation. Film pages use `truncateForMeta(production.synopsis, 155)`. The inconsistency means many crew pages will have Google-truncated descriptions that cut mid-sentence, while the film pages are capped cleanly.

### P1-8 · Stale tools page meta description excludes Phase 4 tools

**Location:** `apps/web/app/tools/page.tsx:8`

```typescript
description: 'Pro-grade pre-production tools — sensor coverage checker, loadout calculator, frame-line overlay, ACES pipeline picker, ASC CDL parser.',
```

The page now lists 9 tools including 4 Phase 4 decision tools (scoring session cost, stunt rig picker, HDR target picker, anamorphic vs spherical matrix), but the meta description only enumerates the original 5. Search snippets and AI citation summaries will describe this page as if it only has 5 tools.

---

## P2 — Polish

### P2-1 · Title too short on several public index pages

Google's recommended title range is 30–60 characters (before the template suffix). The following pages fall well short:

| Route | Title as coded | Length |
|---|---|---|
| `/gear` | "Gear" | 4 chars |
| `/tools` | "Tools" | 5 chars |
| `/ask` | "Ask anything" | 12 chars |
| Crew detail | `person.display_name` (bare name) | varies; "Ed Catmull" = 10 |
| Gear item detail | `item.name` (bare item name) | varies; "ALEXA Mini LF" = 13 |

With the layout template suffix (`| CineCanon`), the rendered `<title>` becomes "Gear | CineCanon" (16 chars) — still short. These would benefit from a descriptive suffix on the page's own title string.

### P2-2 · Film title template can exceed 60 chars for long film titles

**Location:** `apps/web/app/films/[slug]/page.tsx:83`

```typescript
const titleWithYear = production.release_year
  ? `${production.title} (${production.release_year}) — Cameras, Lenses & Crew`
  : `${production.title} — Cameras, Lenses & Crew`;
```

For films with long titles, this exceeds the 60-char guideline. "Everything Everywhere All at Once (2022) — Cameras, Lenses & Crew" is 65 chars before the layout `| CineCanon` suffix is appended. Google will truncate in SERPs.

### P2-3 · Films listing page meta description is 163 chars (over 160 target)

**Location:** `apps/web/app/films/page.tsx:23`

```typescript
description: 'Browse cited, confidence-graded technical data for thousands of films — cameras, lenses, formats, aspect ratios, and crew, filterable by decade, genre, and studio.',
```

163 chars. The target range is 120–160. Remove "and studio" or shorten the phrasing to bring it under 160.

### P2-4 · Inconsistent canonical URL format (absolute vs. relative paths)

**Location:** Multiple files.

Most pages use short relative paths for canonical (`'/films'`, `'/crew/${slug}'`). Several newer pages use the full absolute URL via `siteUrl()`:

- `apps/web/app/walkthroughs/[slug]/page.tsx` — uses `${siteUrl()}/walkthroughs/${slug}`
- `apps/web/app/dossiers/[slug]/page.tsx` — uses `${siteUrl()}/dossiers/${slug}`
- `apps/web/app/gear/rentals/page.tsx` — uses `${siteUrl()}/gear/rentals`
- Several tools pages — use `${siteUrl()}/tools/...`

Next.js resolves both correctly against `metadataBase`, so there is no functional impact. However, the inconsistency is a maintenance hazard: if `siteUrl()` ever returns an environment-specific URL during a staging build, the absolute-URL canonicals would point at staging from a production page.

### P2-5 · `/societies` page absent from sitemap and footer nav

**Location:** `apps/web/app/societies/page.tsx` (has metadata + canonical), `apps/web/components/nav/Footer.tsx`.

The societies index page exists and sets its canonical, but is not listed in any sitemap segment and has no footer or top-nav link. It is only reachable via internal links from entity pages that have a `member_societies` field populated. This limits both crawlability and user discoverability.

### P2-6 · `/references/[id]` missing canonical

**Location:** `apps/web/app/references/[id]/page.tsx`.

The `/references` index page correctly sets `alternates.canonical`. Individual reference detail pages (`/references/123`, etc.) have `generateMetadata` but no `alternates.canonical` is set. These pages could receive parameterized links from multiple sources, making a canonical signal more important.

### P2-7 · `art=""` on BrandLogo in empty-state renders

**Location:** `apps/web/components/ui/BrandLogo.tsx:78`

```tsx
alt=""
```

The BrandLogo component renders `alt=""`. When used as the primary visual element in an error or empty-state page (e.g., the 404 page uses `<CineCanonMark>`), the mark is the only image; screen readers skip it silently. The 404 page (`app/not-found.tsx`) uses `CineCanonMark`, not `BrandLogo`, so this instance may be in a context where the surrounding text labels the element. Worth auditing call sites.

### P2-8 · `digest.xml` linked in footer but Content-Type may surprise feed readers

**Location:** `apps/web/app/digest.xml/route.ts` (header).

The Atom feed at `/digest.xml` is linked in the footer with `type="application/atom+xml"` on the anchor. The route itself sets the correct `Content-Type`. However, the `link rel="alternate"` autodiscovery in the root layout (`apps/web/app/layout.tsx:37-41`) points to `/digest.xml`. If the feed URL ever returns a redirect, the autodiscovery header would not follow it. No structural defect, but worth noting for feed-reader compatibility.

### P2-9 · `/for-*` landing pages have no OG image beyond the site default

**Location:** All 12 pages under `/for-dps`, `/for-gaffers`, etc.

These pages set metadata including title and description, and have canonical URLs. None have a dedicated `opengraph-image.tsx` file, so they all inherit the generic site-level OG card from `apps/web/app/opengraph-image.tsx`. When shared on LinkedIn or Slack by a DP who found their role-specific page useful, the card shows the generic "Cinematic technical reference" text rather than anything role-specific. Low-priority for the current audience, but notable for social reach.

---

## Appendix — Route × Status Table

Live HTTP status codes could not be collected (egress proxy blocked). The table below is sourced from static code analysis. "Sitemap" = present in at least one of the five sitemap segments.

| Route pattern | Sitemap | Canonical set | OG tags | Meta desc |
|---|---|---|---|---|
| `/` | yes (core) | yes | yes | yes |
| `/films` | yes (core) | yes | no explicit image | yes (163 chars — over limit) |
| `/films/[slug]` | yes (films) | yes | yes | yes (capped at 155) |
| `/films/[slug]/loadout` | no | no | no | no |
| `/films/[slug]/scenes/[sceneSlug]` | no | no | no | no |
| `/films/compare` | no | no | no | no |
| `/crew` | yes (core) | yes | no explicit image | yes |
| `/crew/[slug]` | yes (crew) | yes | yes (opengraph-image.tsx) | yes (uncapped — P1-7) |
| `/gear` | yes (core) | no | no | yes |
| `/gear/[manufacturer]` | yes (gear) | no | no | partial |
| `/gear/[manufacturer]/[series]` | yes (gear) | no | no | partial |
| `/gear/[manufacturer]/[series]/[item]` | yes (gear) | no | no | partial |
| `/gear/compare` | no | no | no | no |
| `/gear/rentals` | no | yes | no | partial |
| `/gear/rentals/[slug]` | no | yes | no | partial |
| `/equipment/specs` | no | yes | no | yes |
| `/vfx` | yes (core) | yes | no | yes |
| `/vfx/[slug]` | yes (vfx) | yes | yes | yes |
| `/vfx/volumes` | no | yes | no | yes |
| `/vfx/volumes/[slug]` | no | yes | no | yes |
| `/vfx/title-houses` | no | yes | no | yes |
| `/vfx/title-houses/[slug]` | no | yes | no | yes |
| `/vfx/shot-breakdowns` | no | yes | no | yes |
| `/stunts` | yes (core) | no | no | yes |
| `/stunts/people` | yes (core) | no | no | yes |
| `/stunts/sequences` | yes (core) | no | no | yes |
| `/stunts/lineage` | yes (core) | no | no | yes |
| `/stunts/rigging` | yes (core) | yes | no | yes |
| `/stunts/safety` | yes (core) | yes | no | yes |
| `/stunts/companies` | no | yes | no | yes |
| `/stunts/companies/[slug]` | no | no | no | yes |
| `/stunts/schools/[slug]` | no | no | no | yes |
| `/stunts/rigging/[slug]` | no | no | no | yes |
| `/stunts/safety/[slug]` | no | yes | no | yes |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | no | no | no | yes |
| `/format` | yes (core) | yes | no | yes |
| `/format/[slug]` | yes (core) | no | yes | yes |
| `/music` | no | yes | no | yes |
| `/music/composers` | no | yes | no | yes |
| `/music/scoring-stages` | no | yes | no | yes |
| `/music/scoring-stages/[slug]` | no | yes | no | yes |
| `/music/orchestras` | no | yes | no | yes |
| `/music/orchestras/[slug]` | no | yes | no | yes |
| `/music/supervisors` | no | yes | no | yes |
| `/music/supervision-agencies` | no | yes | no | yes |
| `/music/supervision-agencies/[slug]` | no | yes | no | yes |
| `/music/scores/[productionSlug]` | no | no | no | yes |
| `/music/cues/[productionSlug]/[cueSlug]` | no | no | no | yes |
| `/music/cue-guides` | no | yes | no | yes |
| `/sound` | no | yes | no | yes |
| `/sound/designers` | no | yes | no | yes |
| `/sound/mixers` | no | yes | no | yes |
| `/sound/houses` | no | yes | no | yes |
| `/sound/houses/[slug]` | no | yes | no | yes |
| `/sound/post` | no | yes | no | yes |
| `/sound/effects` | no | yes | no | yes |
| `/sound/effects/libraries` | no | yes | no | yes |
| `/sound/effects/libraries/[slug]` | no | yes | no | yes |
| `/sound/foley` | no | yes | no | yes |
| `/sound/adr-studios` | no | yes | no | yes |
| `/sound/adr-studios/[slug]` | no | yes | no | yes |
| `/editing` | no | yes | no | yes |
| `/editing/editors` | no | yes | no | yes |
| `/editing/walkthroughs` | no | yes | no | yes |
| `/production-design` | no | yes | no | yes |
| `/production-design/designers` | no | yes | no | yes |
| `/production-design/works` | no | yes | no | yes |
| `/costume-hair-makeup` | no | yes | no | yes |
| `/costume-hair-makeup/designers` | no | yes | no | yes |
| `/costume-hair-makeup/costume-works` | no | yes | no | yes |
| `/costume-hair-makeup/makeup-works` | no | yes | no | yes |
| `/costume-hair-makeup/effects-houses` | no | yes | no | yes |
| `/costume-hair-makeup/effects-houses/[slug]` | no | yes | no | yes |
| `/costume-hair-makeup/construction-houses` | no | yes | no | yes |
| `/costume-hair-makeup/construction-houses/[slug]` | no | yes | no | yes |
| `/awards` | no | yes | no | yes |
| `/awards/cinematography` | no | yes | no | yes |
| `/awards/craft/[craft]` | no | yes | no | yes |
| `/walkthroughs` | no | yes | no | yes |
| `/walkthroughs/[slug]` | no | yes (absolute) | no | yes |
| `/dossiers` | no | yes | no | yes |
| `/dossiers/[slug]` | no | yes (absolute) | no | yes |
| `/decisions` | no | yes | no | yes |
| `/decisions/[slug]` | no | yes (absolute) | no | yes |
| `/partnerships` | no | yes | no | yes |
| `/partnerships/[slug]` | no | yes | no | yes |
| `/societies` | no | yes | no | yes |
| `/societies/[slug]` | no | yes | no | yes |
| `/references` | no | yes | no | yes |
| `/references/[id]` | no | no | no | yes |
| `/locations` | no | yes | no | yes |
| `/locations/[id]` | no | yes | no | yes |
| `/decades` | no | yes | no | yes |
| `/decades/[decade]` | no | yes | no | yes |
| `/shots` | no | yes | no | yes |
| `/lookbook` | no | yes | no | yes |
| `/queries` | no | yes | no | yes |
| `/queries/alexa65-sphero` | yes (core) | yes | no | yes |
| `/queries/dune-part-two-lenses` | yes (core) | yes | no | yes |
| `/queries/magic-hour-2023` | yes (core) | yes | no | yes |
| `/ask` | yes (core) | no | no | yes |
| `/search` | no | no | no | yes |
| `/tools` | yes (core) | no | no | yes (stale — P1-8) |
| `/tools/frame-lines` | yes (core) | yes | no | yes |
| `/tools/loadout` | yes (core) | yes | no | yes |
| `/tools/coverage` | yes (core) | yes | no | yes |
| `/tools/aces` | yes (core) | yes | no | yes |
| `/tools/cdl` | yes (core) | yes | no | yes |
| `/tools/scoring-session-cost` | no | yes | no | yes |
| `/tools/stunt-rig-picker` | no | yes | no | yes |
| `/tools/hdr-target-picker` | no | yes | no | yes |
| `/tools/anamorphic-vs-spherical` | no | yes | no | yes |
| `/for-dps` | no | yes | no | yes |
| `/for-colorists` | no | yes | no | yes |
| `/for-gaffers` | no | yes | no | yes |
| `/for-coordinators` | no | yes | no | yes |
| `/for-editors` | no | yes | no | yes |
| `/for-sound-mixers` | no | yes | no | yes |
| `/for-sound-designers` | no | yes | no | yes |
| `/for-composers` | no | yes | no | yes |
| `/for-music-supervisors` | no | yes | no | yes |
| `/for-production-designers` | no | yes | no | yes |
| `/for-costume-designers` | no | yes | no | yes |
| `/for-makeup-artists` | no | yes | no | yes |
| `/about` | no | yes | no | yes |
| `/methodology` | no | no | no | no |
| `/claims/[id]` | no | no | no | no |
| `/bookmarks` | no | no | no | no |
| `/signin` | no | no | no | no |
| `/import/letterboxd` | no | no | no | no |
| `/robots.txt` | — | — | — | — |
| `/sitemap.xml` | — | — | — | — |
| `/llms.txt` | — | — | — | — |
| `/digest.xml` | — | — | — | — |
| `/api/v1` | — | — | — | — |

**Infrastructure / meta-routes (confirmed present in code):**
- `/robots.txt` — Disallows `/admin/`, links to `/sitemap.xml` + `host`. Correct.
- `/sitemap.xml` — Returns sitemap index pointing at 5 segment sitemaps. Correct format.
- `/llms.txt` — Dynamic, DB-backed. Correct format per llmstxt.org spec.
- `/digest.xml` — Atom 1.0 feed. Correctly implemented.
- `/oembed` — Route exists at `apps/web/app/oembed/route.ts`.

---

## What I'd Fix First

The highest-leverage single action is to verify whether the 1,702 broken backdrop images (P0-1) from the May 2026 crawl are still failing in production, and if so, fix the `/_next/image` width parameter or the `next.config` `remotePatterns` so those film detail page backgrounds render again. Every curated film page that shows a broken backdrop frame erodes trust in the "cited, confidence-graded" brand promise — a user who sees a broken image immediately doubts the quality of the data behind it. After that, the sitemap gap (P1-2) deserves a focused session: adding the 40+ missing route groups (especially music, sound, editing, production-design, costume-hair-makeup, awards, walkthroughs, dossiers, decisions, partnerships, and all "for-[role]" pages) to the sitemap and appending the four new Phase 4 tools (P1-1) would cost one focused afternoon and substantially improve search engine crawl coverage of the site's newest content. The canonical URL gaps on gear and format pages (P1-3) should follow, since those pages are already in the sitemap — adding the canonical line is a one-liner per page. The console.error/warn issues (P1-4, P1-5) should be converted to Sentry calls in a single sweep to bring error observability in line with CLAUDE.md conventions.
