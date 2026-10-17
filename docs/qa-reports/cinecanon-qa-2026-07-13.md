# CineCanon QA Report — 2026-07-13

**Audit method:** Static code analysis of repository at `/home/user/bts` (branch `master`). Live network access to `cinecanon.com:443` was rejected by the session's egress proxy (`connect_rejected`); all findings are sourced from code. Production behavior may diverge if runtime environment variables, CDN rules, or database state differ from what the code implies.

---

## Summary

| Dimension | Count |
|---|---|
| Public static routes enumerated | 87 (index pages) + dynamic detail pages (films, crew, gear, VFX) |
| Admin / API / auth-gated routes excluded | ~45 |
| Total defects | 17 |
| **P0 — Broken** | **1** |
| **P1 — Degraded** | **7** |
| **P2 — Polish** | **9** |

Live HTTP status codes, redirect chains, asset byte sizes, and soft-404 detection could not be verified without network access. The issues below are confirmed from source code and are reproducible against the live deployment assuming the code reflects what was last deployed.

---

## P0 — Broken

### P0-1: `/icon-512.png` Does Not Exist — JSON-LD Organization Logo Is a Broken Reference

**File:** `apps/web/app/page.tsx:133`

The homepage emits an `Organization` JSON-LD node with:

```json
"logo": "https://cinecanon.com/icon-512.png"
```

No file named `icon-512.png` exists anywhere in the repository. The only file in `apps/web/public/` is `brand/cinecanon-mark.svg`. There is no Next.js route, `app/icon.png`, or static asset that would serve `/icon-512.png`. Any request to this URL returns a 404.

**Impact:** Google's structured data parser validates `Organization.logo` by fetching the URL. A 404 there causes the Organization schema to fail validation, which can suppress rich results site-wide and breaks any downstream system (knowledge-panel candidates, GEO citation boxes) that resolves the logo. This is the single highest-severity defect in the sweep.

**Evidence path:** `apps/web/public/` contains only `brand/cinecanon-mark.svg`. The Next.js App Router icon conventions (`app/icon.svg`, `app/apple-icon.tsx`) generate `/icon` and `/apple-icon` routes, not `/icon-512.png`.

---

## P1 — Degraded

### P1-1: Sitemap Coverage Gap — 65 of 87 Public Static Routes Are Missing From All Sitemaps

**Files:** `apps/web/app/sitemap-core.xml/route.ts`, `sitemap-vfx.xml/route.ts`, `sitemap-gear.xml/route.ts`, `sitemap-films.xml/route.ts`, `sitemap-crew.xml/route.ts`

The site has a sitemap index at `/sitemap.xml` pointing to five sub-sitemaps. Analysis of all sub-sitemaps against all public `page.tsx` routes shows that **65 out of 87 public static indexable routes** are not listed in any sitemap. Of those 65, none are private, redirects, or auth-gated — they are real, publicly accessible content pages.

`sitemap-core.xml` covers only: `/`, `/films`, `/crew`, `/gear`, `/vfx`, `/stunts` (plus 5 sub-pages), `/format` (plus dynamic slugs), `/ask`, 5 existing tools, and 3 hardcoded query pages. It was last meaningfully updated before Phases 2–4 shipped.

**Complete list of missing routes (65 total):**

Sound section (9): `/sound`, `/sound/adr-studios`, `/sound/designers`, `/sound/effects`, `/sound/effects/libraries`, `/sound/foley`, `/sound/houses`, `/sound/mixers`, `/sound/post`

Music section (8): `/music`, `/music/composers`, `/music/cue-guides`, `/music/orchestras`, `/music/scoring-stages`, `/music/supervision-agencies`, `/music/supervisors`, `/walkthroughs`

Editing section (3): `/editing`, `/editing/editors`, `/editing/walkthroughs`

Costume / Hair / Makeup section (6): `/costume-hair-makeup`, `/costume-hair-makeup/construction-houses`, `/costume-hair-makeup/costume-works`, `/costume-hair-makeup/designers`, `/costume-hair-makeup/effects-houses`, `/costume-hair-makeup/makeup-works`

Production Design section (3): `/production-design`, `/production-design/designers`, `/production-design/works`

VFX sub-sections (4): `/vfx` (index page is missing from sitemap-vfx which only covers `/vfx/[slug]`), `/vfx/shot-breakdowns`, `/vfx/title-houses`, `/vfx/volumes`

Stunts sub-sections (2): `/stunts/companies`, `/stunts/schools` (dynamic detail pages have no parent index in sitemap)

Phase 2-4 new surfaces (8): `/decisions`, `/dossiers`, `/partnerships`, `/shots`, `/lookbook`, `/decades`, `/societies`, `/references`

Role landing pages (12): `/for-dps`, `/for-colorists`, `/for-composers`, `/for-coordinators`, `/for-costume-designers`, `/for-editors`, `/for-gaffers`, `/for-makeup-artists`, `/for-music-supervisors`, `/for-production-designers`, `/for-sound-designers`, `/for-sound-mixers`

Phase 4 new tools (4): `/tools/anamorphic-vs-spherical`, `/tools/hdr-target-picker`, `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`

Other public pages (6): `/about`, `/awards`, `/methodology`, `/gear/compare`, `/gear/rentals`, `/films/compare`, `/crew/compare`, `/locations`

**Impact:** Googlebot, Perplexity, and other crawlers that rely on the sitemap to discover content cannot find the majority of the site. Sound, Music, Editing, Costume/Hair/Makeup, Production Design, Dossiers, and Decisions sections are completely invisible to sitemap-driven crawlers. This directly undermines CineCanon's AEO/GEO citation goals.

---

### P1-2: 42 `console.warn` / `console.error` Calls in Production Server Route Code

**Files (representative sample):**

- `apps/web/app/page.tsx:79-80` — two `console.error` calls on homepage query failures
- `apps/web/app/decisions/page.tsx:36` — `console.warn('[decisions] table missing', err)`
- `apps/web/app/partnerships/page.tsx:24` and `[slug]/page.tsx:48`
- `apps/web/app/vfx/volumes/page.tsx:28`, `vfx/title-houses/page.tsx:24`
- `apps/web/app/gear/rentals/page.tsx:24`, `gear/rentals/[slug]/page.tsx:40`
- `apps/web/app/music/orchestras/page.tsx:24`, `music/scoring-stages/page.tsx:23`
- `apps/web/app/sound/houses/page.tsx:41`, `sound/effects/libraries/page.tsx:23`
- `apps/web/app/costume-hair-makeup/effects-houses/page.tsx:24`
- `apps/web/lib/claimreview-readiness.ts:36`, `lib/tmdb.ts:47`, `lib/safe-auth.ts:27/36`
- 21 more page routes across sound, music, costume, editing, dossiers, walkthroughs sections

Total: 36 in `apps/web/app/` (non-admin) + 6 in `apps/web/lib/` = 42 calls.

**Impact:** CLAUDE.md mandates "Sentry first — errors go through `@sentry/nextjs`... Don't add console.log or console.error in production code paths." These `console.warn/error` calls are exclusively in catch blocks that swallow database query failures silently. When a table is missing or a query fails in production, the page silently renders an empty state and Sentry receives no event. Production failures in any of the Phase 2-4 sections (decisions, partnerships, walkthroughs, dossiers, VFX volumes, title houses, music orchestras, rental houses) are currently undetectable without manually watching server logs.

---

### P1-3: Empty `alt` on Informational Content Images

**Files and line numbers:**

- `apps/web/components/ui/EvidenceGallery.tsx:29` — `<img src={mediaUrl} alt="" .../>` on BTS evidence images. These carry `caption`, `source_title`, and `kind` metadata and are the primary visual evidence of cited claims. Marking them `alt=""` tells assistive technology they are decorative. A screen reader will skip them entirely, losing the visual context for the citation.
- `apps/web/components/productions/ProductionDetail.tsx:888, 931, 979` — `alt=""` on film poster thumbnails inside anchor links for collection members, similar productions, and semantically similar productions. The anchor links contain no other text label adjacent to the image within the `<Link>` element (only a separate `<p>` element outside the link). Screen reader users following those links receive no announcement of the destination film.
- `apps/web/app/gear/compare/page.tsx:196` — `alt=""` on film poster thumbnail inside a gear-compare link card. The film title is in a separate `<p>` outside the image's containing anchor.

Note: the following `alt=""` usages are **acceptable** (decorative or aria-hidden): `BrandLogo.tsx` (parent is `aria-hidden`), `UserMenu.tsx` (profile avatar decoration), `MediaGallery.tsx` (TMDb backdrop strip — decorative supplemental imagery), `FilmographyTable.tsx`, `VfxFilmography.tsx`, `vfx/[slug]` poster thumbnails (film title adjacent within same flex row).

---

### P1-4: 20 Static Index Pages Missing Canonical URL Tag

**File pattern:** `apps/web/app/*/page.tsx`

The following static pages have `export const metadata` without `alternates: { canonical: ... }`. Next.js does not auto-inject a canonical unless the page explicitly sets it. Without a canonical, search engines may index query-string variants (`?q=`, `?org=`, `?year=`) as duplicate pages:

`/ask`, `/gear`, `/format`, `/tools`, `/tools/frame-lines`, `/tools/loadout`, `/tools/coverage`, `/tools/cdl`, `/tools/aces`, `/stunts`, `/stunts/people`, `/stunts/sequences`, `/stunts/lineage`, `/societies`, `/crew/compare`, `/films/compare`, `/gear/compare`, `/search`, `/signin`, `/account`

Of these, `/ask`, `/gear`, `/format`, `/tools`, `/stunts`, and `/stunts/*` are high-traffic index pages with clear SEO value. `/search` and the compare pages accept query parameters and are especially at risk of indexing thin duplicate variants.

---

### P1-5: 93 Static Pages Missing `openGraph` Object in Their Exported Metadata

**File pattern:** `apps/web/app/*/page.tsx` (static metadata blocks)

The root layout at `apps/web/app/layout.tsx` provides a default `openGraph` block. However, when a child page's `export const metadata` object omits `openGraph`, Next.js merges only the fields the page provides — the root `openGraph.title` and `openGraph.description` override from the root. This means OG previews for nearly all section index pages (Sound, Music, Editing, VFX sub-sections, Costume/Hair/Makeup, Production Design, Phase 3-4 surfaces) show the generic "CineCanon — Cinematic Technical Reference" title rather than the page-specific title.

Affected category: all pages with static `export const metadata` that contain a custom `title` and `description` but no `openGraph` block. 93 such files were identified outside of `/admin/`.

---

### P1-6: Lookbook Meta Description Below Minimum Length

**File:** `apps/web/app/lookbook/page.tsx:9`

The description `'Find shots that look like a reference still. SigLIP-2 visual embeddings + HNSW index over the curated keyframe corpus.'` is 118 characters. The target minimum is 120 characters. Google may auto-generate a replacement snippet, which could pull the developer-roadmap prose from the page body (see P2-1 below).

---

### P1-7: Root Layout Default Description Exceeds Recommended Maximum

**File:** `apps/web/app/layout.tsx`

The default description `'Cited, confidence-graded technical data on every film — cameras, lenses, lighting, color, sound, music, stunts, and VFX — for working camera-department pros.'` is 157 characters. The commonly cited soft ceiling is 155 characters. Google frequently truncates at ~155 chars with an ellipsis, cutting off "pros." This affects any page that inherits the default (pages without a custom description metadata export).

---

## P2 — Polish

### P2-1: User-Visible Developer Roadmap Text on `/lookbook`

**File:** `apps/web/app/lookbook/page.tsx:39, 42, 73-81`

Three instances of developer/roadmap-facing copy are rendered directly in the page HTML visible to all visitors:

1. The `PageHero` eyebrow renders: **"Visual search · upload coming soon"** — this is the first text users and crawlers see at the top of the page.
2. The hero description contains: "Reference-still upload is in development" — user-visible statement of an unbuilt feature.
3. An `<aside>` block renders: "The bottleneck is hosting a SigLIP-2 inference endpoint. If you can host one — or contribute keyframe annotations to seed the corpus — reach out via the footer." — this is contributor-recruitment text, not end-user content.

The page has intentional "coming soon" framing, but the eyebrow label, in particular, reads as a status badge that would appear in link-preview tiles shared on social media.

---

### P2-2: User-Visible Placeholder on `/stunts/schools/[slug]`

**File:** `apps/web/app/stunts/schools/[slug]/page.tsx:160`

Every stunt school detail page renders a permanently visible dashed-border box containing:

> "Alumni mapping coming with phase 2."

This is inside a `<section>` with the heading "Notable alumni" that renders on all school detail pages unconditionally, regardless of whether phase 2 shipped. The box is visible to all users and to crawlers.

---

### P2-3: Dual `<h1>` in `/tools/loadout` — Both Render in DOM Simultaneously

**File:** `apps/web/app/tools/loadout/page.tsx:81, 91`

Two `<h1>` elements exist in the same component:

- Line 81: `<h1 className="mt-1 font-serif text-3xl text-zinc-50">Loadout calculator</h1>` — inside `<header className="mb-6 print:hidden">` (hidden only when printing)
- Line 91: `<h1 className="font-serif text-2xl">CineCanon — Loadout</h1>` — inside `<header className="mb-6 hidden print:block">` (hidden on screen via CSS)

Both `<h1>` elements are present in the DOM simultaneously. Tailwind's `hidden` class sets `display: none` but does not remove the element from the accessibility tree in all browser/AT combinations. Screen readers may announce both headings. The WCAG 2.2 AA expectation is one `<h1>` per page. A `print:block` class on a hidden element is a common pattern that creates this issue.

---

### P2-4: Multiple Section Index Pages With Very Short Rendered Title (< 30 Characters)

The root layout uses the title template `'%s | CineCanon'` (adds 12 characters). The following page titles produce rendered strings well below the 30-character guidance:

| Page | Title field | Rendered title | Length |
|---|---|---|---|
| `/gear` | `'Gear'` | `Gear \| CineCanon` | 16 |
| `/sound` | `'Sound'` | `Sound \| CineCanon` | 17 |
| `/music` | `'Music'` | `Music \| CineCanon` | 17 |
| `/tools` | `'Tools'` | `Tools \| CineCanon` | 17 |
| `/sound/foley` | `'Foley'` | `Foley \| CineCanon` | 17 |
| `/editing` | `'Editing'` | `Editing \| CineCanon` | 19 |
| `/awards` | `'Awards'` | `Awards \| CineCanon` | 18 |
| `/references` | `'References'` | `References \| CineCanon` | 22 |
| `/walkthroughs` | `'Walkthroughs'` | `Walkthroughs \| CineCanon` | 24 |
| `/editing/editors` | `'Editors'` | `Editors \| CineCanon` | 19 |
| `/music/composers` | `'Composers'` | `Composers \| CineCanon` | 21 |

Short titles reduce CTR in search results. They also lose keyword context — a user searching "cinema sound design reference" gets no signal from "Sound | CineCanon".

---

### P2-5: Two Pages With Rendered Title Exceeding 60 Characters

| Page | Rendered title | Length |
|---|---|---|
| `/vfx` | `VFX Houses — Studios, Boutique & In-House Facilities \| CineCanon` | 64 |
| `/about` | `About CineCanon — Sources, Curation & Citation Tiers \| CineCanon` | 64 |

Google truncates titles in SERPs at approximately 60 characters (580 CSS pixels). The "CineCanon" brand suffix at the end of both these titles will be clipped in search results.

---

### P2-6: `/import/letterboxd` Is an Orphaned Page — No Links From Nav or Footer

**File:** `apps/web/app/import/letterboxd/page.tsx`

A public page at `/import/letterboxd` exists with a proper metadata export (`title: 'Letterboxd import'`). Neither `TopNav.tsx` nor `Footer.tsx` contain any link to this URL. It is not listed in any sitemap. It is not linked from any other page in the codebase. The only way to reach it is by typing the URL directly. The page is effectively invisible to users and crawlers alike.

---

### P2-7: VFX Sitemap Omits Its Own Section Index and Three Sub-Section Indexes

**File:** `apps/web/app/sitemap-vfx.xml/route.ts`

`sitemap-vfx.xml` generates entries exclusively for `/vfx/[slug]` (individual VFX houses). It does not include:

- `/vfx` (the VFX index page — listed in `sitemap-core.xml` but not in `sitemap-vfx.xml`, creating a split-silo)
- `/vfx/shot-breakdowns`
- `/vfx/title-houses`
- `/vfx/volumes`

These three sub-section indexes also have no sitemap coverage in any of the five sub-sitemaps (confirmed in P1-1 above). The VFX sitemap was created when only the house directory existed; the Phase 3 sub-sections were never backfilled.

---

### P2-8: `/stunts/companies` Missing From `sitemap-core.xml`

**File:** `apps/web/app/sitemap-core.xml/route.ts`

`sitemap-core.xml` lists `/stunts`, `/stunts/people`, `/stunts/sequences`, `/stunts/lineage`, `/stunts/rigging`, and `/stunts/safety`. The `/stunts/companies` index page and its detail pages (`/stunts/companies/[slug]`) appear nowhere in any sitemap. The companies directory was introduced alongside schools and sequences but was not added to the sitemap when it shipped.

---

### P2-9: `gear/compare` Conditional `<h1>` — Three Render Paths Each Emit an `<h1>`

**File:** `apps/web/app/gear/compare/page.tsx:39, 64, 111`

Three separate conditional branches each emit an `<h1>`: "Compare gear" (no selection), "No items found" (bad slug), "Comparison" (results found). Only one branch renders at runtime, so the DOM contains exactly one `<h1>` per page load. This is not a WCAG violation but is a fragile pattern — a future refactor adding a shared header could silently produce two `<h1>` elements. Flagged as code smell at P2 for awareness.

---

## Appendix — URL × Status Table

Live HTTP status could not be verified (proxy block). The table below documents URL classification from code analysis, with inferred expected HTTP behavior.

| URL | Source | Expected status | Notes |
|---|---|---|---|
| `https://cinecanon.com/` | page.tsx | 200 | — |
| `https://cinecanon.com/icon-512.png` | JSON-LD reference | **404** | File does not exist — P0-1 |
| `https://cinecanon.com/robots.txt` | app/robots.ts | 200 | Correct; disallows /admin/, references /sitemap.xml |
| `https://cinecanon.com/sitemap.xml` | sitemap.xml/route.ts | 200 | Index; points to 5 sub-sitemaps |
| `https://cinecanon.com/sitemap-core.xml` | sitemap-core.xml/route.ts | 200 | 22 entries; missing 65 static routes |
| `https://cinecanon.com/sitemap-films.xml` | sitemap-films.xml/route.ts | 200 | DB-driven; dynamic per-film lastmod |
| `https://cinecanon.com/sitemap-crew.xml` | sitemap-crew.xml/route.ts | 200 | Filtered by credit_count >= 8 |
| `https://cinecanon.com/sitemap-gear.xml` | sitemap-gear.xml/route.ts | 200 | DB-driven manufacturer + series + item |
| `https://cinecanon.com/sitemap-vfx.xml` | sitemap-vfx.xml/route.ts | 200 | Only /vfx/[slug]; missing 4 sub-section pages |
| `https://cinecanon.com/llms.txt` | llms.txt/route.ts | 200 | DB-driven; valid llmstxt.org format |
| `https://cinecanon.com/films` | page.tsx | 200 | Has canonical; in sitemap |
| `https://cinecanon.com/crew` | page.tsx | 200 | Has canonical; in sitemap |
| `https://cinecanon.com/gear` | page.tsx | 200 | **Missing canonical** — P1-4 |
| `https://cinecanon.com/vfx` | page.tsx | 200 | Has canonical; in sitemap-core but NOT in sitemap-vfx |
| `https://cinecanon.com/stunts` | page.tsx | 200 | **Missing canonical** — P1-4 |
| `https://cinecanon.com/ask` | page.tsx | 200 | **Missing canonical** — P1-4 |
| `https://cinecanon.com/tools` | page.tsx | 200 | **Missing canonical** — P1-4 |
| `https://cinecanon.com/sound` | page.tsx | 200 | **Missing canonical, missing from all sitemaps** |
| `https://cinecanon.com/music` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/editing` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/costume-hair-makeup` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/production-design` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/walkthroughs` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/dossiers` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/decisions` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/partnerships` | page.tsx | 200 | Missing from all sitemaps |
| `https://cinecanon.com/lookbook` | page.tsx | 200 | Missing from all sitemaps; developer text visible |
| `https://cinecanon.com/import/letterboxd` | page.tsx | 200 | Orphaned; no inbound links; no sitemap entry |
| `https://cinecanon.com/awards/cinematography` | page.tsx | 308 | Redirects to /awards/craft/cinematography |
| `https://cinecanon.com/stunts/coordinators` | page.tsx | 308 | Redirects to /stunts/people |
| `https://cinecanon.com/admin/*` | middleware | 302/401 | Gated; disallowed in robots.txt |

---

## What I Would Fix First

The single most impactful fix is a two-file change: replace `siteUrl() + '/icon-512.png'` in `apps/web/app/page.tsx:133` with the existing SVG at `/brand/cinecanon-mark.svg` (or generate a proper 512×512 PNG and commit it to `public/`), then immediately attack the sitemap gap in `apps/web/app/sitemap-core.xml/route.ts`. Adding the 65 missing static routes to that file — Sound, Music, Editing, Costume/Hair/Makeup, Production Design, Phase 2-4 surfaces, role landing pages, and all four new Phase 4 tools — requires only appending URL entries to an existing array; it is a mechanical change with no logic risk. These two fixes together resolve P0-1 and P1-1, which together account for the Organization schema failure and the invisibility of the majority of the site to search crawlers, directly threatening CineCanon's AEO/GEO citation goals. After those land, converting the 42 `console.warn/error` catch blocks to `Sentry.captureException` calls (P1-2) is the next highest leverage action: it turns silent production failures across the Phase 2-4 sections into observable, alertable events.
