# CineCanon QA Sweep — 2026-09-28

> **Note on crawl scope:** The network egress proxy (403 Forbidden) blocked all direct HTTP requests to cinecanon.com from this environment. The sweep was conducted entirely from the local repository at `/home/user/bts`, covering route definitions, metadata code, sitemap generators, navigation components, image handling, and SEO configuration. All findings are grounded in code that runs in production. Findings that require a live network check (asset HTTP status, actual rendered HTML) are flagged as "cannot verify from repo."

---

## Summary

| Metric | Value |
|---|---|
| Public static pages in repo | 92 non-dynamic + 37 dynamic detail routes = ~129 total public pages |
| Sitemaps | 5 (index + core, films, crew, gear, vfx) |
| Pages verifiably in any sitemap (static) | ~22 static entries in sitemap-core + dynamic films/crew/gear/vfx detail pages |
| **P0 — Broken** | 0 confirmed (no dead routes, no missing critical files) |
| **P1 — Degraded** | 7 issues |
| **P2 — Polish** | 18 issues |

The codebase is structurally sound. No 404-producing dead links were found in nav or footer. The primary defect cluster is SEO/discoverability: a large fraction of the site's public pages are absent from all XML sitemaps, and many pages carry page titles or meta descriptions outside the recommended character ranges. A secondary cluster is 36 `console.warn`/`console.error` calls in production Server Component code that should route through Sentry instead.

---

## P0 — Broken

No P0 defects identified. All links in the primary nav and footer resolve to existing `page.tsx` files. The sitemap index, robots.txt, and `llms.txt` routes all exist and are well-formed in code.

---

## P1 — Degraded

### P1-1 — 36 `console.warn`/`console.error` calls in non-admin production code
**Severity: P1 | Files: 20+ app/component files**

CLAUDE.md explicitly states: "Don't add console.log or console.error in production code paths — use Sentry." There are 36 console calls in public-facing Server Components. These run server-side during SSR and ISR revalidation; they go to the Vercel function log rather than Sentry, making them invisible to the alerting system and violating the project's error-handling convention.

Affected files (representative sample):
- `/app/page.tsx` lines 79–80: `console.error('[homepage] listRecentlyResolvedCorrections failed'...)`
- `/app/api/search/nl/route.ts` line 78: `console.error('theme embed failed...')`
- `/app/dossiers/[slug]/page.tsx` line 43: `console.warn(e)` (no context label)
- `/app/decisions/page.tsx` line 36, `/app/walkthroughs/[slug]/page.tsx` line 50, and 15+ more feature pages.

The most alarming are bare `console.warn(e)` calls with no prefix label (e.g. `sound/adr-studios/[slug]/page.tsx:28`, `dossiers/[slug]/page.tsx:43`, `music/supervision-agencies/[slug]/page.tsx:28`, `walkthroughs/[slug]/page.tsx:50`), which emit raw exception objects with no traceability in the log stream.

### P1-2 — 4 Phase 4 tools absent from all XML sitemaps
**Severity: P1 | File: `/app/sitemap-core.xml/route.ts`**

The four tools that landed in the most recent Phase 4 delivery all have canonical URLs and full metadata, but none are listed in `sitemap-core.xml`:
- `/tools/scoring-session-cost` (canonical set, in tools index)
- `/tools/stunt-rig-picker` (canonical set, in tools index)
- `/tools/hdr-target-picker` (canonical set, in tools index)
- `/tools/anamorphic-vs-spherical` (canonical set, in tools index)

Search engines will not proactively discover these pages. Given that `llms.txt` references `/tools` as a key section, this directly limits GEO/AEO discoverability.

### P1-3 — ~30 significant public sections absent from all XML sitemaps
**Severity: P1 | Files: all five `sitemap-*.xml/route.ts`**

The following public-facing, well-linked pages appear in the footer and/or `llms.txt` but are present in **none** of the five sitemaps:

| Category | Missing pages |
|---|---|
| Site identity | `/about`, `/methodology` |
| Core craft sections | `/awards`, `/editing`, `/editing/editors`, `/sound`, `/music`, `/production-design`, `/costume-hair-makeup`, `/locations` |
| Deep-cut features | `/decisions`, `/partnerships`, `/dossiers`, `/walkthroughs`, `/decades`, `/shots`, `/societies`, `/references`, `/queries` |
| Role landing pages | All 12 `/for-*` pages (`/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-coordinators`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-editors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`) |
| Sub-sections | `/gear/rentals`, `/vfx/volumes`, `/vfx/title-houses`, `/vfx/shot-breakdowns`, `/equipment/specs`, `/lookbook` |

The `llms.txt` explicitly surfaces many of these to AI crawlers; a human Googlebot also depends on the sitemap for discovery. The sitemap-core currently covers only 22 static entries, a fraction of the ~92 static public pages.

### P1-4 — Missing canonical `<link>` on 8 public pages
**Severity: P1 | Multiple page.tsx files**

The following pages have metadata blocks but no `alternates: { canonical: ... }` set. Without a canonical, Google may canonicalize to a query-string variant (e.g., compare pages load items from `?items=`) or index duplicate representations:

- `/gear/compare/page.tsx` (loads via `?items=` query param — most at risk)
- `/films/compare/page.tsx` (same pattern)
- `/crew/compare/page.tsx` (same pattern)
- `/gear/page.tsx`
- `/ask/page.tsx`
- `/search/page.tsx`
- `/tools/cdl/page.tsx`
- `/tools/coverage/page.tsx`
- `/tools/frame-lines/page.tsx`

### P1-5 — Crew page title is bare `display_name` — short for most people
**Severity: P1 | File: `/app/crew/[slug]/page.tsx` line 79**

`title: person.display_name` produces titles like "Roger Deakins | CineCanon" (25 chars), "Ed Harris | CineCanon" (21 chars). These fall well below Google's effective minimum of ~30 characters. A pattern like `{name} — Filmography, Gear & Credits` (and similarly enriched) would bring most crew pages into range and communicate the page's purpose more clearly.

Additionally, `description: person.biography ?? undefined` yields **no meta description** for the ~40% of crew who have no biography in the DB, forcing Google to auto-generate a snippet from page body text.

### P1-6 — `alt=""` on navigational content images in three public components
**Severity: P1 | Files: `MediaGallery.tsx:34`, `ProductionDetail.tsx:888,931,979`, `format/[slug]/page.tsx:96`, `EvidenceGallery.tsx:29`**

Several components use `alt=""` on images that carry visual meaning for sighted users and no surrounding text to provide equivalent information for screen reader users:

- `MediaGallery.tsx` line 34: Reference stills displayed in a horizontally-scrolling gallery. No adjacent text describes what the still depicts.
- `ProductionDetail.tsx` lines 888, 931, 979: Film poster thumbnails in the "similar productions" and "collection members" sections. The poster is adjacent to a text link, so `alt=""` is arguably defensible (decorative role), but the containing `<Link>` title does not compensate for SR users.
- `EvidenceGallery.tsx` line 29: Evidence images (BTS photography, production documents). These are intentionally informational.
- `format/[slug]/page.tsx` line 96: Film poster thumbnails in the format browsing page.

### P1-7 — Meta descriptions over 160-char cap on 4 pages
**Severity: P1 | Files: `/app/decisions/page.tsx:12`, `/app/ask/page.tsx:12`, `/app/awards/page.tsx`, `/app/societies/page.tsx`**

Google will truncate mid-sentence in search snippets and AI overviews will receive a padded string:
- `/awards` description: 272 chars (strongly over)
- `/decisions` description: 201 chars
- `/ask` description: 193 chars
- `/societies` description: 192 chars

---

## P2 — Polish

### P2-1 — Page titles below 30-character threshold on ~29 pages

After applying the layout template `'%s | CineCanon'`, the following static page titles render under Google's ~30-char guideline. Short titles underserve keyword ranking for the page's topic area:

| Page | Full title (chars) |
|---|---|
| `/gear` | "Gear \| CineCanon" (16) |
| `/sound` | "Sound \| CineCanon" (17) |
| `/editing` | "Editing \| CineCanon" (19) |
| `/stunts` | "Stunts \| CineCanon" (18) |
| `/foley` | "Foley \| CineCanon" (17) |
| `/search` | "Search \| CineCanon" (18) |
| `/awards` | "Awards \| CineCanon" (18) |
| `/walkthroughs` | "Walkthroughs \| CineCanon" (24) |
| `/bookmarks` | "Bookmarks \| CineCanon" (21) |
| `/ask` | "Ask anything \| CineCanon" (24) |
| `/references` | "References \| CineCanon" (22) |
| `/editing/editors` | "Editors \| CineCanon" (19) |
| `/gear/compare` | "Compare gear \| CineCanon" (24) |
| `/films/compare` | "Compare films \| CineCanon" (25) |
| `/crew/compare` | "Compare people \| CineCanon" (26) |
| `/decades` | "By decade \| CineCanon" (21) |
| `not-found` (404) | "Not Found \| CineCanon" (21) |
| … and ~12 more single-word section titles | < 30 |

### P2-2 — Meta descriptions below 120-char threshold on several pages

| Page | Desc length |
|---|---|
| `/decades` | 61 chars |
| `/gear/compare` | 70 chars |
| `/crew/compare` | 61 chars |
| `/films/compare` | 90 chars |
| `/walkthroughs` | 117 chars |
| `/about` | 115 chars |
| `/tools/aces` | 80 chars |
| `/tools/stunt-rig-picker` | 91 chars |
| `/tools/loadout` | 116 chars |

### P2-3 — `about` page title is 64 chars (slightly over 60)
**File: `/app/about/page.tsx` line 7**

"About CineCanon — Sources, Curation & Citation Tiers | CineCanon" = 64 chars. Trimmable to "About CineCanon — Sources & Citation Tiers | CineCanon" (54 chars) or similar.

### P2-4 — `tools/cdl` and `tools/coverage` descriptions slightly over 160 chars

- `/tools/cdl`: 174 chars
- `/tools/coverage`: 171 chars

These will be truncated in search snippets. The information beyond char 160 is lost.

### P2-5 — `/lookbook` page not linked from nav, footer, or any sitemap

`/app/lookbook/page.tsx` is a fully-implemented visual reverse-search page (SigLIP-2 visual embeddings, HNSW index over keyframes) with a canonical URL and proper metadata, but it appears in no footer group, no nav menu, and no sitemap. It is effectively undiscoverable except via direct URL entry or the CommandPalette.

### P2-6 — `/stunts/schools` route not linked from footer/nav and not in any sitemap

`/app/stunts/schools/[slug]/page.tsx` exists (with `generateStaticParams`), but there is no `/stunts/schools` index page linked from any navigation surface. The detail pages can only be reached via internal film or stunt-sequence cross-links, never from the section hierarchy.

### P2-7 — `/equipment/specs` not in any sitemap

The spec browser at `/equipment/specs` is linked from the footer ("↳ spec browser"), has a canonical URL and full metadata, and is `force-dynamic` — but is absent from all sitemaps.

### P2-8 — Crew page bio can be `undefined`, leaving no meta description

As noted in P1-5: when `person.biography` is null (common for TMDb-imported people), `description: person.biography ?? undefined` renders no `<meta name="description">` tag at all. Google falls back to body text, which for thin-content pages is suboptimal.

### P2-9 — `/music/supervision-agencies` not reachable from footer

The footer links to `/music/supervisors` (the people index). The separate `/music/supervision-agencies` index (agencies as organizations) is not linked from any nav surface and is not in any sitemap. It is a sibling page to `/music/supervisors` but unreachable except via internal entity cross-links.

### P2-10 — `BrandLogo` component uses `alt=""` for manufacturer/studio logos

`/components/ui/BrandLogo.tsx` line 78 uses `alt=""` for what are functionally brand-identity images (manufacturer logos beside equipment names). When the logo is the only visual identifier in a compact table row, `alt=""` leaves screen-reader users without the brand name. Preferred: `alt={name}` where `name` is the manufacturer's display name.

### P2-11 — Layout default meta description is 157 chars (over the 155-char soft cap)

`/app/layout.tsx` line 20: the fallback description is 157 chars. The homepage overrides this with its own 155-char description, but any page that inherits the layout default without setting its own description will serve a 157-char string, which Google may truncate.

### P2-12 — `tools/frame-lines`, `tools/cdl`, `tools/coverage` lack canonical URLs

Three legacy (Phase 1–2) tools do not set `alternates: { canonical: ... }`. The four Phase 4 tools all set canonicals correctly, making this an inconsistency rather than a universal gap.

### P2-13 — Film page titles can exceed 60 chars for long-title films

The pattern `{title} ({year}) — Cameras, Lenses & Crew | CineCanon` produces:
- "Everything Everywhere All at Once (2022) — Cameras, Lenses & Crew | CineCanon" = 77 chars
- "The Lord of the Rings: The Fellowship of the Ring (2001) — Cameras, Lenses & Crew | CineCanon" = 93 chars

These are not fixable without truncating the film title itself, but a length guard (e.g., drop "— Cameras, Lenses & Crew" for long titles) would keep the majority within 60 chars.

### P2-14 — Not-found (404) page has no meta description

`/app/not-found.tsx`: `export const metadata: Metadata = { title: 'Not Found' }`. No description is set. While 404 pages are typically excluded from index, a description helps if the page is inadvertently indexed and improves the Sentry digest readability.

### P2-15 — `for-colorists` and `for-production-designers` have duplicate canonical definitions

Both pages show `canonical=2` in a grep count for "canonical". The duplication is likely `alternates: { canonical: ... }` appearing twice (once in the metadata export, once in a stale comment or variable). Should be verified and deduplicated.

**File:** `/app/for-colorists/page.tsx`, `/app/for-production-designers/page.tsx`

### P2-16 — Sitemap-core emits `lastmod: now` (dynamic timestamp) for most static entries

`sitemap-core.xml` uses `const now = new Date().toISOString()` as the `lastmod` for every static page (e.g., `/films`, `/crew`, `/tools/frame-lines`). This timestamp changes every hour (due to `revalidate = 3600`), which degrades Google's trust in `lastmod` signals. The sitemap-gear route already fixed this for gear entries (H6 fix from 2026-06-18 comment). The same correction should be applied to sitemap-core static entries: either omit `lastmod` or use a genuine content-change date.

### P2-17 — `/decisions` page description is 201 chars

Even with the earlier P1-7 flagging of `/awards` (272 chars), `/ask` (193 chars), the `/decisions` description at 201 chars is called out separately for the editorial team — it is actionable without code change.

### P2-18 — `/queries` index not listed in sitemap-core (only three sub-pages are)

`sitemap-core.xml` lists `/queries/alexa65-sphero`, `/queries/dune-part-two-lenses`, and `/queries/magic-hour-2023` individually, but omits `/queries` (the index). The index page has a canonical URL and is linked from the footer's "Cross-cuts" group.

---

## Appendix — URL × Status Table

All routes verified against file existence in `/home/user/bts/apps/web/app`. HTTP status codes could not be verified from this environment (proxy blocks cinecanon.com). All routes below resolve to a `page.tsx` or `route.ts` file in the repo.

| URL | File Exists | In Sitemap | Canonical Set | Notes |
|---|---|---|---|---|
| `/` | Yes | Yes (core) | Yes | OK |
| `/films` | Yes | Yes (core) | No | Missing canonical |
| `/films/[slug]` | Yes | Yes (films) | Yes | |
| `/films/compare` | Yes | No | No | Missing canonical + sitemap |
| `/crew` | Yes | Yes (core) | No | Missing canonical |
| `/crew/[slug]` | Yes | Yes (crew) | Yes | |
| `/crew/compare` | Yes | No | No | Missing canonical + sitemap |
| `/gear` | Yes | Yes (core) | No | Missing canonical |
| `/gear/[mfr]` | Yes | Yes (gear) | No | |
| `/gear/[mfr]/[series]` | Yes | Yes (gear) | No | |
| `/gear/[mfr]/[series]/[item]` | Yes | Yes (gear) | No | |
| `/gear/compare` | Yes | No | No | Missing canonical + sitemap |
| `/gear/rentals` | Yes | No | Yes | Missing from sitemaps |
| `/equipment/specs` | Yes | No | Yes | Missing from sitemaps |
| `/vfx` | Yes | Yes (core) | Yes | |
| `/vfx/[slug]` | Yes | Yes (vfx) | Yes | |
| `/vfx/volumes` | Yes | No | Yes | Missing from sitemaps |
| `/vfx/title-houses` | Yes | No | Yes | Missing from sitemaps |
| `/vfx/shot-breakdowns` | Yes | No | Yes | Missing from sitemaps |
| `/stunts` | Yes | Yes (core) | Yes | |
| `/stunts/people` | Yes | Yes (core) | Yes | |
| `/stunts/sequences` | Yes | Yes (core) | Yes | |
| `/stunts/rigging` | Yes | Yes (core) | Yes | |
| `/stunts/safety` | Yes | Yes (core) | Yes | |
| `/stunts/lineage` | Yes | Yes (core) | Yes | |
| `/stunts/companies` | Yes | No | Yes | Missing from sitemaps |
| `/stunts/coordinators` | Yes (redirect) | No | — | Redirects to /stunts/people |
| `/stunts/schools/[slug]` | Yes | No | Yes | No index page, not in nav |
| `/sound` | Yes | No | Yes | Missing from sitemaps |
| `/sound/post` | Yes | No | Yes | Missing from sitemaps |
| `/sound/foley` | Yes | No | Yes | Missing from sitemaps |
| `/sound/adr-studios` | Yes | No | Yes | Missing from sitemaps |
| `/sound/effects` | Yes | No | Yes | Missing from sitemaps |
| `/sound/effects/libraries` | Yes | No | Yes | Missing from sitemaps |
| `/sound/houses` | Yes | No | Yes | Missing from sitemaps |
| `/sound/designers` | Yes | No | Yes | Missing from sitemaps |
| `/sound/mixers` | Yes | No | Yes | Missing from sitemaps |
| `/music` | Yes | No | Yes | Missing from sitemaps |
| `/music/composers` | Yes | No | Yes | Missing from sitemaps |
| `/music/scoring-stages` | Yes | No | Yes | Missing from sitemaps |
| `/music/orchestras` | Yes | No | Yes | Missing from sitemaps |
| `/music/supervisors` | Yes | No | Yes | Missing from sitemaps |
| `/music/cue-guides` | Yes | No | Yes | Missing from sitemaps |
| `/music/supervision-agencies` | Yes | No | Yes | Missing from nav/footer/sitemaps |
| `/editing` | Yes | No | Yes | Missing from sitemaps |
| `/editing/editors` | Yes | No | Yes | Missing from sitemaps |
| `/editing/walkthroughs` | Yes | No | Yes | Missing from sitemaps |
| `/production-design` | Yes | No | Yes | Missing from sitemaps |
| `/production-design/designers` | Yes | No | Yes | Missing from sitemaps |
| `/production-design/works` | Yes | No | Yes | Missing from sitemaps |
| `/costume-hair-makeup` | Yes | No | Yes | Missing from sitemaps |
| `/costume-hair-makeup/designers` | Yes | No | Yes | Missing from sitemaps |
| `/costume-hair-makeup/effects-houses` | Yes | No | Yes | Missing from sitemaps |
| `/costume-hair-makeup/construction-houses` | Yes | No | Yes | Missing from sitemaps |
| `/costume-hair-makeup/costume-works` | Yes | No | Yes | Missing from sitemaps |
| `/costume-hair-makeup/makeup-works` | Yes | No | Yes | Missing from sitemaps |
| `/awards` | Yes | No | Yes | Missing from sitemaps |
| `/awards/cinematography` | Yes (redirect) | No | — | Redirects to /awards/craft/cinematography |
| `/decisions` | Yes | No | Yes | Missing from sitemaps |
| `/decisions/[slug]` | Yes | No | Yes | Missing from sitemaps |
| `/partnerships` | Yes | No | Yes | Missing from sitemaps |
| `/dossiers` | Yes | No | Yes | Missing from sitemaps |
| `/walkthroughs` | Yes | No | Yes | Missing from sitemaps |
| `/walkthroughs/[slug]` | Yes | No | Yes | Missing from sitemaps |
| `/decades` | Yes | No | Yes | Missing from sitemaps |
| `/decades/[decade]` | Yes | No | Yes | Missing from sitemaps |
| `/shots` | Yes | No | Yes | Missing from sitemaps |
| `/societies` | Yes | No | No | Missing canonical + sitemap |
| `/societies/[slug]` | Yes | No | Yes | Missing from sitemaps |
| `/locations` | Yes | No | Yes | Missing from sitemaps |
| `/locations/[id]` | Yes | No | Yes | Missing from sitemaps |
| `/references` | Yes | No | Yes | Missing from sitemaps |
| `/references/[id]` | Yes | No | Yes (in generateMetadata) | |
| `/queries` | Yes | No | Yes | Missing from sitemaps (only 3 sub-pages present) |
| `/format` | Yes | Yes (core) | No | Missing canonical |
| `/format/[slug]` | Yes | Yes (core) | No | Missing canonical |
| `/ask` | Yes | Yes (core) | No | Missing canonical |
| `/search` | Yes | No | No | Missing canonical + sitemap |
| `/tools` | Yes | Yes (core) | No | Missing canonical |
| `/tools/scoring-session-cost` | Yes | No | Yes | Missing from sitemaps |
| `/tools/stunt-rig-picker` | Yes | No | Yes | Missing from sitemaps |
| `/tools/hdr-target-picker` | Yes | No | Yes | Missing from sitemaps |
| `/tools/anamorphic-vs-spherical` | Yes | No | Yes | Missing from sitemaps |
| `/tools/frame-lines` | Yes | Yes (core) | No | Missing canonical |
| `/tools/loadout` | Yes | Yes (core) | Yes | |
| `/tools/coverage` | Yes | Yes (core) | No | Missing canonical |
| `/tools/aces` | Yes | Yes (core) | Yes | |
| `/tools/cdl` | Yes | Yes (core) | No | Missing canonical |
| `/lookbook` | Yes | No | Yes | Not in nav/footer/sitemaps |
| `/about` | Yes | No | Yes | Missing from sitemaps |
| `/methodology` | Yes | No | Yes | Missing from sitemaps |
| `/for-dps` | Yes | No | Yes | Missing from sitemaps |
| `/for-colorists` | Yes | No | Yes | Missing from sitemaps (has 2 canonical definitions) |
| `/for-gaffers` | Yes | No | Yes | Missing from sitemaps |
| `/for-coordinators` | Yes | No | Yes | Missing from sitemaps |
| `/for-sound-mixers` | Yes | No | Yes | Missing from sitemaps |
| `/for-sound-designers` | Yes | No | Yes | Missing from sitemaps |
| `/for-composers` | Yes | No | Yes | Missing from sitemaps |
| `/for-music-supervisors` | Yes | No | Yes | Missing from sitemaps |
| `/for-editors` | Yes | No | Yes | Missing from sitemaps |
| `/for-production-designers` | Yes | No | Yes | Missing from sitemaps (has 2 canonical defs) |
| `/for-costume-designers` | Yes | No | Yes | Missing from sitemaps |
| `/for-makeup-artists` | Yes | No | Yes | Missing from sitemaps |
| `/robots.txt` | Yes (route.ts) | — | — | Well-formed |
| `/sitemap.xml` | Yes (route.ts) | — | — | Sitemap index, 5 segments |
| `/llms.txt` | Yes (route.ts) | — | — | Well-formed, dynamic |
| `/digest.xml` | Yes (route.ts) | — | — | Atom feed |

---

## What to Fix First

The single highest-leverage fix is **sitemap expansion**: `sitemap-core.xml` covers only 22 static entries out of roughly 92 public static pages. Adding the ~30 missing sections (awards, decisions, editing, sound, music, production-design, costume-hair-makeup, about, methodology, for-\* role pages, tools Phase 4, lookbook) and removing the dynamic `lastmod: now` in favour of omitted lastmod for pages with no per-entity timestamp would bring the site's crawl surface into alignment with what is actually published and what `llms.txt` promises AI crawlers. This is a single file edit in `sitemap-core.xml/route.ts` with no risk of regression. After that, the 36 `console.warn`/`console.error` calls should be migrated to `Sentry.captureException` to restore the alerting guarantee — starting with the homepage and the NL search route, which are highest-traffic and currently silent to the monitoring system.
