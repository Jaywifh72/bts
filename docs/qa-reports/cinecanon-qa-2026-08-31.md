# CineCanon QA Sweep — 2026-08-31

**Scope:** Source-code-based audit of https://cinecanon.com (repo `/home/user/bts`, branch `master`). Live HTTP access was denied by the egress proxy (policy 403 on `cinecanon.com:443`), so this report is derived from static analysis of all 167 Next.js page files, route handlers, components, sitemap generators, metadata exports, JSON-LD builders, navigation components, and configuration files.

---

## Summary

| Category | Count |
|---|---|
| Pages audited (page.tsx files) | 167 |
| Route handlers | 28 |
| Sitemap segments | 5 (sitemap-index → core, films, crew, gear, vfx) |
| **P0 — Broken** | **2** |
| **P1 — Degraded** | **9** |
| **P2 — Polish** | **10** |
| **Total defects** | **21** |

---

## P0 — Broken

### P0-1: Organization logo URL in homepage JSON-LD resolves to 404

**File:** `apps/web/app/page.tsx`, line 133

```
logo: siteUrl() + '/icon-512.png',
```

There is no `/icon-512.png` served anywhere on the site. The `public/` directory contains only `brand/cinecanon-mark.svg`. The Next.js-generated icons are `app/icon.svg` (served as `/icon.svg`) and `app/apple-icon.tsx` (served as `/apple-icon`). No 512-pixel raster icon route or static file exists at `/icon-512.png`. Any AI engine or Google structured-data validator that dereferences the `publisher.logo` field in the `WebSite` JSON-LD on the homepage will receive a 404. This breaks Schema.org Organization entity validation and degrades AI citation accuracy.

**Impact:** Google Search Console will flag the invalid structured data; schema.org validators will warn; AI engines relying on the logo for entity disambiguation will silently discard the Organization node.

### P0-2: `redirect()` used instead of `permanentRedirect()` on stable stubs — 307 instead of 308

**Files:**
- `apps/web/app/awards/cinematography/page.tsx` — `redirect('/awards/craft/cinematography')` (307 Temporary)
- `apps/web/app/stunts/coordinators/page.tsx` — `redirect('/stunts/people')` (307 Temporary)

Both are comment-documented stable URL aliases that were created because AI engines and llms.txt prose naturally dereference these predictable paths. They have no metadata export and use Next.js `redirect()`, which emits HTTP 307. A 307 tells crawlers the redirect is temporary and they should continue indexing the source URL. A 308 or 301 (via `permanentRedirect()`) passes link equity and signals that the old URL is permanently retired. Crawlers will continue re-fetching and re-processing both old URLs on every crawl cycle, wasting budget.

**Impact:** Crawl budget waste; no link-equity transfer; the 307 source URLs may appear in SERP index alongside their canonical targets.

---

## P1 — Degraded

### P1-1: Massive sitemap coverage gap — 20+ section-level pages absent from all five sitemap segments

The sitemap index points to five segments: `sitemap-core.xml`, `sitemap-films.xml`, `sitemap-crew.xml`, `sitemap-gear.xml`, `sitemap-vfx.xml`. None of these segments include URLs for the following sections that have live `page.tsx` routes:

- `/awards` and all sub-pages (`/awards/craft/[craft]`, `/awards/cinematography` redirect)
- `/sound` (and `/sound/post`, `/sound/effects`, `/sound/foley`, `/sound/adr-studios`, `/sound/houses`, `/sound/effects/libraries`, ADR/house/library detail pages)
- `/music` (and `/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`, `/music/cue-guides`, score/orchestra detail pages)
- `/editing` and `/editing/editors`, `/editing/walkthroughs`
- `/production-design` (and `/production-design/designers`, `/production-design/works`)
- `/costume-hair-makeup` (and sub-pages: designers, effects houses, construction houses, costume/makeup dossiers)
- `/about`, `/methodology`
- `/decisions` and `/decisions/[slug]`
- `/walkthroughs` and `/walkthroughs/[slug]`
- `/dossiers` and `/dossiers/[slug]`
- `/partnerships` and `/partnerships/[slug]`
- `/locations` and `/locations/[id]`
- `/decades` and `/decades/[decade]`
- `/shots`
- `/references` and `/references/[id]`
- `/societies` and `/societies/[slug]`
- `/queries` (index page at `/queries/page.tsx`) — note that 3 specific query pages are in the sitemap but the index is not
- All 13 `/for-*` role-specific landing pages (for-dps, for-colorists, for-gaffers, etc.)
- All stunt sub-pages: `/stunts/companies`, `/stunts/schools`, `/stunts/companies/[slug]`, `/stunts/schools/[slug]`, `/stunts/rigging/[slug]`, `/stunts/safety/[slug]`, `/stunts/sequences/[slug]/[slug]`

**Confirmed via:** `sitemap-core.xml/route.ts` — only 22 static entries; cross-checked all other segments.

**Impact:** Googlebot and AI crawlers discover these pages only via internal links. The sitemap is the authoritative crawl directive; anything not listed gets deprioritized. The `/awards`, `/sound`, `/music`, `/editing`, `/production-design` sections are major content pillars with no sitemap representation.

### P1-2: Phase 4 decision-support tools missing from sitemap

The four Phase 4 tools confirmed live in `app/tools/page.tsx` and having their own `page.tsx` files are absent from `sitemap-core.xml`:

- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

The sitemap includes only the five original tools (frame-lines, loadout, coverage, aces, cdl). The parent `/tools` entry is present but detail tool pages are excluded. These are the most GEO-relevant tool pages given their use by specific craft departments.

**Impact:** The Phase 4 tools will not be crawled on a structured schedule; AI engine citation of these tools depends entirely on link traversal from `/tools`.

### P1-3: `console.error` and `console.warn` in server-component production code — violates project convention

**CLAUDE.md** explicitly states: "Don't add console.log or console.error in production code paths — use Sentry."

The following files use `console.error` or `console.warn` in server-component render paths (not in tests or commented-out code):

| File | Call |
|---|---|
| `app/page.tsx` (lines 79-80) | `console.error('[homepage] listRecentlyResolvedCorrections failed')`, `console.error('[homepage] listRecentCitations failed')` |
| `app/editing/walkthroughs/page.tsx` | `console.warn('[edit-walkthroughs]', e)` |
| `app/sound/effects/libraries/[slug]/page.tsx` | `console.warn` (×2) |
| `app/sound/effects/libraries/page.tsx` | `console.warn` |
| `app/sound/adr-studios/[slug]/page.tsx` | `console.warn(e)` |
| `app/sound/adr-studios/page.tsx` | `console.warn` |
| `app/sound/houses/page.tsx` | `console.warn` |
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
| `app/api/search/nl/route.ts` | `console.error` |

The pattern in most of these is a `try/catch` that falls back to an empty state silently from the user's perspective but outputs to console. On Vercel, this emits to function logs but not to Sentry, so the monitoring team has no alerting on these table-missing or query-failure conditions. The homepage `console.error` calls are particularly concerning as they fire on every page render for the most-trafficked page.

### P1-4: `alt=""` used on informational poster thumbnail images

`alt=""` is the correct HTML for purely decorative images. However, the following usages are on identifiable-content images where a blank alt degrades screen-reader experience and prevents crawlers from indexing the image-film association:

| File | Context |
|---|---|
| `app/vfx/[slug]/page.tsx` (line 172) | Film poster thumbnail in VFX filmography list |
| `app/gear/[manufacturer]/[series]/page.tsx` (line 268) | Film poster in gear usage context |
| `app/crew/[slug]/page.tsx` (line 848) | Film poster in crew filmography |
| `components/productions/ProductionDetail.tsx` (lines 888, 931, 979) | Multiple poster images in production detail |
| `components/productions/MediaGallery.tsx` (line 34) | Gallery thumbnail |
| `components/vfx/VfxFilmography.tsx` (line 28) | Film poster in VFX filmography |

The homepage shot-wall images (`app/page.tsx`, lines 355-362) correctly use descriptive alt text. The issue is isolated to secondary poster thumbnails used as visual anchors within lists and filmographies, where at minimum a film title + "(poster)" string would be meaningful.

### P1-5: Meta description length violations on major section pages

| Page | Description length | Status |
|---|---|---|
| `/awards` | 272 chars | 70% over 160-char target |
| `/sound` | 170 chars | Over |
| `/stunts` | 162 chars | Over |
| `/films` (index) | 163 chars | Over |
| `/about` | 115 chars | Under 120 |
| `/music` | 80 chars | Critically short — will show fragment in SERP |

Google truncates meta descriptions at approximately 160 characters. The `/awards` description at 272 characters will be cut mid-sentence. The `/music` description at 80 characters is too sparse for competitive SERP click-through.

### P1-6: Footer links `/editing/walkthroughs` but the unified index lives at `/walkthroughs`

The footer's "Cross-cuts" column links to `/editing/walkthroughs` (which shows only edit-scene walkthroughs via `listWalkthroughs(db, { kind: 'edit-scene' })`). The canonical walkthrough hub at `/walkthroughs` (a separate `page.tsx`) aggregates all three walkthrough types: edit-scene, music-cue, and vfx-shot. Users who click the footer link only see edit walkthroughs, not the full set. The footer should point to `/walkthroughs` as the canonical index, and `/editing/walkthroughs`, `/music/cue-guides`, `/vfx/shot-breakdowns` can be the per-craft subpages.

### P1-7: Missing canonical `alternates` on four public section pages

Four public pages with unique, non-parameterised URLs are missing `alternates: { canonical: '...' }` in their metadata exports:

| Page | File |
|---|---|
| `/stunts` | `app/stunts/page.tsx` |
| `/tools` | `app/tools/page.tsx` |
| `/gear` | `app/gear/page.tsx` |
| `/format` | `app/format/page.tsx` |

Without a canonical tag, Next.js/Vercel may serve the page from multiple origin paths (e.g., with/without trailing slash, CDN edge variants) and Google may arbitrarily choose a canonical. The rest of the site's sections — `/about`, `/films`, `/crew`, `/sound`, `/music`, etc. — all have canonical tags.

### P1-8: No Content-Security-Policy header configured

`next.config.mjs` sets X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy, but does **not** include a Content-Security-Policy header. Given that the site embeds YouTube iframes, TMDb images, and Vercel Analytics scripts, an absent CSP is a meaningful security gap for a site with user accounts and OAuth sign-in.

### P1-9: `listRecentlyResolvedCorrections` and `listRecentCitations` silently empty homepage sections without Sentry alert

In `app/page.tsx` lines 79-80, the catch blocks swallow errors and return empty arrays. If the underlying queries fail in production (e.g., missing table after a partial migration), the "Corrections resolved" and "Citations attached" homepage columns silently go blank with no engineer alerting. Combined with P1-3 (console.error instead of Sentry), this means a production DB degradation would be invisible until a user reports it.

---

## P2 — Polish

### P2-1: Single-word `<title>` values produce very short SERP strings

Several major sections use single-word titles that, combined with the layout template `'%s | CineCanon'`, produce titles of 17-26 characters — well below the 30-60 character target:

| Page | Rendered title | Chars |
|---|---|---|
| `/tools` | Tools \| CineCanon | 17 |
| `/music` | Music \| CineCanon | 17 |
| `/sound` | Sound \| CineCanon | 17 |
| `/stunts` | Stunts \| CineCanon | 18 |
| `/awards` | Awards \| CineCanon | 18 |
| `/walkthroughs` | Walkthroughs \| CineCanon | 24 |
| `/dossiers` | Craft Dossiers \| CineCanon | 26 |

These are below Google's effective SERP display threshold and miss the opportunity to include relevant keywords in the title tag. Comparable pages like `/crew` use "Crew — Directors, DPs, Editors & Designers | CineCanon" (50 chars with template).

### P2-2: Film detail page titles frequently exceed 60 characters

The film detail title format `'{title} ({year}) — Cameras, Lenses & Crew'` adds approximately 24 characters of fixed suffix. Any film with a title longer than 36 characters will exceed 60 characters in the `<title>` tag. Examples:

- "Everything Everywhere All at Once (2022) — Cameras, Lenses & Crew" = 65 chars
- "The Lord of the Rings: The Fellowship of the Ring (2001) — Cameras, Lenses & Crew" = 81 chars

These will be truncated by Google. The suffix "— Cameras, Lenses & Crew" is redundant when "| CineCanon" is appended by the layout template, making the rendered title "... — Cameras, Lenses & Crew | CineCanon".

### P2-3: `/format` page missing canonical in metadata

`app/format/page.tsx` exports `metadata` with `title` and `description` but no `alternates: { canonical: '/format' }`. Cross-reference with P1-7.

### P2-4: `awards/cinematography` and `stunts/coordinators` redirect stubs have no metadata

`app/awards/cinematography/page.tsx` and `app/stunts/coordinators/page.tsx` contain only the import and redirect call — no metadata export. When Google's crawler follows a link to these before the 307 fires, the `<title>` will fall back to the layout default ("CineCanon — Cinematic Technical Reference"). Adding a `robots: { index: false }` metadata export would be cleaner.

### P2-5: `/walkthroughs` title not keyword-rich

The walkthrough index page (`app/walkthroughs/page.tsx`) uses `title: 'Walkthroughs'`. The description is adequate, but the title misses the opportunity to surface keywords like "edit breakdowns, cue guides, VFX shot breakdowns" that are the primary search intent for this content.

### P2-6: No `robots` meta tag blocking `/bookmarks`, `/account`, `/import/letterboxd`, `/signin`

These user-specific pages lack `robots: { index: false }` in their metadata exports. Without it, they rely solely on Googlebot choosing not to index them because they return empty/auth-gated content. Adding explicit noindex to session-specific pages is a hygiene measure.

### P2-7: `/public` directory has only one file — no static favicon fallback

`public/brand/cinecanon-mark.svg` is the only file in `/public`. The `icon.svg` (Next.js file-based icon) and `apple-icon.tsx` (Satori-generated) handle modern browsers, but there is no `favicon.ico` fallback for older clients and email clients that expect `/favicon.ico`.

### P2-8: `lastmod` omitted on sitemap-gear and sitemap-vfx

The sitemap-gear route includes a comment explaining that `lastmod` is omitted because gear DB queries don't expose `updated_at`. The sitemap-vfx route also omits `lastmod`. While the comment correctly notes that a fake dynamic timestamp degrades trust, omitting `lastmod` entirely means Google cannot do incremental recrawls — it must crawl every URL on every pass. Adding `updated_at` to the gear and VFX DB queries would resolve this.

### P2-9: `/awards/cinematography` redirect hard-codes a single craft slug

The redirect from `awards/cinematography/page.tsx` hard-codes the craft slug "cinematography". If a new craft category is added (e.g., `/awards/craft/sound-design`), a new stub would need to be manually created. Low-risk but a maintenance pattern worth noting.

### P2-10: Description for `/about` slightly under 120 characters

`'How CineCanon sources its data, what is hand-curated, what comes from TMDb, and how to read the technical metadata.'` = 115 characters. 5 characters short of the 120-char lower bound. Minimal impact but worth rounding up.

---

## Appendix — Full URL × Status Table

> Live HTTP requests were blocked by the egress proxy; statuses reflect route design intent derived from source code.

| URL | Source type | Expected status | Notes |
|---|---|---|---|
| `https://cinecanon.com/` | `app/page.tsx` | 200 | Server component, DB queries, revalidate 3600 |
| `/films` | `app/films/page.tsx` | 200 | Dynamic with search params |
| `/films/[slug]` | nested page | 200 / 404 | generateStaticParams for curated; ISR for rest |
| `/films/[slug]/scenes/[sceneSlug]` | nested page | 200 / 404 | |
| `/crew` | `app/crew/page.tsx` | 200 | |
| `/crew/[slug]` | nested page | 200 / 404 | |
| `/crew/compare` | page | 200 | |
| `/gear` | `app/gear/page.tsx` | 200 | No canonical tag |
| `/gear/[manufacturer]/[series]/[item]` | nested page | 200 / 404 | |
| `/gear/compare` | page | 200 | |
| `/gear/rentals` | page | 200 | console.warn on DB miss |
| `/gear/rentals/[slug]` | nested page | 200 / 404 | console.warn on DB miss |
| `/vfx` | `app/vfx/page.tsx` | 200 | |
| `/vfx/[slug]` | nested page | 200 / 404 | |
| `/vfx/volumes` | page | 200 | console.warn on DB miss |
| `/vfx/volumes/[slug]` | nested page | 200 / 404 | console.warn on DB miss |
| `/vfx/title-houses` | page | 200 | console.warn on DB miss |
| `/vfx/title-houses/[slug]` | nested page | 200 / 404 | |
| `/vfx/shot-breakdowns` | page | 200 | console.warn on DB miss; **not in sitemap** |
| `/stunts` | `app/stunts/page.tsx` | 200 | No canonical tag |
| `/stunts/people` | page | 200 | |
| `/stunts/sequences` | page | 200 | |
| `/stunts/companies` | page | 200 | **Not in sitemap** |
| `/stunts/companies/[slug]` | nested page | 200 / 404 | |
| `/stunts/coordinators` | page | **307** | Should be 308; no metadata |
| `/stunts/lineage` | page | 200 | |
| `/stunts/rigging` | page | 200 | |
| `/stunts/rigging/[slug]` | nested page | 200 / 404 | |
| `/stunts/safety` | page | 200 | |
| `/stunts/safety/[slug]` | nested page | 200 / 404 | |
| `/stunts/schools/[slug]` | nested page | 200 / 404 | |
| `/stunts/sequences/[p]/[s]` | nested page | 200 / 404 | |
| `/sound` | page | 200 | **Not in sitemap** |
| `/sound/post` | page | 200 | **Not in sitemap** |
| `/sound/effects` | page | 200 | **Not in sitemap** |
| `/sound/foley` | page | 200 | **Not in sitemap** |
| `/sound/adr-studios` | page | 200 | console.warn |
| `/sound/houses` | page | 200 | console.warn |
| `/sound/effects/libraries` | page | 200 | console.warn |
| `/sound/effects/libraries/[slug]` | nested page | 200 / 404 | console.warn ×2 |
| `/sound/adr-studios/[slug]` | nested page | 200 / 404 | console.warn |
| `/sound/houses/[slug]` | nested page | 200 / 404 | |
| `/music` | page | 200 | **Not in sitemap** |
| `/music/composers` | page | 200 | **Not in sitemap** |
| `/music/scoring-stages` | page | 200 | console.warn |
| `/music/orchestras` | page | 200 | console.warn |
| `/music/supervisors` | page | 200 | |
| `/music/cue-guides` | page | 200 | console.warn; **not in sitemap** |
| `/music/scores/[productionSlug]` | nested page | 200 / 404 | |
| `/music/orchestras/[slug]` | nested page | 200 / 404 | console.warn |
| `/music/scoring-stages/[slug]` | nested page | 200 / 404 | |
| `/music/supervision-agencies` | page | 200 | console.warn |
| `/music/supervision-agencies/[slug]` | nested page | 200 / 404 | console.warn |
| `/music/cues/[p]/[c]` | nested page | 200 / 404 | |
| `/editing` | page | 200 | **Not in sitemap** |
| `/editing/editors` | page | 200 | **Not in sitemap** |
| `/editing/walkthroughs` | page | 200 | edit-only; footer links here but index at `/walkthroughs` |
| `/production-design` | page | 200 | **Not in sitemap** |
| `/production-design/designers` | page | 200 | **Not in sitemap** |
| `/production-design/works` | page | 200 | console.warn; **not in sitemap** |
| `/costume-hair-makeup` | page | 200 | **Not in sitemap** |
| `/costume-hair-makeup/designers` | page | 200 | |
| `/costume-hair-makeup/effects-houses` | page | 200 | |
| `/costume-hair-makeup/construction-houses` | page | 200 | |
| `/costume-hair-makeup/costume-works` | page | 200 | |
| `/costume-hair-makeup/makeup-works` | page | 200 | |
| `/awards` | page | 200 | **Not in sitemap**; desc 272 chars |
| `/awards/cinematography` | page | **307** | Should be 308 |
| `/awards/craft/[craft]` | nested page | 200 | |
| `/walkthroughs` | page | 200 | **Not in sitemap** |
| `/walkthroughs/[slug]` | nested page | 200 / 404 | |
| `/dossiers` | page | 200 | **Not in sitemap** |
| `/dossiers/[slug]` | nested page | 200 / 404 | console.warn |
| `/decisions` | page | 200 | **Not in sitemap** |
| `/decisions/[slug]` | nested page | 200 / 404 | |
| `/partnerships` | page | 200 | console.warn; **not in sitemap** |
| `/partnerships/[slug]` | nested page | 200 / 404 | console.warn |
| `/locations` | page | 200 | **Not in sitemap** |
| `/locations/[id]` | nested page | 200 / 404 | |
| `/decades` | page | 200 | **Not in sitemap** |
| `/decades/[decade]` | nested page | 200 / 404 | |
| `/shots` | page | 200 | **Not in sitemap** |
| `/references` | page | 200 | **Not in sitemap** |
| `/references/[id]` | nested page | 200 / 404 | |
| `/societies` | page | 200 | **Not in sitemap** |
| `/societies/[slug]` | nested page | 200 / 404 | |
| `/format` | page | 200 | No canonical; **not in sitemap** |
| `/format/[slug]` | nested page | 200 | In sitemap-core via FORMAT_TAXONOMY |
| `/tools` | page | 200 | No canonical; title 17 chars |
| `/tools/coverage` | page | 200 | In sitemap |
| `/tools/loadout` | page | 200 | In sitemap |
| `/tools/frame-lines` | page | 200 | In sitemap |
| `/tools/aces` | page | 200 | In sitemap |
| `/tools/cdl` | page | 200 | In sitemap |
| `/tools/scoring-session-cost` | page | 200 | **Not in sitemap** |
| `/tools/stunt-rig-picker` | page | 200 | **Not in sitemap** |
| `/tools/hdr-target-picker` | page | 200 | **Not in sitemap** |
| `/tools/anamorphic-vs-spherical` | page | 200 | **Not in sitemap** |
| `/ask` | page | 200 | In sitemap |
| `/queries` | page | 200 | **Not in sitemap** (only 3 sub-pages are) |
| `/queries/alexa65-sphero` | page | 200 | In sitemap |
| `/queries/dune-part-two-lenses` | page | 200 | In sitemap |
| `/queries/magic-hour-2023` | page | 200 | In sitemap |
| `/about` | page | 200 | **Not in sitemap** |
| `/methodology` | page | 200 | **Not in sitemap** |
| `/lookbook` | page | 200 | |
| `/for-dps` | page | 200 | **Not in sitemap** |
| `/for-colorists` | page | 200 | |
| `/for-gaffers` | page | 200 | |
| `/for-coordinators` | page | 200 | |
| `/for-sound-mixers` | page | 200 | |
| `/for-sound-designers` | page | 200 | |
| `/for-composers` | page | 200 | |
| `/for-music-supervisors` | page | 200 | |
| `/for-editors` | page | 200 | |
| `/for-production-designers` | page | 200 | |
| `/for-costume-designers` | page | 200 | |
| `/for-makeup-artists` | page | 200 | |
| `/bookmarks` | page | 200 | User-specific; no noindex |
| `/account` | page | 200 | User-specific; no noindex |
| `/import/letterboxd` | page | 200 | User-specific |
| `/signin` | page | 200 | Auth page |
| `/search` | page | 200 | |
| `/claims/[id]` | redirect handler | 307 / 404 | No metadata |
| `/robots.txt` | `app/robots.ts` | 200 | Correctly disallows /admin/ |
| `/sitemap.xml` | `app/sitemap.xml/route.ts` | 200 | Sitemap index → 5 segments |
| `/sitemap-core.xml` | route | 200 | 22 static URLs only |
| `/sitemap-films.xml` | route | 200 | Dynamic from DB |
| `/sitemap-crew.xml` | route | 200 | Filtered to indexable crew only |
| `/sitemap-gear.xml` | route | 200 | No lastmod |
| `/sitemap-vfx.xml` | route | 200 | No lastmod |
| `/llms.txt` | `app/llms.txt/route.ts` | 200 | Dynamic; references /api/v1/aeo/ endpoints |
| `/digest.xml` | `app/digest.xml/route.ts` | 200 | Atom 1.0 feed |
| `/api/v1` | route | 200 | Discovery doc |
| `/api/v1/productions/[slug]` | route | 200 / 404 | Public API |
| `/api/v1/crew/[slug]` | route | 200 / 404 | Public API |
| `/api/v1/aeo/claims` | route | 200 | AEO claims feed |
| `/api/v1/aeo/digest.xml` | route | 200 | AEO Atom feed |
| `/api/v1/aeo/precision` | route | 200 | |
| `/icon-512.png` | — | **404** | Referenced in JSON-LD Organization logo; does not exist |
| `/icon.svg` | `app/icon.svg` | 200 | Next.js file-based icon |
| `/apple-icon` | `app/apple-icon.tsx` | 200 | Satori-generated 180×180 PNG |
| `/favicon.ico` | — | **404** | No static favicon.ico in /public |

---

## What I'd Fix First

The single highest-leverage fix is **P0-1: add a static `/icon-512.png`** to the `/public` directory (or update the JSON-LD Organization logo URL in `app/page.tsx` line 133 to point to the existing `/icon.svg` or `/opengraph-image`). This is a one-line change that eliminates a broken URL from the homepage's structured data — the most-read and most-cited page on the site. Immediately after that, extend **`sitemap-core.xml`** to include the 20+ missing section-level URLs — particularly `/awards`, `/sound`, `/music`, `/editing`, `/production-design`, and the four Phase 4 tools — because the sitemap is the primary crawl directive and every section absent from it is effectively invisible to systematic crawl scheduling. These two fixes (one file edit, one route file edit) unblock the GEO/AEO impact from the Phase 4 tool releases and prevent a growing debt as new sections are added without corresponding sitemap entries. The `redirect()` → `permanentRedirect()` change on the two redirect stubs is a one-liner with real link-equity impact and should be bundled into the same PR.
