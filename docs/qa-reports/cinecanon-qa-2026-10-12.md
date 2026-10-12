# CineCanon QA Sweep — 2026-10-12

## Scope note

The production egress proxy for this session returns **403 Forbidden** for cinecanon.com (organization egress policy). All findings below are from static analysis of the local repository at `/home/user/bts` (branch `master`). Live HTTP status codes, image byte sizes, and console-output from a running browser could not be verified. Every finding is traceable to a specific source file.

---

## Summary

| Metric | Value |
|---|---|
| Public page routes audited (code) | 133 |
| Sitemap-covered static routes (sitemap-core) | ~25 + FORMAT_TAXONOMY |
| Dynamic-entity sitemaps | 4 (films, crew, gear, vfx) |
| P0 defects | 1 |
| P1 defects | 8 |
| P2 defects | 7 |

---

## P0 — Broken

### P0-1: `icon-512.png` does not exist — broken JSON-LD publisher logo

**File:** `apps/web/app/page.tsx` line 133

The homepage Organization JSON-LD block emits:

```
logo: siteUrl() + '/icon-512.png'
```

The file `/apps/web/public/icon-512.png` does not exist. The only icon asset in `public/` is `public/brand/cinecanon-mark.svg`. The only app-router icon is `app/icon.svg` (served as `/icon.svg`, not `/icon-512.png`). Any search engine or AI crawler that dereferences the logo URL in the JSON-LD `Organization` block will receive a 404, and schema validators will flag the publisher logo as broken. This also affects Google's Knowledge Panel eligibility for the site.

**Impact:** Broken structured data on the highest-traffic page; affects every Google Rich Result eligibility check against the Organization entity.

---

## P1 — Degraded

### P1-1: 4 Phase 4 tool pages absent from sitemap

**Files:** `apps/web/app/sitemap-core.xml/route.ts`

The four Phase 4 decision-support tools shipped in the most recent sprint are listed in the `/tools` index page and have correct page files, but none appear in `sitemap-core.xml`:

- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

The existing sitemap covers only the 5 original tools (`/tools/frame-lines`, `/tools/loadout`, `/tools/coverage`, `/tools/aces`, `/tools/cdl`). Google and AI crawlers will not discover the new pages unless a user links to them or they are added to the sitemap.

### P1-2: Large category of public pages absent from all five sitemaps

**Files:** `apps/web/app/sitemap-core.xml/route.ts` and the other four sitemap route files

The following high-value public routes have pages, metadata, and JSON-LD but are not enumerated in any sitemap:

- `/about`, `/methodology`
- `/awards` (the index; individual awards craft pages at `/awards/craft/[craft]`)
- `/references` and individual reference detail pages `/references/[id]`
- `/decisions`, `/decisions/[slug]`
- `/dossiers`, `/dossiers/[slug]`
- `/walkthroughs`, `/walkthroughs/[slug]`
- `/partnerships`, `/partnerships/[slug]`
- `/shots`, `/locations`, `/societies`, `/decades`, `/lookbook`
- All 12 `/for-*` role landing pages (`/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-editors`, `/for-composers`, `/for-music-supervisors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`, `/for-sound-designers`, `/for-sound-mixers`, `/for-coordinators`)
- `/sound` and all sub-paths (`/sound/mixers`, `/sound/designers`, `/sound/post`, `/sound/foley`, `/sound/houses`, `/sound/houses/[slug]`, `/sound/adr-studios`, `/sound/adr-studios/[slug]`, `/sound/effects`, `/sound/effects/libraries`, `/sound/effects/libraries/[slug]`)
- `/music` and all sub-paths (`/music/composers`, `/music/supervisors`, `/music/scoring-stages`, `/music/scoring-stages/[slug]`, `/music/orchestras`, `/music/orchestras/[slug]`, `/music/supervision-agencies`, `/music/supervision-agencies/[slug]`, `/music/cue-guides`, `/music/scores/[productionSlug]`, `/music/cues/[productionSlug]/[cueSlug]`)
- `/editing`, `/editing/editors`, `/editing/walkthroughs`
- `/production-design`, `/production-design/designers`, `/production-design/works`
- `/costume-hair-makeup` and all sub-paths
- `/stunts/companies`, `/stunts/companies/[slug]`, `/stunts/schools/[slug]`, `/stunts/safety/[slug]`
- `/vfx/shot-breakdowns`, `/vfx/title-houses`, `/vfx/title-houses/[slug]`, `/vfx/volumes`, `/vfx/volumes/[slug]`
- `/gear/rentals`, `/gear/rentals/[slug]`, `/equipment/specs`
- `/queries` index, `/format`, `/format/[slug]`

The `/for-*` pages are explicitly listed in `llms.txt` as AI-crawler entry points for specific working roles and are cross-linked in the footer. Their absence from sitemaps directly contradicts the GEO strategy documented in `CLAUDE.md`.

### P1-3: `/lookbook` is a "coming soon" placeholder with misleading metadata

**File:** `apps/web/app/lookbook/page.tsx`

The page's `<title>` is `Lookbook — visual reverse search | CineCanon` and the meta description reads "Find shots that look like a reference still. SigLIP-2 visual embeddings + HNSW index over the curated keyframe corpus." The actual page renders:

- PageHero eyebrow: `"Visual search · upload coming soon"`
- A section heading "What's working today" that redirects users to `/shots`
- An aside stating "The bottleneck is hosting a SigLIP-2 inference endpoint."

The metadata promises functional reverse image search that does not exist. Any visitor who arrives from a search engine expecting the advertised feature encounters a placeholder. The `revalidate = 86400` means it will stay cached for 24 hours even after the feature ships.

### P1-4: Stunt school detail pages display "Alumni mapping coming with phase 2" placeholder

**File:** `apps/web/app/stunts/schools/[slug]/page.tsx` lines 149–163

Every stunt school detail page unconditionally renders a "Notable alumni" section containing the text "Performer-and-coordinator alumni are wired in once phase 2 of the stunt-section roadmap lands" and an empty dashed-border box with the label "Alumni mapping coming with phase 2." This is visible to all site visitors including search engine crawlers and is not behind a feature flag or data guard.

### P1-5: 36 `console.error` / `console.warn` calls in production route handlers

CLAUDE.md convention: "Don't add console.log or console.error in production code paths — use Sentry."

The following non-admin public server-side route files use `console.warn` or `console.error` as their error handling instead of `Sentry.captureException`:

- `app/page.tsx` (2 calls: listRecentlyResolvedCorrections, listRecentCitations)
- `app/editing/walkthroughs/page.tsx`
- `app/sound/effects/libraries/[slug]/page.tsx` (2 calls)
- `app/sound/effects/libraries/page.tsx`
- `app/sound/adr-studios/[slug]/page.tsx`
- `app/sound/adr-studios/page.tsx`
- `app/sound/houses/page.tsx`
- `app/dossiers/[slug]/page.tsx`
- `app/vfx/volumes/[slug]/page.tsx`
- `app/vfx/volumes/page.tsx`
- `app/vfx/shot-breakdowns/page.tsx`
- `app/vfx/title-houses/[slug]/page.tsx`
- `app/vfx/title-houses/page.tsx`
- `app/production-design/works/page.tsx`
- `app/partnerships/[slug]/page.tsx`
- `app/partnerships/page.tsx`
- `app/gear/rentals/[slug]/page.tsx`
- `app/gear/rentals/page.tsx`
- `app/music/orchestras/[slug]/page.tsx`
- `app/music/orchestras/page.tsx`
- `app/music/cue-guides/page.tsx`
- `app/music/scoring-stages/page.tsx`
- `app/music/supervision-agencies/[slug]/page.tsx`
- `app/music/supervision-agencies/page.tsx`
- `app/costume-hair-makeup/costume-works/page.tsx`
- `app/api/search/nl/route.ts`

Silent failures on these pages mean DB schema gaps (many use the `try { … } catch { console.warn }` pattern as a migration-safety guard) are never surfaced to Sentry for tracking. An operator cannot distinguish "table legitimately empty" from "table crashed on query."

### P1-6: Content images with `alt=""` on public-facing pages

**Files** (all verified with surrounding context):

| File | Element | Context |
|---|---|---|
| `app/vfx/[slug]/page.tsx:172` | Film poster thumbnail in VFX-credits list | Image contains the only visual representation of the linked film |
| `app/format/[slug]/page.tsx:96` | Film poster thumbnail in format-usage grid | Same — title is below the image but alt="" leaves screen readers silent |
| `app/gear/[manufacturer]/[series]/page.tsx:268` | Film poster in filmography list | 36px thumbnail, decorative in context but missing film title in alt |
| `app/crew/[slug]/page.tsx:848` | Film poster in filmography list | 56px thumbnail with film title as adjacent text |
| `app/ask/page.tsx:254` | Film poster in search results | 50vw image with title nearby |

WCAG 2.1 SC 1.1.1 requires all non-decorative images to have text alternatives. Poster thumbnails linking to film pages are navigational images and should carry at minimum the film title in the `alt` attribute.

### P1-7: `unoptimized` prop on TMDb image domains suppresses Next.js optimization

**Files:** `app/films/compare/page.tsx`, `app/stunts/rigging/[slug]/page.tsx`, `app/stunts/companies/[slug]/page.tsx`, `app/stunts/page.tsx`, `app/vfx/[slug]/page.tsx`, `app/format/[slug]/page.tsx`, `app/ask/page.tsx`, `app/gear/[manufacturer]/[series]/page.tsx`, `app/gear/[manufacturer]/[series]/[item]/page.tsx`, `app/gear/compare/page.tsx`, `app/crew/[slug]/page.tsx`

`next.config.mjs` already whitelists `image.tmdb.org` in `remotePatterns`, yet multiple components pass `unoptimized` on TMDb posters. The comment in `next.config.mjs` explains this is needed "for keyframe admin pages that handle arbitrary URLs" but the same flag has spread to public-facing non-admin pages where `image.tmdb.org` is a known, whitelisted domain. These images bypass WebP/AVIF conversion and responsive resizing, increasing LCP on pages that rely on them.

### P1-8: 33 public pages missing `alternates.canonical` metadata

The following public pages export `metadata` without an `alternates.canonical` key. Without a canonical, Next.js does not emit `<link rel="canonical">`, leaving the canonical URL ambiguous for search engines when pages are reachable via multiple paths (query parameters, trailing slashes, etc.):

`/ask`, `/format`, `/format/[slug]`, `/gear` (index), `/gear/[manufacturer]`, `/gear/[manufacturer]/[series]`, `/gear/[manufacturer]/[series]/[item]`, `/gear/compare`, `/gear/rentals/[slug]`, `/films/compare`, `/films/[slug]/loadout`, `/films/[slug]/scenes/[sceneSlug]`, `/crew/compare`, `/stunts` (index), `/stunts/people`, `/stunts/sequences`, `/stunts/lineage`, `/stunts/companies/[slug]`, `/stunts/rigging/[slug]`, `/stunts/schools/[slug]`, `/stunts/sequences/[productionSlug]/[sequenceSlug]`, `/societies` (index), `/references/[id]`, `/search`, `/tools` (index), `/tools/cdl`, `/tools/coverage`, `/tools/frame-lines`, `/import/letterboxd`, `/account`, `/bookmarks`, `/signin`, `/claims/[id]`

---

## P2 — Polish

### P2-1: Short `<title>` values on major section index pages

With the root layout template `'%s | CineCanon'`, the following pages produce titles under 30 characters, which fall below the recommended 30–60 character range for Google title display:

| Rendered title | Chars | File |
|---|---|---|
| `Gear \| CineCanon` | 16 | `app/gear/page.tsx` |
| `Sound \| CineCanon` | 17 | `app/sound/page.tsx` |
| `Music \| CineCanon` | 17 | `app/music/page.tsx` |
| `Tools \| CineCanon` | 17 | `app/tools/page.tsx` |
| `Foley \| CineCanon` | 17 | `app/sound/foley/page.tsx` |
| `Score \| CineCanon` | 17 | `app/music/scores/[slug]/page.tsx` |
| `Stunts \| CineCanon` | 18 | `app/stunts/page.tsx` |
| `Awards \| CineCanon` | 18 | `app/awards/page.tsx` |
| `Editing \| CineCanon` | 19 | `app/editing/page.tsx` |
| `References \| CineCanon` | 22 | `app/references/page.tsx` |
| `Craft Dossiers \| CineCanon` | 26 | `app/dossiers/page.tsx` |
| `Production design \| CineCanon` | 29 | `app/production-design/page.tsx` |

The `awards/craft/[craft]` dynamic pages also fall short (18 chars when the craft slug is short).

### P2-2: Long `<title>` on one query page

`Films shot on ARRI ALEXA 65 + Panavision Sphero lenses | CineCanon` = **66 chars** (`app/queries/alexa65-sphero/page.tsx`). One character over the 65-char soft limit; Google will likely display it without truncation but it is marginally over budget.

### P2-3: Overlong meta descriptions (>160 chars) on at least 10 pages

Google truncates descriptions at approximately 155–160 characters. These pages emit full-length descriptions that will be cut mid-sentence in SERPs:

| Page | Chars |
|---|---|
| `/awards` | 272 |
| `/stunts/lineage` | 262 |
| `/costume-hair-makeup/effects-houses` | 260 |
| `/stunts/safety` | 252 |
| `/partnerships` | 242 |
| `/stunts/rigging` | 235 |
| `/equipment/specs` | 231 |
| `/for-composers` | 225 |
| `/references` | 221 |
| `/for-coordinators` | 216 |

### P2-4: Short meta descriptions (<120 chars) on several key pages

| Page | Chars | Description |
|---|---|---|
| `/music` | 80 | "Composers, music supervisors, and orchestrators — credited and cross-referenced." |
| `/editing` | 90 | "Editors and their assistants. Cited credits, cross-referenced to the productions they cut." |
| `/decades` | 61 | "Browse the archive by decade of release. 1920s through 2020s." |
| `/crew/compare` | 61 | "Side-by-side comparison for up to four people in the archive." |
| `/tools/loadout` | 61 | starts with "Build a camera + lens + filter + lighting kit from CineCanon" |

### P2-5: `/music` meta description notably thin

**File:** `app/music/page.tsx`

Description: `"Composers, music supervisors, and orchestrators — credited and cross-referenced."` (80 chars). The page covers scoring stages, orchestras, supervision agencies, cue guides, and score deep-dives in addition to composers. The description undersells the depth and will fail Google's Helpful Content expectations relative to the page's actual scope.

### P2-6: `robots.txt` does not disallow `/account`, `/bookmarks`, `/signin`

**File:** `app/robots.ts`

`robots.txt` only disallows `/admin/`. User-specific pages (`/account`, `/bookmarks`, `/import/letterboxd`) are crawlable and indexable. While Next.js does not generate canonical URLs for these without the alternates key (see P1-8), the absence of `disallow` rules means crawlers may index them. These pages carry thin or session-specific content.

### P2-7: `About CineCanon — Sources, Curation & Citation Tiers | CineCanon` at 64 chars

**File:** `app/about/page.tsx`

The rendered title is 64 characters — technically within budget (65-char soft limit) but will be on the edge of Google's display width. The double "CineCanon" (`About CineCanon … | CineCanon`) is also redundant and wastes title real estate.

---

## Appendix A — URL × Route Status (code-analysis)

| Route | Status | Sitemap | Notes |
|---|---|---|---|
| `/` | Renders (DB-dependent) | sitemap-core | OK |
| `/films` | Renders | sitemap-core | OK |
| `/films/[slug]` | Renders (notFound on miss) | sitemap-films | OK |
| `/films/[slug]/loadout` | Renders | None | Missing canonical |
| `/films/[slug]/scenes/[sceneSlug]` | Renders | None | Missing canonical |
| `/films/compare` | Renders | None | Missing canonical |
| `/crew` | Renders | sitemap-core | OK |
| `/crew/[slug]` | Renders (notFound on miss) | sitemap-crew (filtered) | OK |
| `/crew/compare` | Renders | None | Missing canonical |
| `/gear` | Renders | sitemap-gear (manufacturers) | OK |
| `/gear/[manufacturer]` | Renders | sitemap-gear | Missing canonical |
| `/gear/[manufacturer]/[series]` | Renders | sitemap-gear | Missing canonical |
| `/gear/[manufacturer]/[series]/[item]` | Renders | sitemap-gear (items) | Missing canonical |
| `/gear/compare` | Renders | None | Missing canonical |
| `/gear/rentals` | Renders (try/catch) | None | Missing from sitemap |
| `/gear/rentals/[slug]` | Renders (try/catch) | None | Missing from sitemap + canonical |
| `/equipment/specs` | Renders | None | Missing from sitemap |
| `/vfx` | Renders | sitemap-core | OK |
| `/vfx/[slug]` | Renders (notFound on miss) | sitemap-vfx | Missing canonical; alt="" on poster |
| `/vfx/shot-breakdowns` | Renders (try/catch) | None | Missing from sitemap |
| `/vfx/title-houses` | Renders (try/catch) | None | Missing from sitemap |
| `/vfx/title-houses/[slug]` | Renders (try/catch) | None | Missing from sitemap |
| `/vfx/volumes` | Renders (try/catch) | None | Missing from sitemap |
| `/vfx/volumes/[slug]` | Renders (try/catch) | None | Missing from sitemap |
| `/stunts` | Renders | sitemap-core | Missing canonical |
| `/stunts/people` | Renders | sitemap-core | Missing canonical |
| `/stunts/sequences` | Renders | sitemap-core | Missing canonical |
| `/stunts/lineage` | Renders | sitemap-core | Missing canonical |
| `/stunts/rigging` | Renders | sitemap-core | Missing canonical |
| `/stunts/safety` | Renders | sitemap-core | Missing canonical |
| `/stunts/companies` | Renders | None | Missing from sitemap + canonical |
| `/stunts/companies/[slug]` | Renders | None | Missing from sitemap + canonical |
| `/stunts/schools/[slug]` | Renders | None | Missing from sitemap + canonical; placeholder alumni section |
| `/stunts/coordinators` | Redirects to `/stunts/people` | None | Intentional redirect |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | Renders | None | Missing from sitemap + canonical |
| `/sound` | Renders | None | Missing from sitemap entirely |
| `/sound/*` (all sub-paths) | Renders (most try/catch) | None | Entire section missing from sitemap |
| `/music` | Renders | None | Missing from sitemap; thin description |
| `/music/*` (all sub-paths) | Renders | None | Entire section missing from sitemap |
| `/editing` | Renders | None | Missing from sitemap |
| `/editing/editors` | Renders | None | Missing from sitemap |
| `/editing/walkthroughs` | Renders (try/catch) | None | Missing from sitemap |
| `/production-design` | Renders | None | Missing from sitemap |
| `/production-design/*` | Renders | None | Missing from sitemap |
| `/costume-hair-makeup` | Renders | None | Missing from sitemap |
| `/costume-hair-makeup/*` | Renders | None | Missing from sitemap |
| `/awards` | Renders | None | Missing from sitemap |
| `/awards/craft/[craft]` | Renders | None | Missing from sitemap |
| `/awards/cinematography` | Redirects to `/awards/craft/cinematography` | None | Intentional redirect |
| `/references` | Renders | None | Missing from sitemap |
| `/references/[id]` | Renders | None | Missing from sitemap + canonical |
| `/about` | Renders | None | Missing from sitemap |
| `/methodology` | Renders | None | Missing from sitemap |
| `/decisions` | Renders (force-dynamic) | None | Missing from sitemap |
| `/decisions/[slug]` | Renders (try/catch) | None | Missing from sitemap |
| `/dossiers` | Renders | None | Missing from sitemap |
| `/dossiers/[slug]` | Renders (try/catch) | None | Missing from sitemap |
| `/walkthroughs` | Renders | None | Missing from sitemap |
| `/walkthroughs/[slug]` | Renders | None | Missing from sitemap |
| `/partnerships` | Renders (try/catch) | None | Missing from sitemap |
| `/partnerships/[slug]` | Renders (try/catch) | None | Missing from sitemap |
| `/shots` | Renders | None | Missing from sitemap |
| `/locations` | Renders | None | Missing from sitemap |
| `/societies` | Renders | None | Missing from sitemap |
| `/decades` | Renders | None | Missing from sitemap |
| `/lookbook` | Renders (coming soon) | None | Missing from sitemap; misleading metadata |
| `/queries` | Renders | None | Missing from sitemap |
| `/queries/alexa65-sphero` | Renders | sitemap-core | OK |
| `/queries/dune-part-two-lenses` | Renders | sitemap-core | OK |
| `/queries/magic-hour-2023` | Renders | sitemap-core | OK |
| `/format` | Renders | sitemap-core | Missing canonical |
| `/format/[slug]` | Renders | sitemap-core | Missing canonical; alt="" on poster |
| `/for-dps` | Renders | None | Missing from sitemap |
| `/for-colorists` | Renders | None | Missing from sitemap |
| `/for-gaffers` | Renders | None | Missing from sitemap |
| `/for-editors` | Renders | None | Missing from sitemap |
| `/for-composers` | Renders | None | Missing from sitemap |
| `/for-music-supervisors` | Renders | None | Missing from sitemap |
| `/for-production-designers` | Renders | None | Missing from sitemap |
| `/for-costume-designers` | Renders | None | Missing from sitemap |
| `/for-makeup-artists` | Renders | None | Missing from sitemap |
| `/for-sound-designers` | Renders | None | Missing from sitemap |
| `/for-sound-mixers` | Renders | None | Missing from sitemap |
| `/for-coordinators` | Renders | None | Missing from sitemap |
| `/tools` | Renders | sitemap-core | Missing canonical |
| `/tools/coverage` | Renders | sitemap-core | Missing canonical |
| `/tools/frame-lines` | Renders | sitemap-core | Missing canonical |
| `/tools/aces` | Renders | sitemap-core | OK (has alternates) |
| `/tools/cdl` | Renders | sitemap-core | Missing canonical |
| `/tools/loadout` | Renders | sitemap-core | OK (has alternates) |
| `/tools/scoring-session-cost` | Renders | None | Missing from sitemap (Phase 4 tools) |
| `/tools/stunt-rig-picker` | Renders | None | Missing from sitemap |
| `/tools/hdr-target-picker` | Renders | None | Missing from sitemap |
| `/tools/anamorphic-vs-spherical` | Renders | None | Missing from sitemap |
| `/ask` | Renders | sitemap-core | Missing canonical |
| `/search` | Renders | None | Missing from sitemap |
| `/claims/[id]` | Redirect (resolver) | None | OK — by design |
| `/account` | Renders (auth-gated) | None | OK — user-specific |
| `/bookmarks` | Renders (auth-gated) | None | OK — user-specific |
| `/signin` | Renders | None | OK — auth utility |
| `/admin/*` | Auth-gated (redirects) | robots.txt disallowed | OK |
| `/robots.txt` | Generates dynamically | — | OK |
| `/sitemap.xml` | Generates sitemap-index | — | OK |
| `/llms.txt` | Generates dynamically | — | OK |
| `/digest.xml` | Generates dynamically | — | OK |

---

## Appendix B — Console Violations in Production Route Handlers

The following files call `console.error` or `console.warn` in server-side rendering paths. Per `CLAUDE.md`: errors should route through `@sentry/nextjs`.

```
apps/web/app/page.tsx (2 instances)
apps/web/app/editing/walkthroughs/page.tsx
apps/web/app/sound/effects/libraries/[slug]/page.tsx (2)
apps/web/app/sound/effects/libraries/page.tsx
apps/web/app/sound/adr-studios/[slug]/page.tsx
apps/web/app/sound/adr-studios/page.tsx
apps/web/app/sound/houses/page.tsx
apps/web/app/dossiers/[slug]/page.tsx
apps/web/app/vfx/volumes/[slug]/page.tsx
apps/web/app/vfx/volumes/page.tsx
apps/web/app/vfx/shot-breakdowns/page.tsx
apps/web/app/vfx/title-houses/[slug]/page.tsx
apps/web/app/vfx/title-houses/page.tsx
apps/web/app/production-design/works/page.tsx
apps/web/app/partnerships/[slug]/page.tsx
apps/web/app/partnerships/page.tsx
apps/web/app/gear/rentals/[slug]/page.tsx
apps/web/app/gear/rentals/page.tsx
apps/web/app/music/orchestras/[slug]/page.tsx
apps/web/app/music/orchestras/page.tsx
apps/web/app/music/cue-guides/page.tsx
apps/web/app/music/scoring-stages/page.tsx
apps/web/app/music/supervision-agencies/[slug]/page.tsx
apps/web/app/music/supervision-agencies/page.tsx
apps/web/app/costume-hair-makeup/costume-works/page.tsx
apps/web/app/api/search/nl/route.ts
```

---

## What to Fix First

The single highest-leverage fix is **P0-1 + P1-2 combined as one commit**: add `icon-512.png` to `/public` (or change the JSON-LD logo reference to `/icon.svg` which already exists), and expand `sitemap-core.xml` to enumerate the 50+ public routes that are currently invisible to crawlers — starting with the 12 `/for-*` role pages (GEO strategy depends on them), the 4 new Phase 4 tools (they just shipped), and the 8 major section indexes (`/about`, `/methodology`, `/awards`, `/sound`, `/music`, `/editing`, `/decisions`, `/dossiers`, `/walkthroughs`, `/partnerships`). These two fixes together correct the site's structural crawlability with zero user-facing risk, and the broken logo in structured data is the only currently-confirmed broken asset reference in the codebase.
