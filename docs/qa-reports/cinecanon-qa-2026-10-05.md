# CineCanon QA Sweep — 2026-10-05

**Scope:** Static code analysis of `/home/user/bts` (branch `master`). Live network access to `https://cinecanon.com` was blocked by the session's egress proxy (HTTP 403 on CONNECT). All findings are derived from repository code. HTTP status codes, rendered HTML, actual image availability, and real page weights could not be verified against the live environment.

---

## Summary

133 public page routes inspected across the Next.js App Router tree. 3 are pure redirect helpers (no metadata needed). Of the remaining 130, all have metadata defined. The most material defects are a sitemap that is substantially incomplete — more than 20 major section and sub-section URLs are missing from all five sitemap shards — and several user-visible placeholder strings that remain live in production-routed code. Console error/warn calls are widespread in server components in violation of the project's Sentry-first convention. Title and description lengths are non-conformant on a significant share of section index pages.

Total defects by severity: **P0 — 0 | P1 — 8 | P2 — 19 | P3 — 9**

---

## P0 — Broken

No P0 defects identified. All 133 public routes resolve to a page component. Error boundaries are properly scoped, and the root error.tsx correctly gates raw error details to development only.

---

## P1 — Degraded

### P1-1: User-visible implementation detail on `/decisions`

**File:** `apps/web/app/decisions/page.tsx` line 57

The empty-state fallback reads:

> "Decision trees coming online — table not yet migrated on this environment."

The condition is `trees.length === 0`, not the `catch` branch alone. This string will render in production any time the `craft_decision_trees` table (migration `0087`) exists but contains no rows — which is the expected state if seeding has not been run. The phrase "on this environment" leaks an internal deployment concept to the public. The message should distinguish between a DB error and an intentionally empty table.

---

### P1-2: "Upload coming soon" banner live on `/lookbook`

**File:** `apps/web/app/lookbook/page.tsx` line 18

The `PageHero` component is rendered with `eyebrow="Visual search · upload coming soon"`. The route is publicly accessible, linked from `/shots`, and indexed by robots (no `noindex` is set). The page explains that the upload feature is "in development." This is an unfulfilled promise on an indexed page that serves no working functionality beyond linking back to `/shots`.

---

### P1-3: Hard placeholder box on `/stunts/schools/[slug]` pages

**File:** `apps/web/app/stunts/schools/[slug]/page.tsx` lines 149–161

A dashed-border box is unconditionally rendered on every stunt school detail page with the text:

> "Alumni mapping coming with phase 2."

This is inside a `<section>` with a "Notable alumni" heading, making it look like intentional content rather than a development placeholder. Every visitor to any stunt school detail page sees this.

---

### P1-4: 20+ major sections absent from all sitemaps

**Files:** `apps/web/app/sitemap-core.xml/route.ts` and `sitemap-{films,crew,gear,vfx}.xml/route.ts`

The following public section pages have metadata, are not noindex, and are linked from the global footer and/or nav, but are absent from every sitemap shard:

- `/sound` and all sub-sections (`/sound/post`, `/sound/effects`, `/sound/foley`, `/sound/adr-studios`, `/sound/effects/libraries`, `/sound/houses`, `/sound/mixers`, `/sound/designers`)
- `/music` and all sub-sections (`/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`)
- `/awards`
- `/walkthroughs`
- `/decisions`
- `/partnerships`
- `/dossiers`
- `/editing` and sub-sections (`/editing/editors`, `/editing/walkthroughs`)
- `/production-design` and sub-sections
- `/costume-hair-makeup` and sub-sections
- `/references`
- `/shots`
- `/decades`
- `/locations`
- `/societies`
- `/methodology`
- `/about`
- All 12 `/for-*` role landing pages

The sitemap index correctly points to five shards, but those shards collectively cover only the home page, films, crew, gear, VFX, stunts, format, ask, tools (partial), and three killer queries. The majority of the site's editorial depth is invisible to Googlebot and AI crawlers.

---

### P1-5: Phase 4 tools absent from sitemap

**File:** `apps/web/app/sitemap-core.xml/route.ts`

Per `CLAUDE.md` "In flight," four tools shipped in Phase 4 and are accessible:

- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

None appear in `sitemap-core.xml`. The older tools (`/tools/frame-lines`, `/tools/loadout`, `/tools/coverage`, `/tools/aces`, `/tools/cdl`) are listed but the Phase 4 additions were not added.

---

### P1-6: 36 console.warn/error calls in non-admin production server code

**Pattern:** Found across `apps/web/app/**/*.tsx` and `apps/web/app/api/**/*.ts`

`CLAUDE.md` explicitly prohibits `console.log` and `console.error` in production code paths, directing errors to Sentry. There are 36 calls in non-admin server components:

- Homepage (`app/page.tsx`): `console.error` in two `.catch()` handlers for `listRecentlyResolvedCorrections` and `listRecentCitations`
- API route (`app/api/search/nl/route.ts`): `console.error` for theme-embed fallback
- At least 25 additional `console.warn` calls in pages for sound, VFX, music, costume, partnerships, gear rentals, dossiers, editing, and production design sections

These calls swallow errors into server logs rather than surfacing them to Sentry with structured context. Errors in `listRecentlyResolvedCorrections` or `listRecentCitations` on the homepage would silently degrade without an alert.

---

### P1-7: `music/scores` and `music/cues` routes absent from all sitemaps

**Files:** `apps/web/app/music/scores/[productionSlug]/page.tsx`, `apps/web/app/music/cues/[productionSlug]/[cueSlug]/page.tsx`

Both routes are linked from `ProductionDetail.tsx`, crew pages, and each other. Both have canonical URLs and proper metadata with JSON-LD. Neither is in any sitemap shard. These are high-value editorial pages (score deep-dives, cue-level listening guides) that are crawl-invisible.

---

### P1-8: Misleading empty-state copy in `EvidenceGallery` — empty alt on primary evidence images

**File:** `apps/web/components/ui/EvidenceGallery.tsx` line 29

Evidence images are the primary BTS visual proof for technical claims (the thing that earns CineCanon's editorial credibility). They are rendered as clickable `<img>` elements with `alt=""`. Because these are content images, not decorative ones, the WCAG 2.2 AA standard requires descriptive alt text. A screen-reader user navigating a film's claim citations will encounter unlabeled links with no context.

Similarly, `MediaGallery.tsx` renders TMDb backdrop images with `alt=""` in an `<Image>` element — these are film scene stills displayed in a scrollable gallery and are content images.

---

## P2 — Moderate

### P2-1: 31 public pages missing `canonical` in metadata

Pages with `generateMetadata` or `export const metadata` but no `alternates.canonical` (excluding intentional noindex/redirect pages):

`/stunts`, `/stunts/lineage`, `/stunts/sequences`, `/stunts/people`, `/stunts/companies/[slug]`, `/stunts/schools/[slug]`, `/stunts/sequences/[productionSlug]/[sequenceSlug]`, `/stunts/rigging/[slug]`, `/format`, `/format/[slug]`, `/ask`, `/search`, `/account`, `/bookmarks`, `/gear`, `/gear/[manufacturer]`, `/gear/[manufacturer]/[series]`, `/gear/[manufacturer]/[series]/[item]`, `/gear/compare`, `/crew/compare`, `/films/compare`, `/films/[slug]/scenes/[sceneSlug]`, `/societies`, `/signin`, `/tools/cdl`, `/tools/frame-lines`, `/tools`, `/tools/coverage`, `/import/letterboxd`.

Without a canonical tag, Google may deduplicate paginated or query-string variants against these base URLs incorrectly.

---

### P2-2: Multiple page titles too short for SEO (under 30 chars with template suffix)

The root layout uses the template `'%s | CineCanon'` (12 char suffix). Several section titles produce effective titles well below the recommended 30-char floor:

| Page | Title alone | With suffix |
|---|---|---|
| `/gear` | "Gear" | 16 chars |
| `/tools` | "Tools" | 17 chars |
| `/sound` | "Sound" | 17 chars |
| `/music` | "Music" | 17 chars |
| `/stunts` | "Stunts" | 18 chars |
| `/awards` | "Awards" | 18 chars |
| `/editing` | "Editing" | 19 chars |
| `/signin` | "Sign in" | 19 chars |
| `/account` | "Account" | 19 chars |

Short titles have lower click-through rates in SERPs and give AI crawlers less signal about page scope.

---

### P2-3: Four page titles exceed 60 chars

| Page | Effective title length |
|---|---|
| `/methodology` | 61 chars |
| `/vfx` | 66 chars |
| `/about` | 66 chars |
| `/queries/alexa65-sphero` | 66 chars |

Google displays approximately 60 chars; longer titles are truncated unpredictably.

---

### P2-4: Root layout default description is 161 chars (1 over limit)

**File:** `apps/web/app/layout.tsx` line 20

```
'Cited, confidence-graded technical data on every film — cameras, lenses, lighting, color, sound, music, stunts, and VFX — for working camera-department pros.'
```

161 characters. The target ceiling is 160. Google truncates at 155–160 depending on pixel width. Trim by 5–10 characters.

---

### P2-5: Films page description is 165 chars

**File:** `apps/web/app/films/page.tsx` line 23

```
'Browse cited, confidence-graded technical data for thousands of films — cameras, lenses, formats, aspect ratios, and crew, filterable by decade, genre, and studio.'
```

165 characters. Recommended ceiling is 160.

---

### P2-6: Several descriptions below 120-char recommended floor

| Page | Description length |
|---|---|
| `/editing` | 90 chars |
| `/editing/walkthroughs` | 109 chars |
| `/editing/editors` | 107 chars |
| `/films/compare` | 45 chars |
| `/gear/compare` | 46 chars |

Short descriptions are often replaced by Google with auto-extracted body text, reducing control over SERP snippets.

---

### P2-7: 18 empty `alt=""` instances on images in non-admin pages

7 in page components, 11 in shared components. Key offenders:

- `components/productions/MediaGallery.tsx`: Backdrop stills in a horizontal scroll gallery — these are content images describing the film's visual style.
- `components/ui/EvidenceGallery.tsx`: BTS evidence images (also noted under P1-8).
- `app/vfx/[slug]/page.tsx`, `app/format/[slug]/page.tsx`, `app/gear/[manufacturer]/[series]/page.tsx`, `app/crew/[slug]/page.tsx`: Small poster thumbnails in filmography listings (arguably decorative, but production title is available and should be used as fallback).

Genuinely decorative: `UserMenu.tsx` (OAuth avatar), `BrandLogo.tsx` (brand mark icon), `app/account/page.tsx` (profile photo). These are correctly `alt=""`.

---

### P2-8: `tools/page.tsx` exposes internal dev-phase language to users

**File:** `apps/web/app/tools/page.tsx`

The `PageHero` description renders:

> "Capability flags below: amber = supported, zinc = not yet."

The word "zinc" refers to a Tailwind colour class name — it's a CSS variable name leaking into user-visible copy. Users unfamiliar with Tailwind see "zinc = not yet" rather than something like "grey = coming soon."

---

### P2-9: Homepage music tile says "listening guides coming online"

**File:** `apps/web/app/page.tsx` line 497

The music depth tile on the homepage ends with "Score deep-dives and curated cue-level listening guides coming online." This is forward-looking copy implying the feature is not yet live. If `/music/scores` and `/music/cues` routes are populated, this copy should be updated to reflect current status.

---

### P2-10: `/decisions` fallback text uses incorrect diagnostic language

Detailed in P1-1. The secondary severity here is the UX framing: a user at `/decisions` who sees "table not yet migrated on this environment" will likely assume the site is broken rather than that there is simply no data yet. The fallback for `trees.length === 0` should be user-facing copy ("No decision trees published yet"), and the catch error path should log to Sentry and show a generic error.

---

### P2-11: `stunts/coordinators` redirect burns a guaranteed 307 for AI crawlers

**File:** `apps/web/app/stunts/coordinators/page.tsx`

This is already noted in `QA P1-6 2026-05-20` comments in the code. The route exists and does a server-side `redirect('/stunts/people')`. The comment acknowledges that `llms.txt` references `/stunts/coordinators`, and AI crawlers dereference it, incurring a round-trip. `llms.txt` should be updated to point directly to `/stunts/people` to eliminate this.

---

### P2-12: `awards/cinematography` redirect is not in llms.txt

**File:** `apps/web/app/awards/cinematography/page.tsx`

Redirects to `/awards/craft/cinematography`. Similar to P2-11: the redirect target is not referenced in `llms.txt`. No direct harm today, but if the redirect pattern replicates for other crafts, crawl budget waste accumulates.

---

### P2-13: Films page description duplicated with slight variation between canonical and paginated route

**File:** `apps/web/app/films/page.tsx` lines 23 and 121

The base metadata has a 165-char description. When pagination params are present, the alternate description is:

> 'Browse cited, confidence-graded technical data for thousands of films.' (71 chars)

This is well below 120 chars.

---

### P2-14: `content-security-policy` header absent

**File:** `apps/web/next.config.mjs`

The `headers()` function adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. A `Content-Security-Policy` header is not set. Vercel sets HSTS automatically. CSP is the principal remaining missing security header for a Lighthouse Best-Practices 100 score and for mitigating XSS attack surface.

---

### P2-15: `lookbook` has no noindex set and no canonical

**File:** `apps/web/app/lookbook/page.tsx`

The lookbook page (`/lookbook`) advertises an unfinished feature (P1-2). It has `revalidate = 86400` and a metadata title/description, and it is linked from the `/shots` page. It does not set `robots: { index: false }`. A page that cannot deliver its core promise (image upload and similarity search) should be noindexed until the feature ships.

---

### P2-16: `images.remotePatterns` includes `cdn.cinecanon.com` (future CDN not yet live)

**File:** `apps/web/next.config.mjs` line 36

`{ protocol: 'https', hostname: 'cdn.cinecanon.com' }` is in the allowed remote patterns. If any image URL stored in the DB uses this hostname before the CDN is stood up, Next.js will attempt to optimize it and receive a connection error, resulting in a broken image. Low risk today, but the comment "CineCanon own CDN (future)" confirms it is aspirational.

---

### P2-17: `stunts/schools/[slug]` shows alumni placeholder on all school pages

Detailed in P1-3. The additional P2-level observation: the section header "Notable alumni" is rendered even when the list is empty, creating a heading that leads nowhere except the placeholder dashed box. Screen readers will announce a heading with no meaningful content following it.

---

### P2-18: `music/supervision-agencies` route exists but is not linked from footer

The footer links `/music/supervisors` (people). A separate route `/music/supervision-agencies` and `/music/supervision-agencies/[slug]` exists for agencies as companies. This surface is not referenced in the footer "Sections" column, creating an unreachable section for visitors navigating from the footer.

---

### P2-19: `costume-hair-makeup/construction-houses` route not in footer

**File:** `apps/web/components/nav/Footer.tsx`

The footer lists `effects-houses` under costume/hair/makeup but omits `construction-houses`. The route (`/costume-hair-makeup/construction-houses`) and its detail pages (`/costume-hair-makeup/construction-houses/[slug]`) exist with proper metadata. They are orphaned from the main navigation.

---

## P3 — Low / Cosmetic

1. **"zinc = not yet" user-visible text** in `tools/page.tsx` description (also noted P2-8) — the deeper fix is renaming the description, the cosmetic fix is replacing "zinc" with "grey."
2. **"listening guides coming online"** copy on homepage music tile — needs to be removed or updated once `/music/scores` data is confirmed live.
3. **`/import/letterboxd` missing canonical** — utility page; low SEO impact.
4. **`/signin` missing canonical** — auth page; Google should not index it, so the omission is low harm. Adding `robots: { index: false }` would be cleaner than relying on lack of canonical.
5. **`/bookmarks` missing canonical** — private user page; same as signin.
6. **`/account` missing canonical** — private user page; same treatment.
7. **`/search` missing canonical** — search pages are typically noindexed; adding explicit `robots: { index: false }` would be cleaner.
8. **Stunt schools "Alumni" section heading rendered with only a placeholder box** — cosmetic UX issue (also P2-17 a11y aspect).
9. **Homepage `console.error` in `.catch()` handlers** rather than Sentry calls — technically P1-6, but the homepage ones are especially visible since the homepage is the highest-traffic route.

---

## Checked and OK

- **TMDb attribution** is present in the global footer on every page: "Movie metadata courtesy of TMDb — this product uses the TMDb API but is not endorsed or certified by TMDb."
- **OG image** is implemented at root level (`app/opengraph-image.tsx`) and per-film (`films/[slug]/opengraph-image.tsx`) and per-crew (`crew/[slug]/opengraph-image.tsx`). All detail pages inherit the root OG image.
- **`/robots.txt`** is present, correctly allows `/`, explicitly disallows `/admin/`, and references the sitemap.
- **`/sitemap.xml`** is present as a sitemap index pointing to five segment shards.
- **`/llms.txt`** is dynamically generated and comprehensive; it covers index pages, role pages, tools, queries, confidence rubric, glossary, and licensing.
- **Error boundaries** correctly implemented at root, films, VFX, stunts, and admin scopes. Raw `error.message` is gated to development only; production shows opaque digest only.
- **No "Something went wrong" hardcoded** outside error boundary components.
- **JSON-LD** is centralized in `lib/jsonLd.tsx`; no hand-rolled structured data found in page components.
- **Skip-to-content link** present on every page (`<a href="#main-content">`).
- **Security headers** configured: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **3 pages without metadata** (`/stunts/coordinators`, `/claims/[id]`, `/awards/cinematography`) are all pure redirect helpers; metadata is correctly omitted.
- **Hydration warning suppression** applied to `<html>` and `<body>` for browser-extension compatibility.
- **`generateStaticParams`** correctly limited to the curated tier to avoid build-time DB pool exhaustion.
- **130/133 public pages** have metadata defined.
- **Loadout pages** (`/films/[slug]/loadout`) are correctly set to `robots: { index: false, follow: false }` — print-only utility pages that should not be indexed.
- **`/stunts/coordinators`** 307-redirects to `/stunts/people` — the redirect itself is correct. The only issue is the `llms.txt` still references the old path (P2-11).

---

## Appendix — URL Status Table

Live HTTP status could not be verified (egress proxy blocks `cinecanon.com`). The following table reflects code-derived route status.

| URL | Code Status | Notes |
|---|---|---|
| `/` | 200 (inferred) | Homepage, metadata OK |
| `/films` | 200 | Metadata OK, description 165 chars |
| `/films/[slug]` | 200/404 | `notFound()` when slug missing |
| `/films/[slug]/loadout` | 200/404 | noindex intentionally |
| `/films/[slug]/scenes/[sceneSlug]` | 200/404 | Missing canonical |
| `/films/compare` | 200 | Missing canonical |
| `/crew` | 200 | Metadata OK |
| `/crew/[slug]` | 200/404 | noindex for thin content |
| `/crew/compare` | 200 | Missing canonical |
| `/awards` | 200 | Title "Awards" = 18 chars |
| `/awards/cinematography` | 307 → `/awards/craft/cinematography` | Redirect helper |
| `/gear` | 200 | Title "Gear" = 16 chars |
| `/gear/[manufacturer]` | 200 | Missing canonical |
| `/gear/[manufacturer]/[series]` | 200 | Missing canonical |
| `/gear/[manufacturer]/[series]/[item]` | 200 | Missing canonical |
| `/gear/compare` | 200 | Missing canonical |
| `/vfx` | 200 | Title 66 chars |
| `/stunts` | 200 | Missing canonical |
| `/stunts/coordinators` | 307 → `/stunts/people` | Redirect helper |
| `/sound` | 200 | Not in any sitemap |
| `/music` | 200 | Not in any sitemap |
| `/decisions` | 200 | P1-1 fallback text |
| `/walkthroughs` | 200 | Not in any sitemap |
| `/lookbook` | 200 | P1-2 "coming soon" page |
| `/tools` | 200 | Title "Tools" = 17 chars |
| `/tools/scoring-session-cost` | 200 | Not in sitemap |
| `/tools/stunt-rig-picker` | 200 | Not in sitemap |
| `/tools/hdr-target-picker` | 200 | Not in sitemap |
| `/tools/anamorphic-vs-spherical` | 200 | Not in sitemap |
| `/about` | 200 | Title 66 chars, not in sitemap |
| `/methodology` | 200 | Title 61 chars |
| `/stunts/schools/[slug]` | 200 | Alumni placeholder (P1-3) |
| `/claims/[id]` | 307 → entity page | Redirect helper, no metadata needed |

---

## What I'd Fix First

The single highest-leverage fix is the sitemap gap (P1-4). More than 20 section pages — representing the majority of the site's editorial depth in sound, music, awards, costume, editing, production design, and the new Phase 4 tools — are invisible to Googlebot and AI crawlers. CineCanon's defensible moat is citation-graded technical data, but that data cannot be cited if it is not crawled. Adding a `sitemap-editorial.xml` shard that covers `/sound`, `/music`, `/awards`, `/walkthroughs`, `/decisions`, `/dossiers`, `/editing`, `/production-design`, `/costume-hair-makeup`, `/references`, `/methodology`, `/about`, and the twelve `/for-*` landing pages, then registering it in `sitemap.xml/route.ts`, would materially improve both SEO and GEO coverage with one file change. Immediately after that, replace the three user-visible placeholder strings (P1-1, P1-2, P1-3) with honest empty states, and wire the homepage's two `.catch()` handlers and the API route's `console.error` through `Sentry.captureException` so monitoring actually catches degraded renders.
