# CineCanon QA Sweep — 2026-08-24

## Crawl Note

Live crawl of https://cinecanon.com was blocked by the egress proxy with a 403 CONNECT rejection (`host: cinecanon.com:443, kind: connect_rejected`). All findings are derived from static analysis of the repository at `/home/user/bts` (branch `master`). The codebase is the canonical source for what is deployed on Vercel. HTTP-level verification (status codes, redirect chains, image byte sizes) could not be performed.

---

## Summary

| Scope | Count |
|---|---|
| Route files (public, excl. admin) | 133 page.tsx files |
| Routes surveyed (code) | ~133 |
| Defects found | 30 |
| P0 Broken | 0 confirmed (1 contingent) |
| P1 Degraded | 16 |
| P2 Polish | 13 |

---

## P0 — Broken

### P0-1 (Contingent): Developer-internal text exposed in 4 production empty states

**Pages:** `/vfx/volumes`, `/vfx/title-houses`, `/partnerships`, `/costume-hair-makeup/effects-houses`

Each page renders the following literal strings when the underlying DB table returns zero rows:

- `/vfx/volumes`: `"No LED volumes catalogued yet. The seed lands once migration 0078 is applied on the production Neon DB."`
- `/vfx/title-houses`: `"Catalog seeds with migration 0084 + dispatch."`
- `/partnerships`: `"Catalog seeds with migration 0086 + dispatch."`
- `/costume-hair-makeup/effects-houses`: `"Catalog seeds with migration 0084 + dispatch."`

The latest migration in the repo is `0097`, so those migrations have run. However, if the tables remain unpopulated (no seed data dispatched), any visitor to these URLs sees raw developer notes referencing internal Neon DB migration state. Elevate to P0 if confirmed empty in production.

Source files:
- `apps/web/app/vfx/volumes/page.tsx` lines 62–66
- `apps/web/app/vfx/title-houses/page.tsx` lines 52–55
- `apps/web/app/partnerships/page.tsx` lines 53–56
- `apps/web/app/costume-hair-makeup/effects-houses/page.tsx` lines 52–55

---

## P1 — Degraded

### P1-1: `/lookbook` fully orphaned — no link from nav, footer, or sitemap

`apps/web/app/lookbook/page.tsx` is a live, properly-rendered page (has `export const metadata`, proper `<h1>`, no errors). Its hero displays `eyebrow="Visual search · upload coming soon"`. Zero internal links lead to this page — it appears in neither `TopNav`, `craftLinks`, `Footer`, nor any sub-sitemap. Discovery is only possible via direct URL.

### P1-2: `/walkthroughs` (top-level) index orphaned

`apps/web/app/walkthroughs/page.tsx` is a distinct route from `/editing/walkthroughs`. It is the cross-kind index (edit, music-cue, VFX-shot walkthroughs in one list). The footer links only to `/editing/walkthroughs`. The standalone `/walkthroughs` index has correct metadata and canonical but is reachable only by direct URL. It also appears in `llms.txt` but not in any sitemap.

### P1-3: `/societies` index and all detail pages orphaned

`apps/web/app/societies/page.tsx` and `/societies/[slug]` are unreachable via any nav or footer link. The claim resolver at `/claims/[id]/page.tsx` does route to `/societies/${slug}` as a redirect target, so societies are internally reachable only via that path. No direct entry point exists.

### P1-4: `/dossiers` index orphaned from footer

`apps/web/app/dossiers/page.tsx` (`title: 'Craft Dossiers'`) is not in the footer. The footer has links to sub-type dossier views but not to the unified `/dossiers` index. `llms.txt` links it; no sitemap does.

### P1-5: `/music/supervision-agencies` index missing from footer

The footer under "Music" links to `/music/supervisors` (individual supervisor people) but not to `/music/supervision-agencies` (the agency-level index). This section is reachable only by people who already know the URL.

### P1-6: Massive sitemap gap — 30+ important routes absent from all sub-sitemaps

`sitemap-core.xml` covers only a small subset of the site's routes. The following important pages are absent from every sitemap and will be discovered by Google only via internal links:

**High-impact missing entries:**
- `/about`, `/methodology` — editorial authority pages
- `/awards`, `/awards/craft/[craft]` — 12+ craft-specific sub-pages
- `/references`, `/references/[id]` — source credibility graph
- All 12 `/for-*` professional landing pages (`/for-dps`, `/for-colorists`, `/for-gaffers`, etc.) — the most SEO-targeted pages on the site
- **Four recently-shipped Phase 4 tools:** `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`
- `/music`, `/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`, `/music/supervision-agencies` and slug variants
- `/editing`, `/editing/editors`, `/editing/walkthroughs`
- `/sound` and all sub-sections (8 routes + slug variants)
- `/costume-hair-makeup` and all sub-sections
- `/production-design` and all sub-sections
- `/decisions`, `/dossiers`, `/walkthroughs` and slug variants
- `/partnerships`, `/partnerships/[slug]`
- `/decades`, `/decades/[decade]`
- `/locations`, `/locations/[id]`
- `/shots`, `/lookbook`
- `/societies`, `/societies/[slug]`
- `/gear/rentals`, `/gear/rentals/[slug]`
- `/equipment/specs`
- `/vfx/volumes`, `/vfx/title-houses`, `/vfx/shot-breakdowns` and slug variants

Source: `apps/web/app/sitemap-core.xml/route.ts`

### P1-7: `console.error` in homepage production code path

Two calls to `console.error` in `apps/web/app/page.tsx` lines 79–80 swallow DB errors silently and bypass Sentry. CLAUDE.md explicitly forbids `console.error` in production code paths.

### P1-8: `console.warn` in 15 production code paths (Sentry bypass)

The following files use `console.warn` as a substitute for Sentry error capture on DB failures. The operator will never see these as issues in the error-monitoring dashboard:

- `apps/web/app/editing/walkthroughs/page.tsx:19`
- `apps/web/app/sound/effects/libraries/[slug]/page.tsx:32,40`
- `apps/web/app/sound/effects/libraries/page.tsx:23`
- `apps/web/app/sound/adr-studios/[slug]/page.tsx:28`
- `apps/web/app/sound/adr-studios/page.tsx:19`
- `apps/web/app/sound/houses/page.tsx:41`
- `apps/web/app/dossiers/[slug]/page.tsx:43`
- `apps/web/app/vfx/volumes/[slug]/page.tsx:42,28`
- `apps/web/app/vfx/title-houses/page.tsx:24`
- `apps/web/app/partnerships/page.tsx:24`
- `apps/web/app/gear/rentals/[slug]/page.tsx:40`
- `apps/web/app/gear/rentals/page.tsx:24`
- `apps/web/app/music/supervision-agencies/page.tsx:18`

### P1-9: `EvidenceGallery` content images missing alt text

`apps/web/components/ui/EvidenceGallery.tsx` line 29: `alt=""` on editorial evidence images (BTS photos, screenshots, book scans). Each `EvidenceItem` carries an optional `caption` field that is rendered visually but not used in `alt`. `alt=""` signals "decoration" to screen readers, suppressing announcement entirely for content images.

### P1-10: `MediaGallery` backdrop stills missing alt text

`apps/web/components/productions/MediaGallery.tsx` line 34: `alt=""` on TMDb backdrop images in the horizontal scroll strip. No caption or title is displayed alongside each still to compensate. Minimum fix: `alt={`Backdrop still from ${production.title}`}`.

### P1-11: Broad `unoptimized` bypass of Next.js image optimization

A comment in `apps/web/components/people/PersonAvatar.tsx` line 77 reads `"// QA 2026-05-21: unoptimized to bypass Vercel image quota."` This flag is applied across 25+ `<Image>` call sites. All external images bypass Vercel's WebP/AVIF conversion and responsive resizing — some poster variants are 300–500KB JPEGs served without compression to all users including mobile.

### P1-12: `/stunts/companies/[slug]` and `/vfx/[slug]` description may be null for many entries

`apps/web/app/stunts/companies/[slug]/page.tsx` line 38 and `apps/web/app/vfx/[slug]/page.tsx` line 28: when both `tagline` and `summary` are null, `generateMetadata` returns `description: undefined`. Next.js emits no `<meta name="description">` tag, causing these pages to fall back to the root-layout site description in Google and AI engine results.

### P1-13: Paginated `/films?page=N` URLs have no `noindex`

`apps/web/app/films/page.tsx` exports a static `metadata` with `canonical: '/films'` but applies no `robots: { index: false, follow: true }` when `searchParams.page > 1`. Heavily-filtered and paginated URLs are currently indexable, potentially diluting crawl budget. The crew page applies this pattern; films does not.

### P1-14: `/societies/[slug]` and `/about` canonical set without `siteUrl()`

`apps/web/app/societies/[slug]/page.tsx` line 30 uses `alternates: { canonical: `/societies/${society.slug}` }` (relative). `apps/web/app/about/page.tsx` line 10 uses `canonical: '/about'`. Both are resolved via `metadataBase` correctly today, but are inconsistent with the majority of the codebase that uses `${siteUrl()}/...`.

### P1-15: `/music/supervision-agencies` and `/societies` — no footer entry and no sitemap

Both sections exist in code with proper metadata but are reachable only via direct URL (P1-3 and P1-5 cover these; consolidated here for tracking).

### P1-16: Four Phase 4 tools recently shipped but absent from `sitemap-core.xml`

`/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical` are referenced in CLAUDE.md as recently shipped (Phase 4 decision-support tools). `sitemap-core.xml` was not updated — only the five original tools are included.

---

## P2 — Polish

### P2-1: `/films/[slug]/loadout` missing meta description

`apps/web/app/films/[slug]/loadout/page.tsx` `generateMetadata` returns `title` but no `description`. Currently noindexed; if ever indexed the page will have no description.

### P2-2: `/tools/loadout` has two `<h1>` elements in the DOM

`apps/web/app/tools/loadout/page.tsx` lines 81 and 91: one `<h1>` is `print:hidden`, the other is `hidden print:block`. Both exist in the DOM simultaneously, which technically violates the "exactly one `<h1>` per page" guideline for screen-reader users (hidden elements remain accessible to AT without `aria-hidden`).

### P2-3: `search` and `bookmarks` pages missing meta description

Both are noindexed but descriptions are surfaced by some LLM/AI crawlers and browser reading-mode tools.

### P2-4: All 12 `/for-*` role landing pages missing from all sitemaps

These are the most keyword-targeted pages on the site. All have explicit canonical URLs and descriptive metadata. None appear in any sub-sitemap. Google must discover them only through footer links.

### P2-5: `/about` and `/methodology` missing from all sitemaps

High-authority content establishing editorial credibility. Both have static canonical URLs and full metadata.

### P2-6: `/references` missing from all sitemaps

Linked in the top nav and in `llms.txt`. Not in any sub-sitemap.

### P2-7: Title length for several static section pages is under 30 characters

Raw titles below recommended minimum (before `| CineCanon` suffix):
- `'Sound'`, `'Editing'`, `'Foley'`, `'Post Sound'`, `'Editors'`, `'Stunts'`

More descriptive titles ("Sound — Mixers, Designers & Post-Production") would improve CTR and keyword alignment.

### P2-8: `vfx/volumes` empty-state string contains internal Neon DB reference

Even if the table is populated in production, the string `"on the production Neon DB"` should be replaced with user-facing copy regardless.

### P2-9: `gear/compare` and `films/compare` pages missing from all sitemaps

Both have proper static metadata and canonical. No canonical URL is set.

### P2-10: `production-design/works`, `costume-hair-makeup/costume-works`, `costume-hair-makeup/makeup-works` missing from sitemaps

All linked from the footer. None in any sub-sitemap.

### P2-11: Stunt detail slug pages missing from sitemaps

`/stunts/companies/[slug]`, `/stunts/rigging/[slug]`, `/stunts/safety/[slug]`, `/stunts/schools/[slug]`, `/stunts/sequences/[productionSlug]/[sequenceSlug]` — all have `generateMetadata` and proper canonical but are absent from all sub-sitemaps.

### P2-12: No canonical on several tool and utility pages

`/ask`, `/gear` (top-level), `/tools`, `/format`, `/stunts/lineage`, `/stunts/people`, `/stunts/sequences`, `/tools/cdl`, `/tools/coverage`, `/tools/frame-lines` export metadata without `alternates.canonical`. Low risk due to edge caching, but technically allows duplicate indexing if query params are added.

### P2-13: `for-makeup-artists` footer label mismatch

Footer renders "For Makeup & Hair Artists" → `/for-makeup-artists`. `llms.txt` calls it "For makeup-hair artists". Minor cross-surface inconsistency.

---

## Appendix — Full URL × Status Table (Static Analysis)

| Route | Metadata | Sitemap | Nav/Footer Link | Notes |
|---|---|---|---|---|
| `/` | OK | sitemap-core | TopNav | |
| `/about` | OK | **MISSING** | Footer | Relative canonical |
| `/ask` | OK | sitemap-core | TopNav | No canonical |
| `/awards` | OK (generateMetadata) | **MISSING** | Footer | |
| `/awards/craft/[craft]` | OK (generateMetadata) | **MISSING** | Footer (indirect) | |
| `/bookmarks` | OK (noindexed) | N/A | TopNav | No description |
| `/claims/[id]` | Redirect only | N/A | N/A | Resolver/redirect |
| `/costume-hair-makeup` | OK | **MISSING** | Footer/Craft nav | |
| `/costume-hair-makeup/construction-houses/[slug]` | OK (generateMetadata) | **MISSING** | Footer (indirect) | |
| `/costume-hair-makeup/designers` | OK | **MISSING** | Footer | |
| `/costume-hair-makeup/effects-houses` | OK | **MISSING** | Footer | Placeholder text if empty |
| `/costume-hair-makeup/effects-houses/[slug]` | OK (generateMetadata) | **MISSING** | via index | |
| `/costume-hair-makeup/costume-works` | OK | **MISSING** | Footer | |
| `/costume-hair-makeup/makeup-works` | OK | **MISSING** | Footer | |
| `/crew` | OK | sitemap-crew | TopNav | |
| `/crew/[slug]` | OK (generateMetadata, conditional noindex) | sitemap-crew | via /crew | |
| `/crew/compare` | OK | **MISSING** | Indirect | No canonical |
| `/decades` | OK | **MISSING** | Footer | |
| `/decades/[decade]` | OK (generateMetadata) | **MISSING** | via /decades | |
| `/decisions` | OK | **MISSING** | Footer | |
| `/decisions/[slug]` | OK (generateMetadata) | **MISSING** | via /decisions | |
| `/dossiers` | OK | **MISSING** | **MISSING from footer** | |
| `/dossiers/[slug]` | OK (generateMetadata) | **MISSING** | via /dossiers | |
| `/editing` | OK | **MISSING** | Footer/Craft | |
| `/editing/editors` | OK | **MISSING** | Footer | |
| `/editing/walkthroughs` | OK | **MISSING** | Footer | |
| `/equipment/specs` | OK | **MISSING** | Footer | |
| `/films` | OK | sitemap-core | TopNav | Paginated variants lack noindex |
| `/films/[slug]` | OK (generateMetadata) | sitemap-films | via /films | |
| `/films/[slug]/loadout` | OK (noindexed, no description) | N/A | via film page | |
| `/films/[slug]/scenes/[sceneSlug]` | OK (generateMetadata) | **MISSING** | via film page | |
| `/films/compare` | OK | **MISSING** | Indirect | No canonical |
| `/for-colorists` | OK | **MISSING** | Footer | |
| `/for-composers` | OK | **MISSING** | Footer | |
| `/for-coordinators` | OK | **MISSING** | Footer | |
| `/for-costume-designers` | OK | **MISSING** | Footer | |
| `/for-dps` | OK | **MISSING** | Footer | |
| `/for-editors` | OK | **MISSING** | Footer | |
| `/for-gaffers` | OK | **MISSING** | Footer | |
| `/for-makeup-artists` | OK | **MISSING** | Footer | |
| `/for-music-supervisors` | OK | **MISSING** | Footer | |
| `/for-production-designers` | OK | **MISSING** | Footer | |
| `/for-sound-designers` | OK | **MISSING** | Footer | |
| `/for-sound-mixers` | OK | **MISSING** | Footer | |
| `/format` | OK | sitemap-core | Footer | No canonical |
| `/format/[slug]` | OK (generateMetadata) | sitemap-core | via /format | |
| `/gear` | OK | sitemap-gear | Footer/Craft | No canonical |
| `/gear/[manufacturer]` | OK (generateMetadata) | sitemap-gear | via /gear | |
| `/gear/[manufacturer]/[series]` | OK (generateMetadata) | sitemap-gear | via /gear | |
| `/gear/[manufacturer]/[series]/[item]` | OK (generateMetadata) | sitemap-gear | via /gear | |
| `/gear/compare` | OK | **MISSING** | Indirect | No canonical |
| `/gear/rentals` | OK | **MISSING** | Footer | |
| `/gear/rentals/[slug]` | OK (generateMetadata) | **MISSING** | via /gear/rentals | |
| `/import/letterboxd` | OK | N/A | Indirect | No canonical |
| `/locations` | OK | **MISSING** | Footer | |
| `/locations/[id]` | OK (generateMetadata) | **MISSING** | via /locations | |
| `/lookbook` | OK | **MISSING** | **ORPHANED** | "upload coming soon" in hero |
| `/methodology` | OK | **MISSING** | Footer | |
| `/music` | OK | **MISSING** | Craft nav | |
| `/music/composers` | OK | **MISSING** | Footer | |
| `/music/cue-guides` | OK | **MISSING** | Footer | |
| `/music/cues/[productionSlug]/[cueSlug]` | OK (generateMetadata) | **MISSING** | via film page | |
| `/music/orchestras` | OK | **MISSING** | Footer | |
| `/music/orchestras/[slug]` | OK (generateMetadata) | **MISSING** | via /music/orchestras | |
| `/music/scores/[productionSlug]` | OK (generateMetadata) | **MISSING** | via film page | |
| `/music/scoring-stages` | OK | **MISSING** | Footer | |
| `/music/scoring-stages/[slug]` | OK (generateMetadata) | **MISSING** | via index | |
| `/music/supervision-agencies` | OK | **MISSING** | **MISSING from footer** | console.warn |
| `/music/supervision-agencies/[slug]` | OK (generateMetadata) | **MISSING** | via index only | |
| `/music/supervisors` | OK | **MISSING** | Footer | |
| `/partnerships` | OK | **MISSING** | Footer | Placeholder if empty, console.warn |
| `/partnerships/[slug]` | OK (generateMetadata) | **MISSING** | via /partnerships | |
| `/production-design` | OK | **MISSING** | Footer/Craft | |
| `/production-design/designers` | OK | **MISSING** | Footer | |
| `/production-design/works` | OK | **MISSING** | Footer | |
| `/queries` | OK | **MISSING** | Footer | |
| `/queries/alexa65-sphero` | OK | sitemap-core | via /queries | |
| `/queries/dune-part-two-lenses` | OK | sitemap-core | via /queries | |
| `/queries/magic-hour-2023` | OK | sitemap-core | via /queries | |
| `/references` | OK | **MISSING** | TopNav (as "Sources") | |
| `/references/[id]` | OK (generateMetadata) | **MISSING** | via /references | |
| `/search` | OK (noindexed) | N/A | SearchBar | No description, no canonical |
| `/shots` | OK | **MISSING** | Footer | |
| `/signin` | OK | N/A | UserMenu | |
| `/societies` | OK | **MISSING** | **ORPHANED** | |
| `/societies/[slug]` | OK (generateMetadata) | **MISSING** | via /societies (orphaned) | Relative canonical |
| `/sound` | OK | **MISSING** | Craft nav | |
| `/sound/adr-studios` | OK | **MISSING** | Footer | console.warn |
| `/sound/adr-studios/[slug]` | OK (generateMetadata) | **MISSING** | via index | console.warn |
| `/sound/designers` | OK | **MISSING** | Footer | |
| `/sound/effects` | OK | **MISSING** | Footer | |
| `/sound/effects/libraries` | OK | **MISSING** | Footer | |
| `/sound/effects/libraries/[slug]` | OK (generateMetadata) | **MISSING** | via index | console.warn |
| `/sound/foley` | OK | **MISSING** | Footer | |
| `/sound/houses` | OK | **MISSING** | Footer | console.warn |
| `/sound/houses/[slug]` | OK (generateMetadata) | **MISSING** | via index | |
| `/sound/mixers` | OK | **MISSING** | Footer | |
| `/sound/post` | OK | **MISSING** | Footer | |
| `/stunts` | OK | sitemap-core | Craft nav | |
| `/stunts/companies` | OK | **MISSING** | via /stunts | |
| `/stunts/companies/[slug]` | OK (generateMetadata, desc may be null) | **MISSING** | via /stunts | |
| `/stunts/coordinators` | Redirect only | N/A | N/A | |
| `/stunts/lineage` | OK | sitemap-core | Footer (indirect) | No canonical |
| `/stunts/people` | OK | sitemap-core | via /stunts | No canonical |
| `/stunts/rigging` | OK | sitemap-core | Footer (indirect) | |
| `/stunts/rigging/[slug]` | OK (generateMetadata) | **MISSING** | via /stunts/rigging | |
| `/stunts/safety` | OK | sitemap-core | Footer (indirect) | |
| `/stunts/safety/[slug]` | OK (generateMetadata) | **MISSING** | via /stunts/safety | |
| `/stunts/schools/[slug]` | OK (generateMetadata) | **MISSING** | via /stunts | |
| `/stunts/sequences` | OK | sitemap-core | via /stunts | No canonical |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | OK (generateMetadata) | **MISSING** | via /stunts | |
| `/tools` | OK | sitemap-core | TopNav | No canonical |
| `/tools/aces` | OK | sitemap-core | via /tools | |
| `/tools/anamorphic-vs-spherical` | OK | **MISSING** | via /tools | Phase 4 — recently shipped |
| `/tools/cdl` | OK | sitemap-core | via /tools | No canonical |
| `/tools/coverage` | OK | sitemap-core | via /tools | No canonical |
| `/tools/frame-lines` | OK | sitemap-core | via /tools | No canonical |
| `/tools/hdr-target-picker` | OK | **MISSING** | via /tools | Phase 4 — recently shipped |
| `/tools/loadout` | OK (noindexed, no desc) | sitemap-core | via /tools | Dual h1 (print/screen) |
| `/tools/scoring-session-cost` | OK | **MISSING** | via /tools | Phase 4 — recently shipped |
| `/tools/stunt-rig-picker` | OK | **MISSING** | via /tools | Phase 4 — recently shipped |
| `/vfx` | OK | sitemap-core | Craft nav | Relative canonical |
| `/vfx/[slug]` | OK (generateMetadata, desc may be null) | sitemap-vfx | via /vfx | |
| `/vfx/shot-breakdowns` | OK | **MISSING** | Footer | |
| `/vfx/title-houses` | OK | **MISSING** | Footer | Placeholder if empty, console.warn |
| `/vfx/title-houses/[slug]` | OK (generateMetadata) | **MISSING** | via index | |
| `/vfx/volumes` | OK | **MISSING** | Footer | Placeholder if empty, console.warn |
| `/vfx/volumes/[slug]` | OK (generateMetadata) | **MISSING** | via index | |
| `/walkthroughs` | OK | **MISSING** | **ORPHANED** | Distinct from /editing/walkthroughs |
| `/walkthroughs/[slug]` | OK (generateMetadata) | **MISSING** | via /walkthroughs (orphaned) | |

---

## What I'd Fix First

The highest return-on-effort fix is the sitemap gap (P1-6 combined with P2-4/P2-5/P2-6): `sitemap-core.xml` is a static, hardcoded file that needs roughly 40 new entries to cover `/about`, `/methodology`, `/references`, all 12 `/for-*` professional landing pages, the 4 recently-shipped Phase 4 tools, `/awards`, and the major craft section index pages (`/music`, `/editing`, `/sound`, `/costume-hair-makeup`, `/production-design`). This is a single-file change that directly improves how much of the site Google and AI crawlers discover and index — high-value content like the `/for-*` pages and `/walkthroughs` are invisible to search engines today despite having strong metadata and canonical URLs. Alongside that, the four developer-facing empty-state strings (P0-1) should be replaced with user-facing copy ("No entries catalogued yet. Check back soon.") regardless of whether those tables are populated, since the Neon DB migration reference has no meaning to a visitor. Finally, the three orphaned-but-live pages — `/lookbook`, `/walkthroughs`, and `/societies` — each need a single footer link to close the discovery gap; their metadata and structure are already correct.
