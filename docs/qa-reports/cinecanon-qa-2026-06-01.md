# CineCanon QA Report — 2026-06-01

**Sweep scope:** Source-code audit of the production deployment at https://cinecanon.com (repo `/home/user/bts`, branch `master`). Live HTTP crawl was not possible from this environment (egress proxy returns 403 "Host not in allowlist"). All findings derive from static analysis of the deployed codebase: page routes, metadata, sitemap routes, component markup, and configuration files.

**Auditor note:** Because live HTTP responses could not be fetched, crawl-reachability HTTP status codes (4xx/5xx), binary asset sizes, and actual server-rendered HTML could not be verified directly. Findings are drawn from code that will run in production. Any finding that requires live verification is annotated.

---

## Summary

| | Count |
|---|---|
| Public-facing page routes in repo | 133 |
| Pages that are redirects (no content) | 2 |
| Pages with live content | 131 |
| Total defects found | 37 |
| P0 — Broken | 1 |
| P1 — Degraded | 19 |
| P2 — Polish | 17 |

---

## P0 — Broken

### P0-1: Sitemap covers fewer than half of all deployed routes

**Severity: P0.** The sitemap index at `/sitemap.xml` declares five segment sitemaps: `core`, `films`, `crew`, `gear`, `vfx`. Of the 133 public page routes in the codebase, approximately 60 static section-index and cross-cut pages are absent from every sitemap. These routes are fully rendered and linked in the footer and nav, but search engines have no declarative signal pointing to them.

Missing sections include:
- All Sound routes: `/sound`, `/sound/mixers`, `/sound/designers`, `/sound/foley`, `/sound/post`, `/sound/effects`, `/sound/houses`, `/sound/adr-studios`, `/sound/effects/libraries`
- All Music routes: `/music`, `/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`, `/music/cue-guides`, `/music/supervision-agencies`
- All Editing routes: `/editing`, `/editing/editors`, `/editing/walkthroughs`
- All Production Design routes: `/production-design`, `/production-design/designers`, `/production-design/works`
- All Costume / Hair / Makeup routes: `/costume-hair-makeup`, `/costume-hair-makeup/designers`, `/costume-hair-makeup/effects-houses`, `/costume-hair-makeup/costume-works`, `/costume-hair-makeup/makeup-works`
- `/awards` and all `/awards/craft/[craft]` craft-specific pages
- Cross-cuts: `/decisions`, `/walkthroughs`, `/dossiers`, `/partnerships`, `/references`, `/locations`, `/decades`, `/shots`, `/lookbook`, `/queries`
- Phase 4 tools (landed recently per CLAUDE.md): `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`
- For-pro pages: `/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-coordinators`, `/for-editors`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`
- Info pages: `/about`, `/methodology`, `/search`, `/societies`, `/gear/compare`, `/gear/rentals`, `/films/compare`, `/crew/compare`

**File:** `/home/user/bts/apps/web/app/sitemap-core.xml/route.ts` (and the absence of segment sitemaps for sound, music, editing, awards, etc.)

---

## P1 — Degraded

### P1-1: `EvidenceGallery` content images rendered with `alt=""`

All BTS evidence images in `/home/user/bts/apps/web/components/ui/EvidenceGallery.tsx` (line 31) use a bare `<img>` tag with `alt=""`. These images are visual proof-of-claim — screenshots from interviews, reference scans, on-set stills — and are the primary visual content of the evidence panel. Empty alt text means screen-reader users receive no information about what the evidence shows, directly undermining the site's accessibility promise for its most editorial content.

**File:** `/home/user/bts/apps/web/components/ui/EvidenceGallery.tsx`, line 31.

### P1-2: `MediaGallery` TMDb backdrop strip uses `alt=""`

The horizontal backdrop scroll strip in `/home/user/bts/apps/web/components/productions/MediaGallery.tsx` (line 34) renders all TMDb backdrop images with `alt=""`. These are content images (film stills), not decorative. A screen-reader user receives no indication of what they depict. The production title is accessible from context but the image itself is invisible to assistive technology.

**File:** `/home/user/bts/apps/web/components/productions/MediaGallery.tsx`, line 34.

### P1-3: `/tools/loadout` has two `<h1>` elements in the DOM simultaneously

The loadout calculator page at `/home/user/bts/apps/web/app/tools/loadout/page.tsx` (lines 81 and 91) renders two `<h1>` tags: one with `print:hidden` (for screen) and one with `hidden print:block` (for print). Both are present in the DOM at all times; CSS display properties do not remove elements from the accessibility tree or from crawlers' heading analysis. Crawlers parsing the page see two top-level headings.

**File:** `/home/user/bts/apps/web/app/tools/loadout/page.tsx`, lines 81 and 91.

### P1-4: `/decisions` shows internal development copy to public visitors when table is empty

`/home/user/bts/apps/web/app/decisions/page.tsx` (line 57) shows the string `"Decision trees coming online — table not yet migrated on this environment."` whenever `trees.length === 0`. This condition fires both when the DB query throws (table absent) AND when the table exists but contains no seeded rows. If the production DB has a migrated but unseeded `craft_decision_trees` table, every visitor to `/decisions` sees internal development language. Migration 0087 exists, so the table is present; the question is whether it is seeded.

**File:** `/home/user/bts/apps/web/app/decisions/page.tsx`, line 57.

### P1-5: `/stunts/schools/[slug]` shows "Alumni mapping coming with phase 2" in the rendered page

Every stunt school detail page includes a visible section titled "Notable alumni" with the copy `"Performer-and-coordinator alumni are wired in once phase 2 of the stunt-section roadmap lands"` and a dashed empty-state box reading `"Alumni mapping coming with phase 2."` This is live, public-facing text that describes incomplete development work. It degrades credibility for a site whose brand promise is authoritative, cited data.

**File:** `/home/user/bts/apps/web/app/stunts/schools/[slug]/page.tsx`, lines 149–161.

### P1-6: `/lookbook` hero reads "Visual search · upload coming soon"

The PageHero eyebrow for `/lookbook` is hardcoded to `"Visual search · upload coming soon"`. This is rendered as the page's leading UI element for all visitors. While the body text explains the roadmap rationally, the eyebrow reads as an unfinished product announcement.

**File:** `/home/user/bts/apps/web/app/lookbook/page.tsx`, line 39.

### P1-7: Music index homepage text reads "listening guides coming online"

The homepage depth-grid tile for `/music` (`/home/user/bts/apps/web/app/page.tsx`, line 481) includes the fragment `"listening guides coming online"` in user-visible prose. A first-time visitor reading the homepage sees an unfinished promise in a key conversion surface.

**File:** `/home/user/bts/apps/web/app/page.tsx`, line 481.

### P1-8: `console.error` used in homepage data fetches instead of Sentry

Two Promise-catch handlers in `/home/user/bts/apps/web/app/page.tsx` (lines 79–80) call `console.error` for `listRecentlyResolvedCorrections` and `listRecentCitations` failures. CLAUDE.md explicitly states: "Don't add console.log or console.error in production code paths — use Sentry." These errors are silently swallowed server-side; an operator has no structured alert when homepage rails go dark.

**File:** `/home/user/bts/apps/web/app/page.tsx`, lines 79–80.

### P1-9: Extensive `console.warn` use in server components for DB query fallbacks

Seventeen server-component page files use `console.warn` as the error path for defensive try/catch blocks around DB queries (e.g., `sound/effects/libraries/[slug]/page.tsx`, `vfx/volumes/page.tsx`, `partnerships/page.tsx`, `gear/rentals/page.tsx`, `vfx/title-houses/page.tsx`, etc.). These emit to server logs only, which is functionally correct, but CLAUDE.md requires Sentry for caught errors that matter. Operators cannot distinguish "table missing during deploy window" from a silent persistent failure without log archaeology.

**Files:** Multiple — see `/home/user/bts/apps/web/app/sound/effects/libraries/[slug]/page.tsx`, `/home/user/bts/apps/web/app/vfx/volumes/page.tsx`, `/home/user/bts/apps/web/app/partnerships/page.tsx`, `/home/user/bts/apps/web/app/gear/rentals/page.tsx` and ~13 others.

### P1-10: `/api/v1` discovery document omits the crew endpoint

The API discovery doc at `/home/user/bts/apps/web/app/api/v1/route.ts` lists five endpoints: `production`, `search_suggest`, `aeo_precision`, `aeo_claims`, `aeo_digest_atom`. It does not list `/api/v1/crew/{slug}`, which exists and is a documented public API endpoint (`/home/user/bts/apps/web/app/api/v1/crew/[slug]/route.ts`). Consumers of the discovery doc — including AI crawlers — cannot discover the crew endpoint programmatically.

**File:** `/home/user/bts/apps/web/app/api/v1/route.ts`.

### P1-11: No default `og:image` / Twitter card image for most section pages

The root layout at `/home/user/bts/apps/web/app/layout.tsx` declares `twitter: { card: 'summary_large_image' }` but does not supply an `images` property. A dynamic `opengraph-image.tsx` exists at the root level, at `/films/[slug]`, and at `/crew/[slug]`, but all other section pages (`/sound`, `/music`, `/awards`, `/tools`, `/decisions`, `/walkthroughs`, etc.) will share the root fallback OG image. The root OG image exists but is a generic brand card — no page-specific visual context is communicated when these URLs are shared on social media or cited by AI engines.

**File:** `/home/user/bts/apps/web/app/layout.tsx`, lines 14–41.

### P1-12: Sitemap-crew default limit is 1,000 — `listPeople` default likely missed this

`/home/user/bts/apps/web/app/sitemap-crew.xml/route.ts` (line 14, comment) explains that the previous default cap of 1,000 was a known bug and it has been raised to 50,000. This is fixed. However the comment also notes `~12k crew pages exist` — operators should verify the 50,000 ceiling is not eventually crossed as the database grows, as sitemap truncation would silently drop tail crew pages.

**File:** `/home/user/bts/apps/web/app/sitemap-crew.xml/route.ts` (monitoring note, not an active bug).

### P1-13: `/walkthroughs/[slug]` shows "Beats not yet annotated" for unseeded walkthroughs

`/home/user/bts/apps/web/app/walkthroughs/[slug]/page.tsx` (line 130) renders `"Beats not yet annotated."` when a walkthrough's beat array is empty. This is a published, indexable URL (walkthroughs appear in `generateStaticParams`) that can serve visible placeholder copy to visitors and crawlers.

**File:** `/home/user/bts/apps/web/app/walkthroughs/[slug]/page.tsx`, line 130.

### P1-14: Several stunt and VFX detail page routes have no `revalidate` setting

The following detail pages use `generateStaticParams` (so they are pre-rendered at build) but do not declare `export const revalidate`. In Next.js App Router this means the pages are never revalidated after the initial build — stale data will persist until the next full deployment, with no TTL-based refresh cycle.

Affected routes:
- `/home/user/bts/apps/web/app/vfx/[slug]/page.tsx`
- `/home/user/bts/apps/web/app/stunts/rigging/[slug]/page.tsx`
- `/home/user/bts/apps/web/app/stunts/safety/[slug]/page.tsx`
- `/home/user/bts/apps/web/app/stunts/companies/[slug]/page.tsx`
- `/home/user/bts/apps/web/app/stunts/sequences/[productionSlug]/[sequenceSlug]/page.tsx`

Film (`revalidate = 86400`) and crew (`revalidate = 86400`) detail pages set this correctly. Stunt and VFX detail pages should be brought to parity.

### P1-15: `/decisions` and `/walkthroughs` index pages are absent from all sitemaps

These are content-rich pages (cross-cut indexes) that are fully rendered and linked from the footer and `llms.txt`. Neither appears in any of the five segment sitemaps. AI crawlers following `llms.txt` will discover them by href but not via the authoritative crawl-budget signal.

See also P0-1.

### P1-16: `ask` page meta description exceeds 160-character limit

The description for `/ask` at `/home/user/bts/apps/web/app/ask/page.tsx` (line 12–14) is 193 characters. Google truncates meta descriptions around 155–160 characters, and the tail of this description (the example query) will be cut, potentially removing the most illustrative content.

**File:** `/home/user/bts/apps/web/app/ask/page.tsx`, line 12.

### P1-17: Several major sections have meta descriptions below 120 characters

The following pages have descriptions that are shorter than 120 characters, the conventional minimum for Google to show the full description rather than generating an excerpt:

- `/music`: 80 chars (`"Composers, music supervisors, and orchestrators — credited and cross-referenced."`)
- `/about`: 115 chars
- Stunt sub-pages (`/stunts/rigging`, `/stunts/lineage`, `/stunts/sequences`) all have descriptions at the boundary or slightly under.

The most exposed is `/music` at 80 chars, which is used as a major section-index entry point.

**File:** `/home/user/bts/apps/web/app/music/page.tsx`, line 10.

### P1-18: VFX house thumbnail posters in filmography use `alt=""` on content images

`/home/user/bts/apps/web/app/vfx/[slug]/page.tsx` (line 172), `components/vfx/VfxFilmography.tsx` (line 28), and `app/gear/[manufacturer]/[series]/page.tsx` (line 268) all render film poster thumbnails inside filmography tables with `alt=""`. These thumbnails serve as visual identifiers for productions — they carry content meaning — and screen-reader users receive none of it.

**Files:** `/home/user/bts/apps/web/app/vfx/[slug]/page.tsx`, `/home/user/bts/apps/web/components/vfx/VfxFilmography.tsx`, `/home/user/bts/apps/web/app/gear/[manufacturer]/[series]/page.tsx`.

### P1-19: `awards/cinematography` and `stunts/coordinators` are redirect-only pages with no `<title>` metadata

Both `/home/user/bts/apps/web/app/awards/cinematography/page.tsx` and `/home/user/bts/apps/web/app/stunts/coordinators/page.tsx` are redirect-only pages (`redirect()` with no JSX or metadata export). While the redirects themselves work, any crawler that lands on these URLs before the redirect resolves will see an empty `<title>` tag (inheriting the root template `%s | CineCanon` with an empty `%s`). Adding at minimum `export const metadata = { title: 'Cinematography Awards' }` would prevent the empty title edge case.

**Files:** `/home/user/bts/apps/web/app/awards/cinematography/page.tsx`, `/home/user/bts/apps/web/app/stunts/coordinators/page.tsx`.

---

## P2 — Polish

### P2-1: Nineteen section pages have titles shorter than 30 characters (below Google's preferred minimum)

After the `%s | CineCanon` template is applied, the following pages produce titles shorter than 30 characters:

| Full rendered title | Length |
|---|---|
| `Gear \| CineCanon` | 16 |
| `Sound \| CineCanon` | 17 |
| `Music \| CineCanon` | 17 |
| `Tools \| CineCanon` | 17 |
| `Editing \| CineCanon` | 19 |
| `Awards \| CineCanon` | 18 |
| `Format \| CineCanon` | 18 |
| `Stunts \| CineCanon` | 18 |
| `Editors \| CineCanon` | 19 |
| `Foley \| CineCanon` | 17 |
| `Post Sound \| CineCanon` | 22 |
| `Sound houses \| CineCanon` | 24 |
| `ADR studios \| CineCanon` | 23 |
| `Sound Mixers \| CineCanon` | 24 |
| `Sound Designers \| CineCanon` | 27 |
| `Stunt lineage \| CineCanon` | 25 |
| `Stunt sequences \| CineCanon` | 27 |
| `For Composers \| CineCanon` | 25 |
| `Craft Dossiers \| CineCanon` | 26 |

Google typically rewrites very short titles. Adding a one-clause descriptor (e.g., `"Sound — Mixers, designers, foley & post"`) makes the title more keyword-rich and less likely to be rewritten.

### P2-2: `films` meta description is 163 characters (3 characters over the 160-char target)

`/home/user/bts/apps/web/app/films/page.tsx` line 23: `"Browse cited, confidence-graded technical data for thousands of films — cameras, lenses, formats, aspect ratios, and crew, filterable by decade, genre, and studio."` (163 chars). Cutting to ≤160 keeps the full description intact in search snippets.

**File:** `/home/user/bts/apps/web/app/films/page.tsx`, line 23.

### P2-3: `stunts` meta description is 162 characters (2 over)

`/home/user/bts/apps/web/app/stunts/page.tsx`: description is 162 chars. Same fix as P2-2.

**File:** `/home/user/bts/apps/web/app/stunts/page.tsx`.

### P2-4: `sound` meta description is 170 characters (10 over)

`/home/user/bts/apps/web/app/sound/page.tsx`: description is 170 chars.

**File:** `/home/user/bts/apps/web/app/sound/page.tsx`.

### P2-5: `awards` meta description is 272 characters (112 over)

`/home/user/bts/apps/web/app/awards/page.tsx`: description is 272 characters — nearly double the limit. Google will truncate heavily. The description names all awarding bodies; this should be condensed to the most impactful 155 characters.

**File:** `/home/user/bts/apps/web/app/awards/page.tsx`.

### P2-6: `decisions` meta description is 201 characters (41 over)

`/home/user/bts/apps/web/app/decisions/page.tsx`: description is 201 chars.

**File:** `/home/user/bts/apps/web/app/decisions/page.tsx`.

### P2-7: No `canonical` on `gear`, `stunts`, `tools`, `ask`, and several other index pages

The following pages export `metadata` but do not set `alternates.canonical`:

- `/gear/page.tsx`
- `/stunts/page.tsx` (and `/stunts/lineage`, `/stunts/people`, `/stunts/sequences`)
- `/tools/page.tsx` (and `/tools/cdl`, `/tools/coverage`, `/tools/frame-lines`)
- `/ask/page.tsx`
- `/search/page.tsx`
- `/format/page.tsx`
- `/societies/page.tsx`

Next.js 16 will derive a canonical from `metadataBase + current path` automatically when none is supplied, so this is not a hard error. But explicit canonicals are a stronger signal, especially for pages that receive query-string traffic (`/ask?q=`, `/search?q=`, `/films?tier=curated`). The `search` and `bookmarks` pages already declare `robots: { index: false }` which removes the urgency, but the others do not.

### P2-8: Canonical URL format is inconsistent across pages

Approximately half the pages use `alternates: { canonical: '/' }` (relative, relying on `metadataBase`) while the other half use `alternates: { canonical: `${siteUrl()}/path` }` (absolute). Both are functionally valid because `metadataBase` is set in the root layout. However the inconsistency makes it harder to audit and may cause subtle issues if `metadataBase` ever diverges from `siteUrl()`. The pattern should be standardised.

### P2-9: `tools/loadout` missing canonical

`/home/user/bts/apps/web/app/tools/loadout/page.tsx` accepts `?items=` and `?add=` query params. `?add=` redirects to canonical form, which is correct. However no explicit `robots: { index: false }` or canonical is set. URL-as-state pages (`?items=slug1,slug2`) will be indexed by crawlers as separate URLs unless a canonical points them back to `/tools/loadout`.

**File:** `/home/user/bts/apps/web/app/tools/loadout/page.tsx`.

### P2-10: `robots.ts` does not declare the four Phase 4 tool routes as indexable (no action needed, but confirm)

The `/robots.ts` allows all paths under `/` except `/admin/`. The four Phase 4 tools (`/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`) are reachable and indexable by default. This is correct behaviour — confirming no noindex was accidentally applied.

**File:** `/home/user/bts/apps/web/app/robots.ts`.

### P2-11: `llms.txt` lists `/decisions` and `/walkthroughs` as live without qualification

`/home/user/bts/apps/web/app/llms.txt/route.ts` (lines 93–94) lists both pages as active sections without noting that their content volume may be zero if tables are unseeded. AI engines reading `llms.txt` will dereference these URLs and may cite them as authoritative; an empty or placeholder state would erode Citation Precision.

**File:** `/home/user/bts/apps/web/app/llms.txt/route.ts`, lines 93–94.

### P2-12: No sitemap entry for any dynamic `walkthroughs`, `decisions`, `dossiers`, or `partnerships` detail pages

Even if individual detail slugs cannot be pre-enumerated (because they are DB-driven), a dedicated sitemap segment (e.g., `sitemap-editorial.xml`) querying `listWalkthroughs`, `listDecisionTrees`, `listCraftDossiers`, and `listPartnerships` would provide crawl-budget coverage for these high-value editorial pages.

### P2-13: `equipment/specs` page route exists in repo but is not reachable from the primary nav or sitemap

`/home/user/bts/apps/web/app/equipment/specs/page.tsx` exists as a route. It is linked from the footer (`/equipment/specs` → "spec browser") but not in any sitemap segment. The footer link is the only discoverable path. If it is a canonical feature surface it should be in `sitemap-gear.xml`.

**File:** `/home/user/bts/apps/web/app/equipment/specs/page.tsx`.

### P2-14: Collective poster thumbnails in collection/similar-productions sections have `alt=""`

In `ProductionDetail.tsx` (lines 879, 922, 970), poster thumbnails for "Other films in this collection" and "Similar productions" sections use `alt=""`. These thumbnails are 44px wide inside labeled link cards; the film title appears in adjacent text, making `alt=""` defensible as decorative. However best practice is `alt={title + " poster"}` since the image is the lead visual for the card.

**File:** `/home/user/bts/apps/web/components/productions/ProductionDetail.tsx`, lines 879, 922, 970.

### P2-15: `FilmographyTable` poster thumbnails use `alt=""`

`/home/user/bts/apps/web/components/people/FilmographyTable.tsx` (line 48) uses `alt=""` on 24px poster thumbnails. Same rationale as P2-14 — these are content images nested inside rows where the film title is already present as text.

**File:** `/home/user/bts/apps/web/components/people/FilmographyTable.tsx`, line 48.

### P2-16: `ask` page title "Ask anything" is 17 characters (too short)

`"Ask anything | CineCanon"` = 22 characters. Google tends to rewrite very short titles. A title like `"Ask — Cinematography Q&A | CineCanon"` (38 chars) would be more keyword-rich and stable.

**File:** `/home/user/bts/apps/web/app/ask/page.tsx`, line 11.

### P2-17: No OG image for section-index pages other than homepage, films, and crew

The root `opengraph-image.tsx` serves as a fallback, but it is a generic brand card with no page-specific information. When `/sound`, `/music`, `/awards`, `/tools`, `/stunts`, or the for-pro pages are shared on social media or cited by AI engines, the card reads "Cinematic technical reference" with no section-level context. Even a single reusable section-card template that accepts a `title` and `description` prop would significantly improve social/AEO presence for these pages.

---

## Appendix — Full URL × Code Status Table

All routes extracted from `apps/web/app/**\/page.tsx` (public, non-admin only). Status codes are code-derived (C = confirmed implemented, R = redirect, P = placeholder/empty state risk, - = not live/unreachable from this audit environment).

| Route | Code Status | Notes |
|---|---|---|
| `/` | C | Homepage — fully implemented |
| `/films` | C | |
| `/films/[slug]` | C | ISR 86400s |
| `/films/[slug]/scenes/[sceneSlug]` | C | noindex for imported tier |
| `/films/[slug]/loadout` | C | noindex |
| `/films/compare` | C | No revalidate set |
| `/crew` | C | |
| `/crew/[slug]` | C | ISR 86400s, conditional noindex |
| `/crew/compare` | C | No canonical |
| `/gear` | C | No canonical |
| `/gear/[manufacturer]` | C | |
| `/gear/[manufacturer]/[series]` | C | |
| `/gear/[manufacturer]/[series]/[item]` | C | |
| `/gear/compare` | C | URL-as-state, no canonical or noindex |
| `/gear/rentals` | C | console.warn fallback |
| `/gear/rentals/[slug]` | C | console.warn fallback |
| `/equipment/specs` | C | Not in sitemap |
| `/vfx` | C | |
| `/vfx/[slug]` | C | No revalidate |
| `/vfx/volumes` | C | console.warn fallback |
| `/vfx/volumes/[slug]` | C | console.warn fallback |
| `/vfx/title-houses` | C | console.warn fallback |
| `/vfx/title-houses/[slug]` | C | console.warn fallback |
| `/vfx/shot-breakdowns` | C | |
| `/stunts` | C | No canonical |
| `/stunts/people` | C | No canonical |
| `/stunts/sequences` | C | No canonical |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | C | No revalidate |
| `/stunts/companies` | C | |
| `/stunts/companies/[slug]` | C | No revalidate |
| `/stunts/rigging` | C | No revalidate on index |
| `/stunts/rigging/[slug]` | C | No revalidate |
| `/stunts/safety` | C | No revalidate on index |
| `/stunts/safety/[slug]` | C | No revalidate |
| `/stunts/lineage` | C | No canonical |
| `/stunts/people` | C | No canonical |
| `/stunts/coordinators` | R | Redirect → /stunts/people |
| `/stunts/schools/[slug]` | P | "Alumni mapping coming with phase 2" text |
| `/sound` | C | Not in sitemap |
| `/sound/mixers` | C | Not in sitemap |
| `/sound/designers` | C | Not in sitemap |
| `/sound/foley` | C | Not in sitemap |
| `/sound/post` | C | Not in sitemap |
| `/sound/effects` | C | Not in sitemap |
| `/sound/effects/libraries` | C | Not in sitemap |
| `/sound/effects/libraries/[slug]` | C | console.warn fallback |
| `/sound/houses` | C | Not in sitemap |
| `/sound/houses/[slug]` | C | |
| `/sound/adr-studios` | C | Not in sitemap |
| `/sound/adr-studios/[slug]` | C | |
| `/music` | C | Not in sitemap, desc 80 chars |
| `/music/composers` | C | Not in sitemap |
| `/music/scoring-stages` | C | Not in sitemap |
| `/music/scoring-stages/[slug]` | C | |
| `/music/orchestras` | C | Not in sitemap |
| `/music/orchestras/[slug]` | C | |
| `/music/supervisors` | C | Not in sitemap |
| `/music/supervision-agencies` | C | Not in sitemap |
| `/music/supervision-agencies/[slug]` | C | |
| `/music/cue-guides` | C | Not in sitemap |
| `/music/cues/[productionSlug]/[cueSlug]` | C | |
| `/music/scores/[productionSlug]` | C | |
| `/editing` | C | Not in sitemap |
| `/editing/editors` | C | Not in sitemap |
| `/editing/walkthroughs` | C | Not in sitemap |
| `/production-design` | C | Not in sitemap |
| `/production-design/designers` | C | Not in sitemap |
| `/production-design/works` | C | Not in sitemap |
| `/costume-hair-makeup` | C | Not in sitemap |
| `/costume-hair-makeup/designers` | C | Not in sitemap |
| `/costume-hair-makeup/effects-houses` | C | Not in sitemap |
| `/costume-hair-makeup/effects-houses/[slug]` | C | |
| `/costume-hair-makeup/construction-houses` | C | Not in sitemap |
| `/costume-hair-makeup/construction-houses/[slug]` | C | |
| `/costume-hair-makeup/costume-works` | C | Not in sitemap |
| `/costume-hair-makeup/makeup-works` | C | Not in sitemap |
| `/awards` | C | Not in sitemap, desc 272 chars |
| `/awards/cinematography` | R | Redirect → /awards/craft/cinematography |
| `/awards/craft/[craft]` | C | Not in sitemap |
| `/decisions` | P | Not in sitemap; "table not yet migrated" text |
| `/decisions/[slug]` | C | |
| `/walkthroughs` | C | Not in sitemap |
| `/walkthroughs/[slug]` | P | "Beats not yet annotated" when empty |
| `/dossiers` | C | Not in sitemap |
| `/dossiers/[slug]` | C | |
| `/partnerships` | C | Not in sitemap |
| `/partnerships/[slug]` | C | console.warn fallback |
| `/references` | C | Not in sitemap |
| `/references/[id]` | C | |
| `/locations` | C | Not in sitemap |
| `/locations/[id]` | C | |
| `/decades` | C | Not in sitemap |
| `/decades/[decade]` | C | |
| `/shots` | C | Not in sitemap |
| `/lookbook` | P | Not in sitemap; "upload coming soon" |
| `/format` | C | In sitemap-core |
| `/format/[slug]` | C | In sitemap-core |
| `/societies` | C | Not in sitemap |
| `/societies/[slug]` | C | |
| `/tools` | C | In sitemap-core |
| `/tools/coverage` | C | In sitemap-core |
| `/tools/loadout` | C | In sitemap-core; two h1; URL-as-state |
| `/tools/frame-lines` | C | In sitemap-core |
| `/tools/aces` | C | In sitemap-core |
| `/tools/cdl` | C | In sitemap-core |
| `/tools/scoring-session-cost` | C | NOT in sitemap |
| `/tools/stunt-rig-picker` | C | NOT in sitemap |
| `/tools/hdr-target-picker` | C | NOT in sitemap |
| `/tools/anamorphic-vs-spherical` | C | NOT in sitemap |
| `/queries` | C | Not in sitemap |
| `/queries/alexa65-sphero` | C | In sitemap-core |
| `/queries/dune-part-two-lenses` | C | In sitemap-core |
| `/queries/magic-hour-2023` | C | In sitemap-core |
| `/ask` | C | No canonical; desc 193 chars |
| `/search` | C | noindex (correct) |
| `/about` | C | Not in sitemap |
| `/methodology` | C | Not in sitemap |
| `/for-dps` | C | Not in sitemap |
| `/for-colorists` | C | Not in sitemap |
| `/for-gaffers` | C | Not in sitemap |
| `/for-coordinators` | C | Not in sitemap |
| `/for-editors` | C | Not in sitemap |
| `/for-sound-mixers` | C | Not in sitemap |
| `/for-sound-designers` | C | Not in sitemap |
| `/for-composers` | C | Not in sitemap |
| `/for-music-supervisors` | C | Not in sitemap |
| `/for-production-designers` | C | Not in sitemap |
| `/for-costume-designers` | C | Not in sitemap |
| `/for-makeup-artists` | C | Not in sitemap |
| `/bookmarks` | C | noindex (correct) |
| `/account` | C | No canonical (OK, private) |
| `/signin` | C | No canonical |
| `/import/letterboxd` | C | |
| `/claims/[id]` | C | Redirect-resolver, no metadata |
| `/sitemap.xml` | C | Index of 5 sub-sitemaps |
| `/sitemap-core.xml` | C | ~25 static entries |
| `/sitemap-films.xml` | C | All productions |
| `/sitemap-crew.xml` | C | Up to 50,000 crew |
| `/sitemap-gear.xml` | C | Manufacturers + series + items |
| `/sitemap-vfx.xml` | C | All VFX houses |
| `/robots.txt` | C | Via robots.ts; allows all, disallows /admin/ |
| `/llms.txt` | C | Dynamic, 1h revalidate |
| `/digest.xml` | C | Atom feed |
| `/api/v1` | C | Missing crew endpoint |
| `/api/v1/productions/[slug]` | C | |
| `/api/v1/crew/[slug]` | C | Unlisted in discovery doc |
| `/api/health` | C | |

---

## What I'd Fix First

The highest-impact action is to expand `sitemap-core.xml` (or add a new `sitemap-editorial.xml` segment) to cover the roughly 60 static section-index pages and editorial cross-cuts that are currently invisible to search crawlers and AI ingestion pipelines. Sound, music, editing, production design, costume/hair/makeup, awards, decisions, walkthroughs, dossiers, partnerships, references, about, methodology, the for-pro pages, and all four Phase 4 tools are fully implemented, actively linked from the footer and nav, and cited in `llms.txt` — but no sitemap entry exists for any of them. This means the crawl budget for the entire editorial depth of the site is effectively zero beyond what organic inlinking can achieve. Because CineCanon's AEO strategy depends on AI engines discovering and citing its pages, every hour these pages spend outside the sitemap is lost GEO surface. That fix is low-risk (additive, no DB changes), high-leverage, and should go before any SEO title-length polish.
