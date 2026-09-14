# CineCanon QA Sweep — 2026-09-14

**Scope:** Live production site `https://cinecanon.com`. Source repository audited at `/home/user/bts`, branch `master`.  
**Method:** Network egress to cinecanon.com is blocked in this environment. Audit conducted by static analysis of the Next.js App Router source tree, cross-referenced against the prior crawl reports (2026-05-20, 2026-05-21) and the git commit log since those sweeps.  
**Pages analysed:** 133 `page.tsx` files (excluding `/admin`), all sitemap routes, all component files. Routes confirmed via directory structure and git history.

---

## Summary

| Category | Count |
|---|---|
| Routes audited (non-admin page.tsx) | 133 |
| Sitemaps confirmed existing | 6 (index + films + crew + gear + vfx + core) |
| **P0 — Broken** | **1** |
| **P1 — Degraded** | **5** |
| **P2 — Polish** | **4** |

### Fixes confirmed since 2026-05-20 sweep
The following issues from the prior reports are resolved in the current codebase:

- P0-1/P0-2: `/dossiers` and `/walkthroughs` index pages now exist (page.tsx files present).
- P0-3/P0-4: `/sound/mixers` and `/sound/designers` routes now exist.
- P0-5: `/api/v1/aeo/digest.xml` exists; `llms.txt` now links the correct `.xml` URL.
- P1-1: `ProductionCard.tsx` now emits `alt="${title} (${year}) poster"` — no longer empty.
- P1-2: Homepage metadata now includes `alternates: { canonical: '/' }`.
- P1-3: `generateMetadata` for film pages calls `truncateForMeta(production.synopsis, 155)` — descriptions are capped at 155 chars.
- P1-4: `sitemap-films.xml` deduplicates slugs before emitting `<loc>` entries.
- P1-6: `/stunts/coordinators` redirects to `/stunts/people`; `/awards/cinematography` redirects to `/awards/craft/cinematography`; `/stunts/companies` index page now exists.

---

## P0 — Broken

### P0-1 — Organization JSON-LD logo 404

**File:** `apps/web/app/page.tsx` line 133  
**Introduced:** commit `56ed559` ("SEO/AEO/GEO: enrich Organization schema")

The homepage `WebSite` / `Organization` JSON-LD block references:

```
logo: siteUrl() + '/icon-512.png'
```

The file `public/icon-512.png` does not exist in the repository and has never been committed (confirmed via `git log --full-history -- apps/web/public/icon-512.png`). The only icon assets present are `app/icon.svg` (SVG favicon, served dynamically) and `app/apple-icon.tsx` (180×180 edge-rendered PNG at `/apple-icon`). There is no 512×512 PNG at `/icon-512.png`.

**Effect:** Every Google, Bing, and AI-engine fetch of `https://cinecanon.com/icon-512.png` returns 404. Schema.org validators and Google's Knowledge Graph entity resolution treat a broken logo URL as an invalid Organization node — blocking Google's entity card enrichment, which is directly counter to the AEO goal of commit `56ed559`. Perplexity, ChatGPT, and Gemini crawlers that resolve logo URLs will log an error.

**Fix:** Either add `public/icon-512.png` (generate it from the SVG at build time, or place a static PNG), or change the logo reference to `/icon.svg` (which does exist) or `/apple-icon` (which the edge runtime renders at 180×180).

---

## P1 — Degraded

### P1-1 — 27 public routes absent from all sitemaps

`sitemap-core.xml`, `sitemap-films.xml`, `sitemap-crew.xml`, `sitemap-gear.xml`, and `sitemap-vfx.xml` collectively omit 27 indexable public routes. None of these routes appear in any of the six sitemaps.

**Phase 4 decision-support tools (4 routes — shipped per CLAUDE.md "In flight" note but never added to sitemap):**

| Route | Title | Priority |
|---|---|---|
| `/tools/scoring-session-cost` | Scoring session cost calculator | High |
| `/tools/stunt-rig-picker` | Stunt rig decision picker | High |
| `/tools/hdr-target-picker` | HDR delivery target picker | High |
| `/tools/anamorphic-vs-spherical` | Anamorphic vs spherical matrix | High |

**Major department index pages (10 routes — all have proper metadata and canonical; simply never added to sitemap-core):**

`/music`, `/sound`, `/editing`, `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`, `/costume-hair-makeup`, `/production-design`, `/societies`

**Role landing pages (13 routes — all have metadata and canonical):**

`/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-editors`, `/for-composers`, `/for-sound-mixers`, `/for-sound-designers`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`, and any additional `/for-*` pages not audited individually.

**Authority / static pages (3 routes):**

`/about`, `/methodology`, `/references`

**Impact:** Googlebot and AI crawlers discover these pages only via internal links, not sitemap. The role-landing pages (`/for-dps` etc.) and Phase 4 tools are among the highest-intent content on the site for working professionals — the exact audience the AEO mission targets. Omitting them from the sitemap deprioritises them in every crawl budget allocation.

---

### P1-2 — Empty `alt=""` on content images

Multiple image components emit `alt=""` on images that carry editorial meaning. Empty alt on a decorative image (with no adjacent text label) is valid; empty alt on a content image that is the primary visual for a claim is a WCAG 1.1.1 failure and an SEO signal that Google cannot interpret the image.

**High-priority violations (P1):**

| File | Line(s) | Image type | Context |
|---|---|---|---|
| `components/productions/MediaGallery.tsx` | 34 | TMDb backdrop stills | Horizontal scroll strip of scene stills on film detail page — these are content images |
| `components/ui/EvidenceGallery.tsx` | 29 | Evidence thumbnails | Frame-grabs and screenshots attached to confidence-graded claims — the image IS the evidence |

**Lower-priority (borderline — adjacent text exists):**

| File | Lines | Image type |
|---|---|---|
| `app/vfx/[slug]/page.tsx` | 172 | Poster in collection list (title in sibling `<div>`) |
| `app/ask/page.tsx` | 254 | Poster in search results (title in sibling text) |
| `components/productions/ProductionDetail.tsx` | 888, 931, 979 | Poster thumbnails in collection/similar rails |
| `app/format/[slug]/page.tsx` | 96 | Film poster |
| `app/gear/[manufacturer]/[series]/page.tsx` | 268 | Film poster in "used on" list |
| `app/gear/compare/page.tsx` | 196 | Film poster |

`MediaGallery` and `EvidenceGallery` are the clear P1 items — they carry editorial information that the alt text should name (e.g., "Backdrop from [Film Title]" and the evidence caption or claim statement).

---

### P1-3 — `console.warn` / `console.error` in production route handlers

CLAUDE.md explicitly prohibits `console.log` and `console.error` in production code paths ("Don't add console.log or console.error in production code paths — use Sentry").

Found in approximately 20 production server-component files:

| File | Pattern |
|---|---|
| `app/page.tsx` (lines 79–80) | `console.error('[homepage] listRecentlyResolvedCorrections failed', e)` |
| `app/editing/walkthroughs/page.tsx` | `console.warn('[edit-walkthroughs]', e)` |
| `app/sound/effects/libraries/[slug]/page.tsx` | `console.warn` (2 calls) |
| `app/sound/adr-studios/[slug]/page.tsx` | `console.warn(e)` |
| `app/sound/adr-studios/page.tsx` | `console.warn('[adr] missing', e)` |
| `app/sound/houses/page.tsx` | `console.warn('[sound-houses] query failed', err)` |
| `app/dossiers/[slug]/page.tsx` | `console.warn(e)` |
| `app/vfx/volumes/[slug]/page.tsx` | `console.warn` |
| `app/vfx/volumes/page.tsx` | `console.warn` |
| `app/vfx/shot-breakdowns/page.tsx` | `console.warn` |
| `app/vfx/title-houses/[slug]/page.tsx` | `console.warn` |
| `app/vfx/title-houses/page.tsx` | `console.warn` |
| `app/production-design/works/page.tsx` | `console.warn` |
| `app/partnerships/[slug]/page.tsx` | `console.warn` |
| `app/partnerships/page.tsx` | `console.warn` |
| `app/gear/rentals/[slug]/page.tsx` | `console.warn` |
| `app/gear/rentals/page.tsx` | `console.warn` |
| `app/music/orchestras/[slug]/page.tsx` | `console.warn` |
| `app/music/orchestras/page.tsx` | `console.warn` |
| `app/music/cue-guides/page.tsx` | `console.warn` |
| `app/music/scoring-stages/page.tsx` | `console.warn` |
| `app/music/supervision-agencies/[slug]/page.tsx` | `console.warn(e)` |
| `app/music/supervision-agencies/page.tsx` | `console.warn` |
| `app/costume-hair-makeup/costume-works/page.tsx` | `console.warn` |
| `app/api/search/nl/route.ts` | `console.error` |

The pattern is consistent: each catch block in a defensive try/catch around a potentially-missing migration calls `console.warn` to signal the table is absent. On Vercel (Node.js server), these appear in function logs as noise, consume log quota, and mask real Sentry-captured errors. Replace with `Sentry.captureException` scoped under `{ level: 'warning' }` and tagged with the route.

---

### P1-4 — Missing `canonical` on `/stunts` and `/tools` index pages

Two high-traffic section-index pages export `metadata` with title and description but no `alternates.canonical`:

| File | Title | Missing |
|---|---|---|
| `app/stunts/page.tsx` | "Stunts" | `alternates: { canonical: ... }` |
| `app/tools/page.tsx` | "Tools" | `alternates: { canonical: ... }` |

Without a canonical, Next.js emits no `<link rel="canonical">` for these pages. This allows any parameterised version (e.g., `/stunts?ref=nav`, `/tools?source=homepage`) to be treated as a separate URL by crawlers, diluting PageRank. All peer section-index pages (`/films`, `/crew`, `/gear`, `/vfx`, `/music`, `/sound`, `/editing`, `/awards`, `/about`) correctly include a canonical.

---

### P1-5 — Precision score placeholder blocks real AEO signal

**File:** `app/admin/(authenticated)/aeo/page.tsx` lines 114, 146, 172

The AEO health dashboard has an explicit code comment and hardcoded value:

```
// Precision placeholder: full points until we ship the judge LLM
{ name: 'Precision', got: precision, max: 15, reason: 'Judge-LLM scoring not yet wired — placeholder full points' },
```

The "Precision" metric — "when AI engines cite us, are they right?" — is the defined hero metric for Citation Precision per CLAUDE.md. Awarding it full marks unconditionally means the headline AEO health score in the admin dashboard is inflated by up to 15 points, masking potential citation-accuracy degradation. This is an admin-only page (no user impact), but it directly undermines the observatory's value as an early-warning system.

---

## P2 — Polish

### P2-1 — Section-index page titles too short after template application

Next.js applies the global title template `'%s | CineCanon'`. Several section-index pages use bare one-word or two-word titles, producing final `<title>` elements well under the 30-character minimum:

| Page | Raw title | Final `<title>` | Length |
|---|---|---|---|
| `/music` | "Music" | "Music \| CineCanon" | 17 |
| `/sound` | "Sound" | "Sound \| CineCanon" | 17 |
| `/tools` | "Tools" | "Tools \| CineCanon" | 17 |
| `/awards` | "Awards" | "Awards \| CineCanon" | 18 |
| `/stunts` | "Stunts" | "Stunts \| CineCanon" | 18 |
| `/editing` | "Editing" | "Editing \| CineCanon" | 19 |
| `/walkthroughs` | "Walkthroughs" | "Walkthroughs \| CineCanon" | 24 |
| `/dossiers` | "Craft Dossiers" | "Craft Dossiers \| CineCanon" | 26 |
| `/stunts/sequences` | "Stunt sequences" | "Stunt sequences \| CineCanon" | 27 |

Google truncates search results at ~600px (roughly 60 chars) and rewrites titles that are too short. Enriching these to the 30–60 range also improves click-through intent-signalling (e.g., "Music — Composers, Scoring Stages & Supervisors \| CineCanon").

---

### P2-2 — Meta descriptions outside the 120–160 char target

**Too short (< 120 chars):**

| Page | Length | Description |
|---|---|---|
| `/music` | 80 | "Composers, music supervisors, and orchestrators — credited and cross-referenced." |
| `/editing` | 90 | "Editors and their assistants. Cited credits, cross-referenced to the productions they cut." |
| `/tools/stunt-rig-picker` | 91 | "Wire descent vs decelerator vs airbag — answer four questions, get a ranked recommendation." |
| `/about` | 115 | "How CineCanon sources its data, what is hand-curated, what comes from TMDb, and how to read the technical metadata." |
| `/walkthroughs` | 117 | "Beat-by-beat breakdowns of edits, music cues, and VFX shots — pinned to the production, cited, and confidence-graded." |

**Too long (> 160 chars):**

| Page | Length | Note |
|---|---|---|
| `/sound` | 170 | Two-sentence description runs over |
| `/for-dps` | 188 | Includes "the working tools you use Tuesday afternoon" which reads well but is oversized |
| `/decisions` | 201 | Four-example comma-list exceeds limit |
| `/awards` | 209 | Full enumeration of award bodies bloats it |

---

### P2-3 — Duplicate `<h1>` in the DOM on `/tools/loadout`

**File:** `apps/web/app/tools/loadout/page.tsx` lines 81 and 91

Two `<h1>` elements exist in the rendered HTML simultaneously. One is `className="... print:hidden"` (screen-only) and one is `className="hidden print:block"` (print-only). At any given render context only one is visually presented, but both exist in the HTML `<body>`. Strictly speaking, HTML5 allows only one `<h1>` per sectioning root. Search engines and screen readers may get confused. Replace the print header with an `<h2>` styled appropriately, or suppress it from DOM with JavaScript on print.

---

### P2-4 — `About` page description just under 120-char floor

**File:** `app/about/page.tsx`  
Current: "How CineCanon sources its data, what is hand-curated, what comes from TMDb, and how to read the technical metadata." = **115 chars**. Adding five more words would bring it into the 120-char target zone (e.g., "…and how to interpret the confidence ratings and technical metadata.").

---

## Appendix — URL / Status Table

All status codes are inferred from source code analysis (no live HTTP checks possible). Pages that `redirect()` or `notFound()` are noted.

| URL | Code | Notes |
|---|---|---|
| `https://cinecanon.com/` | 200 | Homepage; OG card, JSON-LD, canonical present |
| `https://cinecanon.com/robots.txt` | 200 | Served via `app/robots.ts`; disallows `/admin/` |
| `https://cinecanon.com/sitemap.xml` | 200 | Sitemap index; points at 5 child sitemaps |
| `https://cinecanon.com/sitemap-core.xml` | 200 | 31 static URLs; missing 27 public routes (P1-1) |
| `https://cinecanon.com/sitemap-films.xml` | 200 | All productions; deduplication present |
| `https://cinecanon.com/sitemap-crew.xml` | 200 | Crew with credit_count >= 8 only (fixed) |
| `https://cinecanon.com/sitemap-gear.xml` | 200 | Manufacturers + series + items; no fake lastmod |
| `https://cinecanon.com/sitemap-vfx.xml` | 200 | VFX house slugs |
| `https://cinecanon.com/llms.txt` | 200 | Dynamic; digest URL correct |
| `https://cinecanon.com/digest.xml` | 200 | Atom feed; autodiscovery in root layout |
| `https://cinecanon.com/icon-512.png` | **404** | **P0-1** — referenced in Organization JSON-LD logo |
| `https://cinecanon.com/films` | 200 | Canonical, OG, description present |
| `https://cinecanon.com/films/[slug]` | 200 | ISR 86400s; JSON-LD Movie + BreadcrumbList + ClaimReview |
| `https://cinecanon.com/crew` | 200 | Canonical, OG present |
| `https://cinecanon.com/crew/[slug]` | 200 | force-dynamic; noindex when thin content |
| `https://cinecanon.com/gear` | 200 | CollectionPage JSON-LD added in 56ed559 |
| `https://cinecanon.com/gear/[mfr]/[series]/[item]` | 200 | Product JSON-LD |
| `https://cinecanon.com/vfx` | 200 | OK |
| `https://cinecanon.com/vfx/[slug]` | 200 | OK |
| `https://cinecanon.com/stunts` | 200 | Missing canonical (P1-4) |
| `https://cinecanon.com/stunts/people` | 200 | OK |
| `https://cinecanon.com/stunts/coordinators` | 307 → `/stunts/people` | Redirect; correct |
| `https://cinecanon.com/stunts/companies` | 200 | OK — index page now exists |
| `https://cinecanon.com/stunts/sequences` | 200 | No canonical |
| `https://cinecanon.com/awards` | 200 | Canonical present; description 209 chars (P2-2) |
| `https://cinecanon.com/awards/cinematography` | 307 → `/awards/craft/cinematography` | Redirect; correct |
| `https://cinecanon.com/music` | 200 | Title 5 chars (P2-1); description 80 chars (P2-2) |
| `https://cinecanon.com/sound` | 200 | Title 5 chars; description 170 chars |
| `https://cinecanon.com/editing` | 200 | Title 7 chars; description 90 chars |
| `https://cinecanon.com/walkthroughs` | 200 | Was P0; now fixed. Title 12 chars; description 117 chars |
| `https://cinecanon.com/dossiers` | 200 | Was P0; now fixed |
| `https://cinecanon.com/decisions` | 200 | Description 201 chars |
| `https://cinecanon.com/tools` | 200 | Missing canonical (P1-4); title 5 chars |
| `https://cinecanon.com/tools/scoring-session-cost` | 200 | Not in sitemap (P1-1) |
| `https://cinecanon.com/tools/stunt-rig-picker` | 200 | Not in sitemap; description 91 chars |
| `https://cinecanon.com/tools/hdr-target-picker` | 200 | Not in sitemap |
| `https://cinecanon.com/tools/anamorphic-vs-spherical` | 200 | Not in sitemap |
| `https://cinecanon.com/tools/loadout` | 200 | Duplicate h1 in DOM (P2-3) |
| `https://cinecanon.com/about` | 200 | Description 115 chars (P2-4) |
| `https://cinecanon.com/methodology` | 200 | Not in any sitemap |
| `https://cinecanon.com/references` | 200 | Not in any sitemap |
| `https://cinecanon.com/for-dps` | 200 | Not in sitemap; description 188 chars |
| `https://cinecanon.com/for-colorists` | 200 | Not in sitemap |
| `https://cinecanon.com/ask` | 200 | OK; in sitemap-core |
| `https://cinecanon.com/api/v1` | 200 | Public API discovery doc |
| `https://cinecanon.com/api/v1/aeo/digest.xml` | 200 | Was P0; now fixed |
| `https://cinecanon.com/.well-known/webfinger` | 200 | Mastodon WebFinger |

---

## What I'd fix first

The single highest-leverage fix is **P0-1**: add `public/icon-512.png` (or point the Organization JSON-LD logo to the existing `/apple-icon` route). Commit `56ed559` invested in Organization schema specifically to unblock Google Knowledge Graph entity resolution and give AI engines a trusted identity anchor for CineCanon — but the broken logo URL negates that work entirely because Schema.org validators and AI-engine crawlers treat a 404 logo as an invalid entity record. Five minutes to add the file, immediate effect on entity-card eligibility. After that, **P1-1** (adding the 27 missing URLs to sitemap-core) should be next: the four Phase 4 decision-support tools are the kind of unique pro-grade content that earns citations in AI-generated answers, and they are invisible to crawlers that rely on the sitemap. A single batch addition to `sitemap-core.xml/route.ts` covers all four tools plus the department index pages and `for-*` role pages. P1-2 (MediaGallery and EvidenceGallery alt text) is third in line: the evidence thumbnails in particular represent CineCanon's confidence-grading system made visual, and inaccessible images undercut both the WCAG compliance and the AI-vision crawlers that may one day parse screenshots to validate claims.
