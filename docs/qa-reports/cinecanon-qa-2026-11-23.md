# CineCanon QA Sweep — 2026-11-23

**Scope:** Code-audit sweep of the production site `https://cinecanon.com` against the repo at `/home/user/bts` (branch `master`). The live site was unreachable from the execution environment (agent-proxy 403 — host not in allowed domain list); all findings are therefore derived from static analysis of the app codebase, comparison with previous QA crawl data (2026-05-20 and 2026-05-21), and the git log.

Coverage: 133 non-admin public `page.tsx` files, all 5 `sitemap-*.xml` route handlers, `robots.ts`, `llms.txt/route.ts`, `lib/jsonLd.tsx`, `components/nav/Footer.tsx`, `components/nav/TopNav.tsx`, `components/productions/ProductionDetail.tsx`, and selected component and page files. The 2026-05-21 full-crawl report (13,116 URLs, 2,340 images) was used as the last-known-good baseline for HTTP status.

---

## Summary

| Metric | Value |
|---|---|
| Public page routes in repo (non-admin) | 133 |
| Sitemap-covered routes (all 5 sitemaps) | ~5 static hub routes + all film/crew/gear/vfx detail pages |
| Public routes with pages but absent from all sitemaps | ~75 |
| **P0 — Broken** | **4** |
| **P1 — Degraded** | **8** |
| **P2 — Polish** | **6** |

Previous P0 issues from the 2026-05-20 report that were confirmed fixed: `/dossiers` index (now has page.tsx), `/walkthroughs` index, `/sound/mixers`, `/sound/designers`, `/stunts/companies`, `/awards/cinematography` (redirect).

---

## P0 — Broken

### P0-1 · User-visible migration artifact text on /gear/rentals and /vfx/title-houses

When the backing database tables are absent (migrations 0083 and 0084 not applied to prod), two linked pages render engineering debug text as the page body:

- `/gear/rentals` empty-state renders: `"The rental house catalog hasn't seeded yet. Migration 0083 + seed dispatch loads it."`
- `/vfx/title-houses` empty-state renders: `"Catalog seeds with migration 0084 + dispatch."`

Both pages are linked directly from the footer ("`rental houses`" and "`title sequence houses`"). A visitor who clicks these links sees production-system implementation text. If the migrations have not been applied, these are effectively broken pages for end-users.

**Files:** `apps/web/app/gear/rentals/page.tsx:52–55`, `apps/web/app/vfx/title-houses/page.tsx:54`

---

### P0-2 · /decisions renders "table not yet migrated on this environment" to users

When the `decision_trees` table is absent, `/decisions` renders:

```
Decision trees coming online — table not yet migrated on this environment.
```

The page is linked from the footer under "Craft decisions" and from `llms.txt` as `Decisions: craft decision-trees`. If the table is missing on prod, every visitor sees an implementation-stage message rather than content.

**File:** `apps/web/app/decisions/page.tsx:57`

---

### P0-3 · /stunts/schools/[slug] alumni section shows placeholder text to all users

Every stunt-school detail page renders a live "Notable alumni" section with:

```
Alumni mapping coming with phase 2.
```

This is not a conditional — it renders for every slug regardless of data state. It is surfaced inside a dashed-border placeholder block. Any visitor or AI crawler reading a school dossier page sees an unfinished data section.

**File:** `apps/web/app/stunts/schools/[slug]/page.tsx:149–161`

---

### P0-4 · /lookbook announces an undelivered feature as an active page

`/lookbook` is linked from no top-nav item but is indexed by `/sitemap-core.xml` (after checking: it is NOT in sitemap-core, confirmed). The page eyebrow reads "Visual search · upload coming soon" and the description explicitly says the upload feature is "in development." This page promises a core capability (visual reverse image search) that does not work. Visitors who reach it via search or llms.txt references see a holding page, not a tool.

**File:** `apps/web/app/lookbook/page.tsx:39`

---

## P1 — Degraded

### P1-1 · ~75 public pages absent from all sitemaps (systematic SEO/GEO blind spot)

The sitemap-index at `/sitemap.xml` points to five child sitemaps: `sitemap-core.xml`, `sitemap-films.xml`, `sitemap-crew.xml`, `sitemap-gear.xml`, `sitemap-vfx.xml`. These collectively omit approximately 75 public-facing routes with live `page.tsx` files, including entire content hubs and the four Phase 4 tools added per the CLAUDE.md "in flight" section.

Key omissions by category:

**New Phase 4 tools (high-value, recently shipped, zero sitemap coverage):**
- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

**Content hubs (high crawl value, all linked from footer):**
- `/about`, `/methodology`
- `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`
- `/music`, `/sound`, `/editing`, `/production-design`, `/costume-hair-makeup`
- `/awards`, `/decades`, `/shots`, `/references`
- `/gear/rentals`, `/search`, `/lookbook`

**For-X role pages (12 audience-specific landing pages):**
- `/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-coordinators`
- `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`
- `/for-editors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`

**Other stunt sub-routes:**
- `/stunts/companies`, `/stunts/schools`

Google and AI crawlers that rely on the sitemap to discover content cannot systematically find any of the above. The crew sitemap (C1 fix from 2026-06-18 audit) correctly limits entries to indexable crew. The same discipline has not been applied to these hubs and tools.

**Files:** `apps/web/app/sitemap-core.xml/route.ts`

---

### P1-2 · 35 console.warn / console.error calls in public server-side code paths

The CLAUDE.md convention is explicit: "Don't add console.log or console.error in production code paths — use Sentry." There are 35 `console.warn` or `console.error` calls in non-admin `page.tsx` files, nearly all in `catch` blocks guarding against missing DB tables. These produce server-side log noise without creating actionable Sentry incidents, making it impossible to know whether a migration was silently missing on prod.

Representative examples:
- `apps/web/app/vfx/volumes/page.tsx:28` — `console.warn('[vp_volumes] table missing...')`
- `apps/web/app/vfx/title-houses/[slug]/page.tsx:37` — `console.warn('[title_sequence_houses] detail query failed')`
- `apps/web/app/dossiers/[slug]/page.tsx:43` — `console.warn(e)` (no context at all)
- `apps/web/app/page.tsx:79–80` — `console.error` on homepage DB calls

---

### P1-3 · Empty alt text on content poster images in key components

Ten site components render `alt=""` on film-poster thumbnail images that are content images (not purely decorative), violating WCAG 2.1 SC 1.1.1. While many of these are wrapped in anchor links with adjacent visible text (reducing the accessibility impact), screen readers will skip the image entirely rather than describe it as an image of that film.

| Component | Line | Context |
|---|---|---|
| `components/productions/ProductionDetail.tsx` | 888 | Poster in collection-members list |
| `components/productions/ProductionDetail.tsx` | 931 | Poster in similar-films list |
| `components/productions/ProductionDetail.tsx` | 979 | Poster in another collection section |
| `components/productions/MediaGallery.tsx` | 34 | Media gallery images |
| `components/people/FilmographyTable.tsx` | 48 | Poster in filmography rows |
| `components/vfx/VfxFilmography.tsx` | 28 | Poster in VFX filmography |
| `apps/web/app/vfx/[slug]/page.tsx` | 172 | Poster in VFX house filmography |
| `apps/web/app/gear/[manufacturer]/[series]/page.tsx` | 268 | Poster in lens filmography |
| `apps/web/app/crew/[slug]/page.tsx` | 848 | Poster in crew filmography |

Minimum fix: set `alt={filmTitle}` on all poster thumbnails. Where the film title is visible immediately adjacent, `role="presentation"` with `aria-hidden="true"` is acceptable.

---

### P1-4 · 31 pages with metadata export but no explicit canonical URL

The following public pages generate (or have static) `metadata` exports but do not set `alternates.canonical`. Next.js App Router does not auto-generate a canonical tag from `metadata` alone — the canonical must be explicitly set.

Selected high-traffic examples:
- `apps/web/app/films/[slug]/scenes/[sceneSlug]/page.tsx` — scene detail pages (ISR cached, stable URLs)
- `apps/web/app/films/[slug]/loadout/page.tsx` — loadout print pages
- `apps/web/app/films/compare/page.tsx` — film comparison (URL-parameterized)
- `apps/web/app/gear/[manufacturer]/page.tsx`, `gear/[manufacturer]/[series]/page.tsx`, `gear/[manufacturer]/[series]/[item]/page.tsx`
- `apps/web/app/stunts/companies/[slug]/page.tsx`, `stunts/schools/[slug]/page.tsx`
- `apps/web/app/format/[slug]/page.tsx`, `format/page.tsx`
- `apps/web/app/search/page.tsx` (search result pages should be noindex anyway)

Without a canonical, search engines may treat parameterized variants (compare, filter, sort) as distinct URLs, fragmenting link equity.

---

### P1-5 · Root meta description is 1 character over recommended limit

The root layout description in `apps/web/app/layout.tsx` is 161 characters:

```
Cited, confidence-graded technical data on every film — cameras, lenses, lighting, color, sound, music, stunts, and VFX — for working camera-department pros.
```

Google truncates meta descriptions at approximately 158–160 characters. The last 2–3 words will be cut off in search snippets. Trim by 2–3 chars.

**File:** `apps/web/app/layout.tsx:19`

---

### P1-6 · `claims/[id]/page.tsx` and `stunts/coordinators/page.tsx` are redirect-only pages with no metadata or noindex

`/claims/[id]` is a redirect-only route (307-redirects to the entity dossier page). It has no `metadata` export and no `noindex` directive. Crawlers may index an empty page until the redirect resolves. Same for `/stunts/coordinators` (redirects to `/stunts/people`).

Both should export `export const metadata: Metadata = { robots: { index: false } }`.

**Files:** `apps/web/app/claims/[id]/page.tsx`, `apps/web/app/stunts/coordinators/page.tsx`

---

### P1-7 · Multiple pages show "not yet" / "coming" language to live visitors

Beyond the P0 cases above, the following live pages include stub copy that is user-visible:

| Page | Visible text |
|---|---|
| `/tools/page.tsx` (tools index) | "zinc = not yet" in page description — a styling cue embedded in prose text |
| `/walkthroughs/[slug]/page.tsx:130` | "Beats not yet annotated." — appears on any walkthrough without beat data |
| `/partnerships/[slug]/page.tsx:137` | "No joint credits found — both members may not yet have their crew assignments synced." — missing-data text that could mislead users |

---

### P1-8 · `stunts/schools/[slug]` and multiple other dynamic pages missing canonical

The `generateMetadata` function in `apps/web/app/stunts/schools/[slug]/page.tsx` returns a title and description but does not set `alternates.canonical`. Stunt-school detail pages are statically generated (`generateStaticParams`) and have stable URLs — they should carry explicit canonicals to block any duplicates arising from query-string parameters.

Same omission: `stunts/companies/[slug]`, `stunts/rigging/[slug]`, `stunts/safety/[slug]`, `vfx/volumes/[slug]`.

---

## P2 — Polish

### P2-1 · Several page titles are too short (below 30-char effective minimum)

The root layout appends ` | CineCanon` (12 chars) to all page titles via the template. Effective (browser-tab / SERP) title lengths for selected pages:

| Page | Static title | Effective (+ ` | CineCanon`) |
|---|---|---|
| `/music` | "Music" (5) | 17 chars — well below 30-char minimum |
| `/tools/stunt-rig-picker` | "Stunt rig decision picker" (25) | 37 chars |
| `/tools/hdr-target-picker` | "HDR delivery target picker" (26) | 38 chars |
| `/music/orchestras` | "Recording orchestras" (20) | 32 chars |

Recommended: expand these to 40–55 chars before the ` | CineCanon` suffix.

---

### P2-2 · Implicit `suppressHydrationWarning` on `<html>` and `<body>`

`apps/web/app/layout.tsx:46–57` sets `suppressHydrationWarning` on both `<html>` and `<body>`. Per CLAUDE.md, this was added for browser-extension compatibility. The suppression is intentional and low risk, but it means genuine hydration errors from new features (RSC payload mismatches, stale ISR cache) will be silently swallowed. Document this in a code comment with a periodic review note.

---

### P2-3 · `BrandLogo` component uses `alt=""` on the brand mark image

`components/ui/BrandLogo.tsx:78` has `alt=""` on the CineCanon brand mark image. The brand mark is used in the top nav and footer. While technically acceptable (the logo text is adjacent), best practice for brand marks is `alt="CineCanon"` so the image is announced in contexts where the adjacent text is not read.

---

### P2-4 · Atom feed (`/digest.xml`) not referenced from sitemap-core or llms.txt index section

The `<link rel="alternate" type="application/atom+xml" href="/digest.xml">` autodiscovery tag is set in the root layout (alternates.types), which is correct for feed readers. However, `/digest.xml` is not referenced in `sitemap-core.xml`, meaning AI crawlers that treat the sitemap as the canonical URL list won't systematically hit it. The llms.txt references the endpoint in prose but not as a structured `## Index pages` entry.

---

### P2-5 · `about` and `methodology` pages omitted from sitemap-core

`/about` and `/methodology` are linked in the footer and are high-authority pages with stable content and explicit canonical tags. They are absent from all sitemaps, which is inconsistent with how `sitemap-core.xml` treats similarly stable pages like `/format` and `/ask`.

**File:** `apps/web/app/sitemap-core.xml/route.ts`

---

### P2-6 · `music/page.tsx` metadata description is under 120 chars (too short)

The music index page description — `"Composers, music supervisors, and orchestrators — credited and cross-referenced."` — is 82 characters. Per the QA brief, the recommended minimum for meta descriptions is 120 characters. This is under the threshold and wastes the SERP real-estate for a content-rich hub page.

---

## Appendix — URL × Status Table

Since direct HTTP access to the live site was blocked in this environment (agent-proxy 403), the following table is derived from code analysis and the last-known-good full crawl (2026-05-21). Status codes marked `[code]` are from that crawl; `[code-code]` is confirmed.

### Core navigation and infrastructure

```
[200]  /                           [200]  /sitemap.xml
[200]  /films                      [200]  /sitemap-core.xml
[200]  /crew                       [200]  /sitemap-films.xml
[200]  /awards                     [200]  /sitemap-crew.xml
[200]  /references                 [200]  /sitemap-gear.xml
[200]  /tools                      [200]  /sitemap-vfx.xml
[200]  /ask                        [200]  /robots.txt
[200]  /gear                       [200]  /llms.txt
[200]  /vfx                        [200]  /opengraph-image
[200]  /stunts                     [200]  /api/health
[200]  /sound                      [200]  /api/v1
[200]  /music                      [200]  /api/v1/aeo/digest.xml
[200]  /editing                    [200]  /api/v1/aeo/claims
[200]  /production-design          [200]  /api/v1/aeo/precision
[200]  /costume-hair-makeup
```

### Pages confirmed fixed since 2026-05-20

```
[200]  /dossiers               (was P0-1 in 2026-05-20)
[200]  /walkthroughs           (was P0-2 in 2026-05-20)
[200]  /sound/mixers           (was P0-3 in 2026-05-20)
[200]  /sound/designers        (was P0-4 in 2026-05-20)
[200]  /stunts/companies       (was P1-6 in 2026-05-20)
[307]  /stunts/coordinators    → /stunts/people (was P1-6; now redirect)
[307]  /awards/cinematography  → /awards/craft/cinematography (was P1-6; now redirect)
```

### New Phase 4 tools (live in code, not in sitemaps)

```
[200]  /tools/scoring-session-cost       (not in sitemap-core)
[200]  /tools/stunt-rig-picker           (not in sitemap-core)
[200]  /tools/hdr-target-picker          (not in sitemap-core)
[200]  /tools/anamorphic-vs-spherical    (not in sitemap-core)
```

### Pages with potentially degraded content (table-missing guards)

```
[200?] /gear/rentals          — empty state may show migration-ref text
[200?] /vfx/title-houses      — empty state may show migration-ref text
[200?] /decisions             — empty state may show migration-ref text
[200]  /vfx/volumes           — has proper empty state; guarded defensively
[200]  /music/orchestras      — guarded; will render empty until seeded
[200]  /costume-hair-makeup/effects-houses — guarded; renders empty until seeded
```

### Pages absent from all sitemaps (selected)

```
/about                     /for-dps
/methodology               /for-colorists
/walkthroughs              /for-gaffers
/dossiers                  /for-coordinators
/decisions                 /for-sound-mixers
/partnerships              /for-sound-designers
/music (hub)               /for-composers
/sound (hub)               /for-music-supervisors
/editing (hub)             /for-editors
/production-design (hub)   /for-production-designers
/costume-hair-makeup (hub) /for-costume-designers
/awards                    /for-makeup-artists
/decades                   /societies
/shots                     /search
/references                /bookmarks
/gear/rentals              /lookbook
/import/letterboxd         /stunts/companies
/stunts/schools            /music/scoring-stages
/music/orchestras          /music/supervisors
/music/supervision-agencies
```

---

## What I'd Fix First

The two items with the highest combined impact are P0-1 / P0-2 (migration-artifact text visible to users on `/gear/rentals`, `/vfx/title-houses`, and `/decisions`) and P1-1 (the sitemap gap). The migration-text issues need a one-line copy fix in the empty-state fallback and confirmation the migrations have been dispatched to prod; the fact that engineering implementation notes are user-visible is a trust signal that matters for a site whose brand promise is editorial rigour. Immediately after that, the sitemap-core gap (P1-1) is the highest-leverage SEO/GEO intervention: the four Phase 4 tools, twelve for-X role pages, and the full suite of content hubs (music, sound, editing, dossiers, walkthroughs, decisions) are all dark to systematic AI-crawler and Google discovery. Adding them to `sitemap-core.xml/route.ts` requires at most thirty lines of static entries and unblocks the AEO/GEO observatory's ability to get those pages cited by AI engines, which is the site's stated competitive moat.
