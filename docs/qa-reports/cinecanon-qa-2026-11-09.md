# CineCanon QA Sweep — 2026-11-09

## Network Notice

**cinecanon.com was not reachable from this cloud session.** The domain is blocked by the proxy allowlist. All findings below are from static code analysis of the repository at `/home/user/bts` (branch `master`). Checks that required live HTTP — URL reachability, actual HTTP status codes, real asset HEAD requests, redirect chains, and runtime page weight — could not be performed. Every finding is flagged as source-confirmed (from code) or unverified (needing live access). The team should re-run live checks once the domain is whitelisted.

---

## Summary

- **Pages mapped (source):** 96 static public routes + 37 dynamic route patterns = 133 total (excluding /admin and 404 pages).
- **Total defects found:** 25 distinct issues.
- **P0 — Broken:** 0 confirmed from source (live checks blocked).
- **P1 — Degraded:** 10 issues.
- **P2 — Polish:** 15 issues.

---

## P0 — Broken

No P0 defects were confirmed from source analysis. The codebase has proper `notFound()` calls on all detail pages, defensive try/catch on all newer table-dependent routes, and no obviously unresolvable import paths. Live confirmation is still required to rule out 5xx/4xx at runtime.

---

## P1 — Degraded

### P1-1: ~60 static public routes absent from all five sitemaps

**Severity: P1 — degrades crawl discovery for half the site.**

The sitemap index (`/sitemap.xml`) points to five segment files. `sitemap-core.xml` covers only `/`, the main section indexes (`/films`, `/crew`, `/gear`, `/vfx`, `/stunts` and a subset of their sub-pages), `/format/[slug]`, `/ask`, `/tools`, and three hardcoded `/queries` pages. `sitemap-films.xml` covers film slugs. `sitemap-crew.xml` covers indexable crew slugs. `sitemap-gear.xml` covers gear paths. `sitemap-vfx.xml` covers VFX house slugs.

**Missing from all five sitemaps (60+ static URLs):**

| Section | Missing routes |
|---|---|
| /about | 1 |
| /methodology | 1 |
| /awards, /awards/cinematography | 2 |
| /sound + 7 subsections | 8 |
| /music + 6 subsections | 7 |
| /editing + 3 subsections | 4 |
| /production-design + 3 subsections | 4 |
| /costume-hair-makeup + 5 subsections | 6 |
| /dossiers, /walkthroughs, /decisions, /partnerships | 4 |
| /societies, /references, /shots, /decades, /locations | 5 |
| /queries (index), /lookbook, /equipment/specs | 3 |
| /gear/compare, /gear/rentals, /films/compare, /crew/compare | 4 |
| /for-dps and 11 role landing pages | 12 |
| Phase 4 tools: /tools/scoring-session-cost, /tools/stunt-rig-picker, /tools/hdr-target-picker, /tools/anamorphic-vs-spherical | 4 |
| /vfx/shot-breakdowns, /vfx/title-houses, /vfx/volumes | 3 |
| /stunts/companies, /stunts/coordinators | 2 |

**Source:** `apps/web/app/sitemap-core.xml/route.ts` — static entries list. All missing pages confirmed to exist in `apps/web/app/` by `find`.

**Impact:** Google/Bing cannot discover the Sound, Music, Editing, Production Design, Costume, Dossiers, Walkthroughs, Decisions, Awards, About, Methodology, or for-* pages via the sitemap. These sections represent a significant fraction of the editorial depth the site is built around.

---

### P1-2: 29+ server-side catch blocks using console.warn / console.error instead of Sentry

**Severity: P1 — operational blind spot for a category of production errors.**

CLAUDE.md explicitly states: *"Don't add console.log or console.error in production code paths — use Sentry."* The following server-component files use console.warn or console.error in catch handlers:

`apps/web/app/page.tsx` (lines 79–80) — homepage `.catch()` on `listRecentlyResolvedCorrections` and `listRecentCitations`.

`apps/web/app/walkthroughs/[slug]/page.tsx` (line 50), `apps/web/app/dossiers/[slug]/page.tsx` (line 43), `apps/web/app/decisions/[slug]/page.tsx` (line 41), `apps/web/app/decisions/page.tsx` (line 36) — silent or logged errors on table-missing conditions.

`apps/web/app/vfx/volumes/page.tsx`, `apps/web/app/vfx/volumes/[slug]/page.tsx`, `apps/web/app/vfx/title-houses/page.tsx`, `apps/web/app/vfx/title-houses/[slug]/page.tsx`, `apps/web/app/gear/rentals/page.tsx`, `apps/web/app/gear/rentals/[slug]/page.tsx`, `apps/web/app/music/orchestras/page.tsx`, `apps/web/app/music/orchestras/[slug]/page.tsx`, `apps/web/app/music/scoring-stages/page.tsx`, `apps/web/app/music/supervision-agencies/page.tsx`, `apps/web/app/music/supervision-agencies/[slug]/page.tsx`, `apps/web/app/music/cue-guides/page.tsx`, `apps/web/app/sound/houses/page.tsx`, `apps/web/app/sound/adr-studios/page.tsx`, `apps/web/app/sound/adr-studios/[slug]/page.tsx`, `apps/web/app/sound/effects/libraries/page.tsx`, `apps/web/app/sound/effects/libraries/[slug]/page.tsx`, `apps/web/app/partnerships/page.tsx`, `apps/web/app/partnerships/[slug]/page.tsx`, `apps/web/app/costume-hair-makeup/effects-houses/page.tsx`, `apps/web/app/costume-hair-makeup/construction-houses/page.tsx`, `apps/web/app/costume-hair-makeup/construction-houses/[slug]/page.tsx`, `apps/web/app/costume-hair-makeup/costume-works/page.tsx`, `apps/web/app/costume-hair-makeup/makeup-works/page.tsx`, `apps/web/app/production-design/works/page.tsx`, `apps/web/app/vfx/shot-breakdowns/page.tsx`, `apps/web/app/editing/walkthroughs/page.tsx`.

**Source:** `grep -rn "console\.(warn|error)"` across `apps/web/app/**/*.tsx` (excluding admin files).

**Impact:** When a migration-dependent table is missing (the documented deploy-window risk) or a query fails in production, the error is logged to Vercel function logs only — not captured in Sentry. Operators have no alert, no stack trace, no issue tracking. The pattern was specifically called out in CLAUDE.md as forbidden.

---

### P1-3: EvidenceGallery renders content images with alt="" when caption is available

**Severity: P1 — accessibility violation on claim evidence (the site's core value-add).**

`apps/web/components/ui/EvidenceGallery.tsx` (lines 27–32):

```tsx
<img
  src={mediaUrl}
  alt=""
  className="aspect-video w-full object-cover opacity-90"
  loading="lazy"
/>
```

The component renders this image unconditionally with `alt=""`. Immediately below (lines 45–47), it conditionally renders `item.caption` as a `<p>` element. The caption text — which describes the visual evidence — is available at render time but is not used as the alt attribute.

Evidence images are BTS stills, production photos, and cited visual sources. These are not decorative; they are the primary visual proof backing editorial claims. Screen-reader users receive no description of what the evidence shows.

**Fix path:** Use `alt={item.caption ?? item.source_title ?? 'Evidence image'}` and aria-hidden the entire block only when neither caption nor source_title is populated.

---

### P1-4: Phase 4 tools linked from /tools index but absent from all sitemaps

**Severity: P1 — new content invisible to crawlers.**

The four Phase 4 decision-support tools — `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical` — were noted in CLAUDE.md as the most recent shipped features. Each has a `page.tsx` with correct `metadata` (title, description, canonical). They are linked from the `/tools` index page (`apps/web/app/tools/page.tsx`, lines 90–136). However, none appear in `sitemap-core.xml/route.ts`.

**Source:** `apps/web/app/sitemap-core.xml/route.ts` confirmed to contain only the five pre-Phase-4 tools entries; all four Phase 4 URLs confirmed absent.

---

### P1-5: 12 public pages missing canonical link tags

**Severity: P1 — Google may index query-string variants as separate URLs.**

The following public non-dynamic pages have metadata objects with no `alternates.canonical` field:

`/stunts` (`apps/web/app/stunts/page.tsx`), `/gear` (`apps/web/app/gear/page.tsx`), `/ask` (`apps/web/app/ask/page.tsx`), `/format` (`apps/web/app/format/page.tsx`), `/tools` (`apps/web/app/tools/page.tsx`), `/tools/cdl` (`apps/web/app/tools/cdl/page.tsx`), `/tools/frame-lines` (`apps/web/app/tools/frame-lines/page.tsx`), `/tools/coverage` (`apps/web/app/tools/coverage/page.tsx`), `/societies` (`apps/web/app/societies/page.tsx`), `/films/compare` (`apps/web/app/films/compare/page.tsx`), `/gear/compare` (`apps/web/app/gear/compare/page.tsx`), `/crew/compare` (`apps/web/app/crew/compare/page.tsx`).

**Source:** `grep -rL "canonical"` across `apps/web/app/**/page.tsx` (excluding admin/not-found/signin/bookmarks/account).

The compare pages (`/films/compare`, `/gear/compare`, `/crew/compare`) are especially at risk: they derive their state entirely from URL query parameters, so without a canonical pointing at the base path, Google indexes every unique combination of query params as a separate URL.

---

### P1-6: /lookbook is publicly accessible with an unimplemented primary feature

**Severity: P1 — user-facing "coming soon" label on a discoverable page.**

`apps/web/app/lookbook/page.tsx` (lines 38–40) renders with `eyebrow="Visual search · upload coming soon"` and the description explicitly states the upload-and-match feature "is in development." The page is linked from `/shots` (line 140). It does not appear in the sitemap and is not in the nav, but it is reachable via a public hyperlink. A visitor who arrives here finds the core feature non-functional.

**Source:** `apps/web/app/lookbook/page.tsx` lines 38–43.

---

### P1-7: MediaGallery component (film backdrop gallery) silently orphaned

**Severity: P1 — planned feature with unreachable code shipping in the bundle.**

`apps/web/components/productions/ProductionDetail.tsx` lines 16–19 include a comment:

> *"MediaGallery is intentionally not imported here — the call site below was passing backdropPaths=[] which always rendered null. Wiring the real production.backdrop_paths in is a future task."*

The `MediaGallery` component exists (`apps/web/components/productions/MediaGallery.tsx`), is not imported anywhere, and ships with `alt=""` on all backdrop images. Film detail pages therefore never render the backdrop gallery strip. The feature is silently dark.

**Source:** `apps/web/components/productions/ProductionDetail.tsx` lines 16–19.

---

### P1-8: 4 large section-page meta descriptions outside target range

**Severity: P1 — Google routinely replaces short/long descriptions with auto-generated snippets, reducing click-through.**

| Page | Chars | Issue |
|---|---|---|
| `/music` | 80 | Below 120-char target |
| `/stunts` | 162 | 2 chars above 160-char ceiling |
| `/sound` | 170 | 10 chars over ceiling |
| `/awards` | 272 | 112 chars over ceiling, will be truncated |
| `/references` | 221 | 61 chars over ceiling |

**Source:** Metadata objects in respective `page.tsx` files.

---

### P1-9: 7 section-index pages have titles below 30-char SEO minimum

**Severity: P1 — below the 30-char lower bound specified in the QA brief.**

The title template in `apps/web/app/layout.tsx` (line 17) is `'%s | CineCanon'`. Seven pages set a single-word bare title:

| Page | Title | Rendered | Chars |
|---|---|---|---|
| `/gear` | Gear | Gear \| CineCanon | 16 |
| `/stunts` | Stunts | Stunts \| CineCanon | 18 |
| `/sound` | Sound | Sound \| CineCanon | 17 |
| `/music` | Music | Music \| CineCanon | 17 |
| `/tools` | Tools | Tools \| CineCanon | 17 |
| `/awards` | Awards | Awards \| CineCanon | 18 |
| `/references` | References | References \| CineCanon | 22 |

**Source:** `grep -n "title:"` across `apps/web/app/{gear,stunts,sound,music,tools,awards,references}/page.tsx`.

---

### P1-10: Silent empty catch blocks in generateMetadata for walkthroughs and dossiers

**Severity: P1 — metadata failures on walkthrough and dossier detail pages are completely invisible.**

`apps/web/app/walkthroughs/[slug]/page.tsx` line 31 and `apps/web/app/dossiers/[slug]/page.tsx` line 29 both have:

```ts
try { w = await getWalkthroughBySlug(db, slug); } catch {}
```

The empty `catch {}` means a DB error during metadata generation (before the page even renders) produces no log, no Sentry event, and returns `{ title: 'Walkthrough' }` or `{ title: 'Dossier' }` as the metadata — a bare generic title with no description or canonical. If a table migration is pending during a deploy window, affected pages serve broken SEO metadata silently.

---

## P2 — Polish

### P2-1: /about and /vfx titles exceed 60-char guideline

`About CineCanon — Sources, Curation & Citation Tiers | CineCanon` = 64 chars.
`VFX Houses — Studios, Boutique & In-House Facilities | CineCanon` = 64 chars.

Both exceed the 60-char guideline. Google typically truncates at ~60 chars in SERPs.

**Source:** `apps/web/app/about/page.tsx` line 7, `apps/web/app/vfx/page.tsx` line 2.

---

### P2-2: /about h1 is "CineCanon" — does not describe the page

`apps/web/app/about/page.tsx` line 26 renders `<h1>CineCanon</h1>`. The page title metadata says "About CineCanon — Sources, Curation & Citation Tiers." The mismatch means the h1 adds no semantic context beyond the brand name. A screen-reader user or search engine crawler processing the About page gets an h1 that is identical in meaning to the site logo in the nav.

---

### P2-3: /tools/loadout has two h1 elements in the DOM simultaneously

`apps/web/app/tools/loadout/page.tsx` lines 81 and 91 render two `<h1>` elements. One is visually hidden via `print:hidden` and the other via `hidden print:block`. Both are present in the HTML DOM. Screen readers and Google's parser see both; Tailwind print utilities are CSS-only and do not affect DOM presence.

---

### P2-4: Poster thumbnails in search results, /ask results, and collection members use alt=""

The following instances render content images with empty alt text where the film title is available in adjacent text but not on the image element itself:

- `apps/web/app/ask/page.tsx` line 254 — `/ask` result poster thumbnails.
- `apps/web/components/productions/ProductionDetail.tsx` lines 888, 931, 979 — collection-member and similar-production posters.
- `apps/web/app/crew/[slug]/page.tsx` line 848 — filmography row poster thumbnails.
- `apps/web/app/gear/compare/page.tsx` line 196 — gear comparison poster thumbnail.
- `apps/web/components/people/FilmographyTable.tsx` line 48 — filmography row thumbnails.
- `apps/web/components/vfx/VfxFilmography.tsx` line 28 — VFX house filmography thumbnails.

WCAG 2.1 AA requires a text alternative for every non-decorative image. These poster thumbnails are navigational (they are wrapped in links to film detail pages) and therefore should have `alt={title}` or at minimum `role="presentation"` with `aria-hidden="true"` and an accessible link label.

---

### P2-5: Multiple sections have zero sitemap coverage for detail-level dynamic pages

The sitemap-vfx.xml covers `/vfx/[slug]`. But these dynamic routes have no sitemap coverage at all:

- `/dossiers/[slug]` — craft dossier detail pages.
- `/walkthroughs/[slug]` — edit, cue, and VFX-shot walkthrough pages.
- `/decisions/[slug]` — craft decision-tree detail pages.
- `/partnerships/[slug]` — long-term creative collaboration pages.
- `/societies/[slug]` — cinematographer society detail pages.
- `/decades/[decade]` — decade index pages.
- `/stunts/sequences/[productionSlug]/[sequenceSlug]` — stunt sequence detail.
- `/stunts/safety/[slug]`, `/stunts/rigging/[slug]`, `/stunts/schools/[slug]` — stunt sub-entity details.
- `/sound/adr-studios/[slug]`, `/sound/effects/libraries/[slug]`, `/sound/houses/[slug]` — sound entity details.
- `/music/orchestras/[slug]`, `/music/supervision-agencies/[slug]` — music entity details.
- `/gear/rentals/[slug]` — rental house detail pages.
- `/vfx/volumes/[slug]`, `/vfx/title-houses/[slug]` — VFX sub-entity detail pages.
- `/costume-hair-makeup/construction-houses/[slug]`, `/costume-hair-makeup/effects-houses/[slug]` — costume sub-entity details.
- `/films/[slug]/scenes/[sceneSlug]` — scene-level breakdowns.
- `/films/[slug]/loadout` — printable loadout sheets (mentioned in llms.txt as a key AI-crawlable surface).

---

### P2-6: /stunts/schools detail page missing canonical tag

`apps/web/app/stunts/schools/[slug]/page.tsx` — `generateMetadata` returns a metadata object with `title` and `description` but no `alternates.canonical`. All other dynamic detail pages in the codebase set a canonical.

---

### P2-7: console.warn without Sentry in production server paths

(Detailed under P1-2.) As a polish issue: even where the error is "expected" (table-missing during a deploy window), a Sentry event with `level: 'warning'` and tagged context would let the team verify resolution. The bare `console.warn` has no structured context and disappears in Vercel log stream noise.

---

### P2-8: /methodology canonical uses siteUrl() template instead of a relative path

`apps/web/app/methodology/page.tsx` sets `alternates: { canonical: \`${siteUrl()}/methodology\` }`. This differs from `/films`, `/crew`, `/about`, and `/awards` which use relative canonicals like `'/films'` or `'/about'`. Both approaches work, but inconsistency could cause mismatch if `NEXT_PUBLIC_SITE_URL` is not set (it falls back to `http://localhost:3000`).

---

### P2-9: 11 for-* role landing pages have no sitemap entries and no canonical tags

`/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-coordinators`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-editors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists` — all present in the footer and all absent from every sitemap. These pages are specifically called out in `llms.txt` as AI-assistant reference pages. None were found to have canonical tags in a spot check.

---

### P2-10: /lookbook lacks robots noindex despite being an unfinished feature

`apps/web/app/lookbook/page.tsx` has no `robots: { index: false }` in its metadata. The page renders a "coming soon" notice. If Googlebot follows the `/shots` link to `/lookbook`, it will index an effectively empty page, diluting the domain's Helpful Content score.

---

### P2-11: Walkthroughs and dossiers generateMetadata returns bare title on error

If `getWalkthroughBySlug` or `getCraftDossierBySlug` throw in `generateMetadata` (the silent catch), Google receives a page titled literally `"Walkthrough | CineCanon"` or `"Dossier | CineCanon"` with no description and no canonical. These are placeholder titles indistinguishable from an empty page.

---

### P2-12: Crew page title metadata for indexable pages is just display_name

`apps/web/app/crew/[slug]/generateMetadata` returns `title: person.display_name` — a bare name with no role or context (e.g. "Roger Deakins" instead of "Roger Deakins — Cinematographer"). The film detail pattern adds "— Cameras, Lenses & Crew" for context. This affects ~8,000+ indexable crew pages.

---

### P2-13: BrandLogo component uses alt="" for content logo images

`apps/web/components/ui/BrandLogo.tsx` line 78 renders organization logos with `alt=""`. In a citations/references context, the logo identifies the publisher and should carry the publisher name as alt text.

---

### P2-14: Gear page canonical is absent even though it is covered by sitemap-gear.xml

`apps/web/app/gear/page.tsx` has no `alternates.canonical`. Since gear is covered by the sitemap, Googlebot will crawl `/gear` but the page has no self-referential canonical hint. If `/gear?category=lenses` or similar query strings generate traffic, they will appear as distinct URLs.

---

### P2-15: UserMenu avatar image uses alt="" for authenticated user photo

`apps/web/components/nav/UserMenu.tsx` line 52:

```tsx
<Image src={session.user.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
```

The user's profile photo has no alt text. WCAG 2.1 success criterion 1.1.1 requires a text alternative. `alt={session.user.name ?? 'Your account'}` would satisfy this.

---

## Appendix — Full Route × Source-Availability Table

This table lists all 96 static public routes identified in the source. HTTP status is marked "unverified" because the domain was not reachable. Sitemap presence is source-confirmed.

| URL | Source Present | In Sitemap | Canonical Tag | Title Length | Description Length | Notes |
|---|---|---|---|---|---|---|
| / | Yes | Yes (core) | Yes | 41 OK | 165 LONG | |
| /about | Yes | No | Yes | 64 LONG | 128 OK | h1 mismatch |
| /ask | Yes | Yes (core) | No | 22 SHORT | — | |
| /awards | Yes | No | Yes | 18 SHORT | 272 LONG | |
| /awards/cinematography | Yes | No | unverified | — | — | |
| /bookmarks | Yes | No | unverified | — | — | Auth-gated |
| /costume-hair-makeup | Yes | No | unverified | — | — | |
| /costume-hair-makeup/construction-houses | Yes | No | unverified | — | — | |
| /costume-hair-makeup/costume-works | Yes | No | unverified | — | — | |
| /costume-hair-makeup/designers | Yes | No | unverified | — | — | |
| /costume-hair-makeup/effects-houses | Yes | No | unverified | — | — | |
| /costume-hair-makeup/makeup-works | Yes | No | unverified | — | — | |
| /crew | Yes | Yes (crew) | Yes | 54 OK | 190+ OK | |
| /crew/compare | Yes | No | No | — | — | |
| /decades | Yes | No | unverified | — | — | |
| /decisions | Yes | No | Yes | — | 207+ LONG | |
| /dossiers | Yes | No | Yes | — | — | |
| /editing | Yes | No | unverified | — | — | |
| /editing/editors | Yes | No | unverified | — | — | |
| /editing/walkthroughs | Yes | No | unverified | — | — | |
| /equipment/specs | Yes | No | unverified | — | — | |
| /films | Yes | Yes (core) | Yes | 51 OK | 191 LONG | |
| /films/compare | Yes | No | No | — | — | |
| /for-colorists | Yes | No | unverified | — | — | 11 for-* pages same |
| /format | Yes | Yes (core) | No | — | — | |
| /gear | Yes | Yes (gear) | No | 16 SHORT | 154 OK | |
| /gear/compare | Yes | No | No | — | — | |
| /gear/rentals | Yes | No | unverified | — | — | |
| /locations | Yes | No | unverified | — | — | |
| /lookbook | Yes | No | Yes | — | — | Coming soon; no noindex |
| /methodology | Yes | No | Yes | 59 OK | — | |
| /music | Yes | No | Yes | 17 SHORT | 80 SHORT | |
| /music/composers | Yes | No | unverified | — | — | |
| /music/cue-guides | Yes | No | unverified | — | — | |
| /music/orchestras | Yes | No | unverified | — | — | |
| /music/scoring-stages | Yes | No | unverified | — | — | |
| /music/supervision-agencies | Yes | No | unverified | — | — | |
| /music/supervisors | Yes | No | Yes | — | 149 OK | |
| /partnerships | Yes | No | unverified | — | — | |
| /production-design | Yes | No | unverified | — | — | |
| /production-design/designers | Yes | No | unverified | — | — | |
| /production-design/works | Yes | No | unverified | — | — | |
| /queries | Yes | No | unverified | — | — | |
| /queries/alexa65-sphero | Yes | Yes (core) | unverified | — | — | |
| /queries/dune-part-two-lenses | Yes | Yes (core) | unverified | — | — | |
| /queries/magic-hour-2023 | Yes | Yes (core) | unverified | — | — | |
| /references | Yes | No | unverified | 22 SHORT | 221 LONG | |
| /search | Yes | No | unverified | — | — | |
| /shots | Yes | No | unverified | — | — | |
| /signin | Yes | No | unverified | — | — | |
| /societies | Yes | No | No | — | — | |
| /sound | Yes | No | Yes | 17 SHORT | 170 LONG | |
| /sound/adr-studios | Yes | No | unverified | — | — | |
| /sound/designers | Yes | No | unverified | — | — | |
| /sound/effects | Yes | No | unverified | — | — | |
| /sound/effects/libraries | Yes | No | unverified | — | — | |
| /sound/foley | Yes | No | unverified | — | — | |
| /sound/houses | Yes | No | unverified | — | — | |
| /sound/mixers | Yes | No | unverified | — | — | |
| /sound/post | Yes | No | unverified | — | — | |
| /stunts | Yes | Yes (core) | No | 18 SHORT | 162 LONG | |
| /stunts/companies | Yes | No | unverified | — | — | |
| /stunts/coordinators | Yes | No | unverified | — | — | |
| /stunts/lineage | Yes | Yes (core) | unverified | — | — | |
| /stunts/people | Yes | Yes (core) | unverified | — | — | |
| /stunts/rigging | Yes | Yes (core) | unverified | — | — | |
| /stunts/safety | Yes | Yes (core) | unverified | — | — | |
| /stunts/sequences | Yes | Yes (core) | unverified | — | — | |
| /tools | Yes | Yes (core) | No | 17 SHORT | 135 OK | |
| /tools/aces | Yes | Yes (core) | unverified | — | — | |
| /tools/anamorphic-vs-spherical | Yes | No | Yes | 43 OK | 150 OK | Phase 4 |
| /tools/cdl | Yes | Yes (core) | No | — | — | |
| /tools/coverage | Yes | Yes (core) | No | — | — | |
| /tools/frame-lines | Yes | Yes (core) | No | — | — | |
| /tools/hdr-target-picker | Yes | No | Yes | — | — | Phase 4 |
| /tools/loadout | Yes | Yes (core) | unverified | — | — | Dual h1 in DOM |
| /tools/scoring-session-cost | Yes | No | Yes | 43 OK | 121 OK | Phase 4 |
| /tools/stunt-rig-picker | Yes | No | Yes | — | — | Phase 4 |
| /vfx | Yes | Yes (core) | unverified | 64 LONG | — | |
| /vfx/shot-breakdowns | Yes | No | unverified | — | — | |
| /vfx/title-houses | Yes | No | unverified | — | — | |
| /vfx/volumes | Yes | No | unverified | — | — | |
| /walkthroughs | Yes | No | Yes | — | 115 SHORT | |

---

## What I'd Fix First

The single highest-leverage fix is **expanding the five sitemap segments to cover the entire site** (P1-1). Over 60 public static routes — including every page in Sound, Music, Awards, Methodology, About, Editing, Production Design, Costume, Dossiers, Walkthroughs, Decisions, all 12 role landing pages, and all 4 Phase 4 tools — are invisible to crawlers. These sections are exactly where CineCanon's editorial depth lives: the pages that differentiate the site from IMDb and TMDb. Until they appear in the sitemap, search engines and AI crawlers have no structured signal to discover or index them. This is a code change to `sitemap-core.xml/route.ts` only — add a static entries array for all deterministic URLs, and add a new `sitemap-secondary.xml` segment for the dynamic entity types (dossiers, walkthroughs, decisions, partnerships, societies, decades, stunt sub-entities, sound/music/gear entity detail pages). Once sitemap coverage is complete, the second priority is replacing all 29+ `console.warn`/`console.error` catch handlers with `Sentry.captureException` calls so table-missing and query-failure events during deploy windows are visible in monitoring rather than silently swallowed.
