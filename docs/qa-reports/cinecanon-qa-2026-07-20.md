# CineCanon QA Sweep — 2026-07-20

**Sweep method:** Static analysis of the repo at `/home/user/bts` (branch `master`).
Live-site HTTP checks were blocked by the egress proxy policy (the proxy rejected
`CONNECT cinecanon.com:443` — this is an environment restriction, not a site-side 5xx).
All findings below derive from source code, metadata, route structure, and component
analysis. Where HTTP status cannot be independently confirmed, the finding is labelled
**[code-only]**.

---

## Summary

| Metric | Value |
|---|---|
| Public page routes analyzed | 133 |
| Routes with metadata | 130 |
| Routes without metadata (redirects only) | 3 |
| Sitemaps | 5 (index + core/films/crew/gear/vfx) |
| Indexable sections absent from all sitemaps | ~40+ |
| P0 defects | 1 |
| P1 defects | 9 |
| P2 defects | 8 |
| Total | 18 |

**Biggest risk:** The `Organization.logo` in homepage JSON-LD points to `/icon-512.png`,
a file that does not exist anywhere in the repository or public directory. Every AI
crawler and search engine that dereferences the structured-data logo will receive a 404.

**Second biggest risk:** The `sitemap-core.xml` covers only 25 URLs. Approximately
40 indexable public sections — /about, /awards, /methodology, /references, /societies,
/walkthroughs, /dossiers, /decisions, /partnerships, /shots, /decades, /editing, /music,
/sound, /production-design, /costume-hair-makeup, /locations, all /for-* role pages,
and more — have zero sitemap coverage, degrading Google's crawl-budget allocation for
the site's newer content neighbourhoods.

---

## P0 — Broken

### P0-1 — Missing `/icon-512.png` referenced in homepage JSON-LD `[code-only]`

**File:** `apps/web/app/page.tsx` line 133

The `WebSite` + `Organization` JSON-LD block emitted on the homepage references:

```
logo: siteUrl() + '/icon-512.png'
```

No file named `icon-512.png` exists in the repository. The public directory contains
only `public/brand/cinecanon-mark.svg`. Next.js App Router generates `/icon.svg`
(served from `app/icon.svg`) but not `/icon-512.png`. Any structured-data consumer,
AI crawler, or search engine that fetches the logo URL will receive a 404.

**Impact:** Schema.org `Organization.logo` is a trust signal for Knowledge Panel
eligibility. A broken logo URL degrades rich-result eligibility. Googlebot, ChatGPT,
and Perplexity all dereference logo URLs.

**Fix candidate:** Either add a real `public/icon-512.png` (generated from the SVG mark
at 512×512), or change the JSON-LD reference to `/icon.svg`.

---

## P1 — Degraded

### P1-1 — Sitemap coverage gap: ~40 indexable pages absent from all five sitemaps

**Files:** `apps/web/app/sitemap-core.xml/route.ts` (only 25 entries total)

The five sitemaps collectively cover: `/`, `/films`, `/crew`, `/gear`, `/vfx`,
`/stunts` + five sub-pages, `/format` + format slugs, `/ask`, `/tools` + five
tool pages, and three hardcoded `/queries/*` URLs. The following indexable
sections have no sitemap entry in any file:

**Static index pages (each has its own page.tsx with metadata):**
- `/about`, `/methodology`
- `/awards`, `/awards/craft/*`
- `/references`
- `/societies`
- `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`
- `/shots`, `/lookbook`, `/decades`, `/locations`
- `/editing`, `/editing/editors`, `/editing/walkthroughs`
- `/music`, `/music/composers`, `/music/scoring-stages`, `/music/orchestras`,
  `/music/supervisors`, `/music/cue-guides`, `/music/supervision-agencies`
- `/sound`, `/sound/post`, `/sound/effects`, `/sound/foley`, `/sound/adr-studios`,
  `/sound/effects/libraries`, `/sound/mixers`, `/sound/designers`, `/sound/houses`
- `/production-design`, `/production-design/designers`, `/production-design/works`
- `/costume-hair-makeup`, `/costume-hair-makeup/designers`,
  `/costume-hair-makeup/effects-houses`, `/costume-hair-makeup/costume-works`,
  `/costume-hair-makeup/makeup-works`, `/costume-hair-makeup/construction-houses`
- `/queries` (index page itself — only the three specific queries are listed)

**Role landing pages (12 pages, all with metadata and real content):**
`/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-coordinators`,
`/for-sound-mixers`, `/for-sound-designers`, `/for-composers`,
`/for-music-supervisors`, `/for-editors`, `/for-production-designers`,
`/for-costume-designers`, `/for-makeup-artists`

**Dynamic entity slugs with no sitemap segment:**
`/societies/[slug]`, `/walkthroughs/[slug]`, `/dossiers/[slug]`,
`/decisions/[slug]`, `/partnerships/[slug]`, `/decades/[decade]`,
`/stunts/schools/[slug]`, `/music/scoring-stages/[slug]`,
`/sound/adr-studios/[slug]`, `/sound/houses/[slug]`,
`/sound/effects/libraries/[slug]`, `/costume-hair-makeup/construction-houses/[slug]`,
`/costume-hair-makeup/effects-houses/[slug]`

**Impact:** Without sitemap entries, Google relies on internal links alone to discover
these pages. New sections (editing, music, sound, production-design, costume) are
especially at risk of slow indexing because they are not prominent in the primary nav.

### P1-2 — `EvidenceGallery` renders claim-evidence images with `alt=""`

**File:** `apps/web/components/ui/EvidenceGallery.tsx` line 29

Evidence items are BTS photographs and reference screenshots used as primary visual
proof for editorial claims — they are content images, not decorative. An `item.caption`
field exists (rendered as visible text below the image on lines 45-47) but is not
used as the image alt text:

```tsx
<img
  src={mediaUrl}
  alt=""    // ← evidence image with no alt
  ...
/>
```

**Impact:** Screen-reader users cannot perceive the visual evidence that supports
claims. Also fails WCAG 2.2 SC 1.1.1 (non-text content). This component appears on
every film detail page and crew detail page that has attached evidence.

**Fix candidate:** Change `alt=""` to `alt={item.caption ?? `${label(item.kind)} evidence`}`.

### P1-3 — `MediaGallery` backdrop stills served with empty alt

**File:** `apps/web/components/productions/MediaGallery.tsx` line 34

TMDb backdrop stills displayed in the horizontal scrolling gallery on film pages use
`alt=""`. These are scene stills from the production — recognizable visual references —
not purely decorative chrome:

```tsx
<Image src={src} unoptimized alt="" fill sizes="288px" ... />
```

**Impact:** Weaker image-search indexing for production-specific visual queries.
Screen readers skip the images entirely.

**Fix candidate:** `alt={`Backdrop still from ${production.title}`}` (production name
must be threaded into the component props or derived from context).

### P1-4 — 36 `console.warn` / `console.error` calls in production page code

**Pattern found in:** `apps/web/app/editing/walkthroughs/page.tsx`,
`apps/web/app/sound/effects/libraries/[slug]/page.tsx`,
`apps/web/app/sound/effects/libraries/page.tsx`,
`apps/web/app/sound/adr-studios/[slug]/page.tsx`,
`apps/web/app/sound/adr-studios/page.tsx`,
`apps/web/app/sound/houses/page.tsx`,
`apps/web/app/dossiers/[slug]/page.tsx`,
`apps/web/app/vfx/volumes/[slug]/page.tsx`,
`apps/web/app/vfx/volumes/page.tsx`,
`apps/web/app/vfx/shot-breakdowns/page.tsx`,
`apps/web/app/vfx/title-houses/[slug]/page.tsx`,
`apps/web/app/vfx/title-houses/page.tsx`,
`apps/web/app/production-design/works/page.tsx`,
`apps/web/app/page.tsx` (lines 79-80),
`apps/web/app/partnerships/[slug]/page.tsx`,
`apps/web/app/partnerships/page.tsx`,
`apps/web/app/gear/rentals/[slug]/page.tsx`,
`apps/web/app/gear/rentals/page.tsx`, and ~18 others (36 total)

CLAUDE.md explicitly states: "Don't add console.log or console.error in production
code paths — use Sentry." These `console.warn` calls are defensive try/catch wrappers
around DB queries for recently-added tables, emitting error details to server stdout
without Sentry observability (no tagging, no grouping, no alerting).

**Impact:** Errors in these data paths are invisible to on-call monitors. The homepage
`console.error` on lines 79-80 are the highest-risk instances (failure rate is
invisible; the page silently renders empty correction/citation rails).

**Fix candidate:** Replace `console.warn(e)` with `Sentry.captureException(e, { tags: { page: 'xyz' } })` per the established error-handling pattern in `lib/safe-auth.ts` and route handlers.

### P1-5 — Film detail page title overflows 60 chars for long-title films

**File:** `apps/web/app/films/[slug]/page.tsx` line 83-84

The title template is:
```
${production.title} (${production.release_year}) — Cameras, Lenses & Crew
```

This is then extended by Next.js with ` | CineCanon` (12 chars). Examples:
- "Dune: Part Two (2024) — Cameras, Lenses & Crew | CineCanon" = **60 chars** (borderline)
- "The Lord of the Rings: The Return of the King (2003) — Cameras, Lenses & Crew | CineCanon" = **91 chars** (Google truncates at ~60)
- "Everything Everywhere All at Once (2022) — Cameras, Lenses & Crew | CineCanon" = **79 chars**

No title truncation is applied to `production.title` before appending the suffix.

**Impact:** SERP titles are truncated mid-suffix, losing the "Cameras, Lenses & Crew"
context that differentiates CineCanon from IMDb.

**Fix candidate:** Apply `truncateForMeta(production.title, 35)` before constructing
the title string, or implement a character-count gate to drop the suffix when
`production.title.length > 40`.

### P1-6 — Scene detail pages lack a canonical URL

**File:** `apps/web/app/films/[slug]/scenes/[sceneSlug]/page.tsx` lines 25-56

`generateMetadata` sets `title` and `description` but no `alternates.canonical`.
Every other public detail page emits a canonical. Without a canonical, any
parameterised or duplicate URL that resolves to the same scene content may dilute
PageRank across variants.

**Fix candidate:** Add `alternates: { canonical: `/films/${params.slug}/scenes/${params.sceneSlug}` }` to the returned metadata object.

### P1-7 — Gear item and gear series pages lack canonical URLs

**Files:**
- `apps/web/app/gear/[manufacturer]/[series]/[item]/page.tsx`
- `apps/web/app/gear/[manufacturer]/[series]/page.tsx`
- `apps/web/app/gear/[manufacturer]/page.tsx`

`generateMetadata` in these pages sets `title` and `description` but no
`alternates.canonical`. The gear sitemap covers `/gear/[manufacturer]/[series]/[item]`
paths, so Googlebot will visit them, but without a self-referencing canonical the
page is vulnerable to duplicate-content issues (e.g., if a query string gets appended).

### P1-8 — Crew pages with ≥8 credits but no biography lack meta descriptions

**File:** `apps/web/app/crew/[slug]/page.tsx` line 80

The meta description is `person.biography ?? undefined`. For crew members that clear
the indexability threshold via `filmography.length >= 8` but have no biography
(common for working technical crew imported from TMDb), the meta description tag is
entirely omitted.

**Impact:** Google generates its own snippet from page body text, often pulling a less
informative fragment. The crew index page (`/crew`) has a strong description; the
detail pages that feed into it for high-credit individuals do not.

**Fix candidate:** Generate a fallback description from filmography data, e.g.:
`${person.display_name} — ${primaryRole ?? 'crew'} with ${filmography.length} production credits on CineCanon.`

### P1-9 — `tools/loadout/page.tsx` renders two `<h1>` elements in the DOM

**File:** `apps/web/app/tools/loadout/page.tsx` lines 81 and 91

```tsx
{/* Screen h1 */}
<header className="mb-6 print:hidden">
  <h1>Loadout calculator</h1>
</header>
{/* Print h1 */}
<header className="mb-6 hidden print:block">
  <h1>CineCanon — Loadout</h1>
</header>
```

Both `<h1>` elements exist in the DOM simultaneously. The `hidden print:block` pattern
hides the print header visually on screen, but screen readers and crawlers parse both.
WCAG SC 1.3.1 and most SEO guidance expect exactly one `<h1>` per page.

**Fix candidate:** Use `aria-hidden="true"` on the print header's `<h1>`, or render
the print heading as `<p role="heading" aria-level="1">` only within a media-query
stylesheet, not in the HTML tree visible to AT.

---

## P2 — Polish

### P2-1 — Short single-word titles on section index pages

Many section index pages use titles that produce very short SERP titles. With the
` | CineCanon` template suffix appended, these range from 16–29 chars (Google target
is 30–60):

| Route | `title` field | Full rendered title | Length |
|---|---|---|---|
| `/gear` | "Gear" | "Gear \| CineCanon" | 16 |
| `/music` | "Music" | "Music \| CineCanon" | 17 |
| `/sound` | "Sound" | "Sound \| CineCanon" | 17 |
| `/tools` | "Tools" | "Tools \| CineCanon" | 17 |
| `/awards` | "Awards" | "Awards \| CineCanon" | 18 |
| `/stunts` | "Stunts" | "Stunts \| CineCanon" | 18 |
| `/search` | "Search" | "Search \| CineCanon" | 18 |
| `/sound/foley` | "Foley" | "Foley \| CineCanon" | 17 |
| `/editing` | "Editing" | "Editing \| CineCanon" | 20 |
| `/decades` | "By decade" | "By decade \| CineCanon" | 22 |

Google may silently rewrite these with its own title. Richer titles like "Gear — Cinema Cameras, Lenses & Lighting | CineCanon" (52 chars) serve the SERP better.

### P2-2 — Crew detail page title carries no role context

**File:** `apps/web/app/crew/[slug]/page.tsx` line 79

```
title: person.display_name
```

This produces "Roger Deakins | CineCanon" — no indication that this is a DP dossier
vs. an IMDb filmography page. The `primaryRole` computed on line 163 is available at
metadata-generation time but not used in the title.

**Fix candidate:** `title: primaryRole ? \`${person.display_name} — ${primaryRole}\` : person.display_name`

### P2-3 — VFX house and other entity-type detail pages use bare entity name as title

**File:** `apps/web/app/vfx/[slug]/page.tsx`

`title: data.house.name` → "DNEG | CineCanon". No indication this is a VFX house
dossier. Same pattern in gear manufacturer, gear series, stunt company, society, and
post house detail pages.

### P2-4 — Scene title uses ASCII hyphen instead of em dash

**File:** `apps/web/app/films/[slug]/scenes/[sceneSlug]/page.tsx` line 52

```
title: `${data.scene.title} - ${data.production.title}`
```

All other title templates in the codebase use an em dash (`—`). Minor brand
inconsistency that shows up in browser tab labels and SERP titles.

### P2-5 — `/films/[slug]/loadout` page missing meta description

**File:** `apps/web/app/films/[slug]/loadout/page.tsx`

`generateMetadata` returns `title` and `robots: { index: false, follow: false }` but
no `description`. Since the page is noindex this does not affect SERP, but the
inconsistency may cause confusion during debugging of the metadata graph.

### P2-6 — `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`, `/societies`,
`/decades` — entity-slug pages have no sitemap segment

Dynamic pages under these routes (e.g., `/walkthroughs/[slug]`,
`/societies/[slug]`) are reachable from internal links but have no dedicated
sitemap file. As these sections grow (currently seeded sparsely), Google will
discover new entries only when it re-crawls pages that link to them, not proactively
via sitemap.

### P2-7 — Poster thumbnails in collection/similar-film rails use `alt=""`

**File:** `apps/web/components/productions/ProductionDetail.tsx` lines 888, 931, 979

Small poster thumbnails (44×66px) used beside film titles in the "Collection members"
and "Similar productions" rails use `alt=""`. The adjacent text element names the
film. While the WCAG pattern for linked-images-with-adjacent-text permits empty alt,
the pattern is only correct when the `<a>` wraps both the image and the text (so
the text serves as the accessible name for the link). The current markup wraps them
separately within the same `<a>`, which is correct — but auditing tools will flag
the empty alt on the image regardless. Consider adding `role="presentation"` or an
explicit descriptive alt to suppress false positives.

### P2-8 — `homepage` error handlers use `console.error`, violating convention

**File:** `apps/web/app/page.tsx` lines 79-80

Two `.catch()` handlers on homepage Promise.all arms use `console.error`. The rest
of the codebase uses `Sentry.captureException`. These particular errors (corrections
and citations rail failures) are silent to production monitoring.

---

## Appendix — Route × Status Table (Static Analysis)

Because the proxy blocked live HTTP checks, status codes are inferred from code.
Routes with `notFound()` or `redirect()` are marked accordingly.

| URL pattern | Code-inferred status | Notes |
|---|---|---|
| `/` | 200 | Homepage; revalidate 3600 |
| `/about` | 200 | Static page |
| `/account` | 200 / 307→/signin | Redirects to signin when unauthenticated |
| `/ask` | 200 | NL search |
| `/awards` | 200 | Filter-driven |
| `/awards/cinematography` | 307→/awards/craft/cinematography | Redirect-only page |
| `/awards/craft/[craft]` | 200 | Dynamic |
| `/bookmarks` | 200 | Client-side |
| `/claims/[id]` | 307→entity page | Dynamic resolver; 404 on bad id |
| `/crew` | 200 | Index |
| `/crew/[slug]` | 200 / 404 | force-dynamic |
| `/crew/compare` | 200 | Client-side |
| `/costume-hair-makeup` | 200 | DepartmentIndex |
| `/costume-hair-makeup/[sub]` | 200 | |
| `/decades` | 200 | |
| `/decades/[decade]` | 200 | |
| `/decisions` | 200 | |
| `/decisions/[slug]` | 200 / 404 | |
| `/digest.xml` | 200 | Atom feed |
| `/dossiers` | 200 | |
| `/dossiers/[slug]` | 200 / 404 | |
| `/editing` | 200 | DepartmentIndex |
| `/editing/editors` | 200 | |
| `/editing/walkthroughs` | 200 | |
| `/equipment/specs` | 200 | |
| `/films` | 200 | Filter-driven |
| `/films/[slug]` | 200 / 404 | ISR 86400 |
| `/films/[slug]/loadout` | 200 / 404 | noindex |
| `/films/[slug]/scenes/[sceneSlug]` | 200 / 404 | missing canonical |
| `/films/[slug]/badge` | 200 | embed badge route |
| `/films/compare` | 200 | Client-side |
| `/for-colorists` | 200 | RolePage |
| `/for-composers` | 200 | RolePage |
| `/for-coordinators` | 200 | RolePage |
| `/for-costume-designers` | 200 | RolePage |
| `/for-dps` | 200 | RolePage |
| `/for-editors` | 200 | RolePage |
| `/for-gaffers` | 200 | RolePage |
| `/for-makeup-artists` | 200 | RolePage |
| `/for-music-supervisors` | 200 | RolePage |
| `/for-production-designers` | 200 | RolePage |
| `/for-sound-designers` | 200 | RolePage |
| `/for-sound-mixers` | 200 | RolePage |
| `/format` | 200 | |
| `/format/[slug]` | 200 | |
| `/gear` | 200 | |
| `/gear/[manufacturer]` | 200 / 404 | |
| `/gear/[manufacturer]/[series]` | 200 / 404 | missing canonical |
| `/gear/[manufacturer]/[series]/[item]` | 200 / 404 | missing canonical |
| `/gear/compare` | 200 | |
| `/gear/rentals` | 200 | |
| `/gear/rentals/[slug]` | 200 / 404 | |
| `/import/letterboxd` | 200 | |
| `/locations` | 200 | |
| `/lookbook` | 200 | |
| `/llms.txt` | 200 | text/markdown |
| `/methodology` | 200 | |
| `/music` | 200 | DepartmentIndex |
| `/music/composers` | 200 | |
| `/music/cue-guides` | 200 | |
| `/music/orchestras` | 200 | |
| `/music/scoring-stages` | 200 | |
| `/music/scores/[productionSlug]` | 200 / 404 | |
| `/music/supervisors` | 200 | |
| `/music/supervision-agencies` | 200 | |
| `/oembed` | 200 / 404 | Route handler |
| `/partnerships` | 200 | |
| `/partnerships/[slug]` | 200 / 404 | |
| `/production-design` | 200 | DepartmentIndex |
| `/production-design/designers` | 200 | |
| `/production-design/works` | 200 | |
| `/queries` | 200 | |
| `/queries/alexa65-sphero` | 200 | |
| `/queries/dune-part-two-lenses` | 200 | |
| `/queries/magic-hour-2023` | 200 | |
| `/references` | 200 | |
| `/references/[id]` | 200 / 404 | |
| `/robots.txt` | 200 | Generated by robots.ts |
| `/search` | 200 | |
| `/shots` | 200 | |
| `/signin` | 200 | |
| `/sitemap.xml` | 200 | Sitemap index |
| `/sitemap-core.xml` | 200 | 25 entries |
| `/sitemap-films.xml` | 200 | All film slugs |
| `/sitemap-crew.xml` | 200 | Indexable crew (≥8 credits) |
| `/sitemap-gear.xml` | 200 | Manufacturers + paths |
| `/sitemap-vfx.xml` | 200 | VFX house slugs |
| `/societies` | 200 | |
| `/societies/[slug]` | 200 / 404 | |
| `/sound` | 200 | DepartmentIndex |
| `/sound/[sub]` | 200 | Multiple sub-routes |
| `/stunts` | 200 | |
| `/stunts/coordinators` | 307→/stunts/people | Redirect-only page |
| `/stunts/companies/[slug]` | 200 / 404 | |
| `/stunts/people` | 200 | |
| `/stunts/rigging` | 200 | |
| `/stunts/rigging/[slug]` | 200 / 404 | |
| `/stunts/safety` | 200 | |
| `/stunts/safety/[slug]` | 200 / 404 | |
| `/stunts/sequences` | 200 | |
| `/stunts/schools/[slug]` | 200 / 404 | |
| `/stunts/lineage` | 200 | |
| `/tools` | 200 | |
| `/tools/aces` | 200 | |
| `/tools/anamorphic-vs-spherical` | 200 | |
| `/tools/cdl` | 200 | |
| `/tools/coverage` | 200 | |
| `/tools/frame-lines` | 200 | |
| `/tools/hdr-target-picker` | 200 | |
| `/tools/loadout` | 200 | |
| `/tools/scoring-session-cost` | 200 | |
| `/tools/stunt-rig-picker` | 200 | |
| `/vfx` | 200 | |
| `/vfx/[slug]` | 200 / 404 | |
| `/vfx/shot-breakdowns` | 200 | |
| `/vfx/title-houses` | 200 | |
| `/vfx/title-houses/[slug]` | 200 / 404 | |
| `/vfx/volumes` | 200 | |
| `/vfx/volumes/[slug]` | 200 / 404 | |
| `/walkthroughs` | 200 | |
| `/walkthroughs/[slug]` | 200 / 404 | |
| `/api/v1` | 200 | Discovery doc |
| `/api/v1/productions/[slug]` | 200 / 404 | |
| `/api/v1/crew/[slug]` | 200 / 404 | |
| `/api/v1/aeo/claims` | 200 | CC-BY 4.0 |
| `/api/v1/aeo/digest.xml` | 200 | |
| `/api/v1/aeo/precision` | 200 | |
| `/api/health` | 200 | |

---

## What I Would Fix First

**Immediate (today):** Replace the `/icon-512.png` reference in the homepage JSON-LD
with `/icon.svg` (which actually exists), or generate and commit a 512×512 PNG from
the existing SVG mark. This is a one-line code change and eliminates a guaranteed 404
in every structured-data audit Google and AI crawlers run against the site.

**This sprint:** Expand `sitemap-core.xml` to include the missing index pages
(/about, /awards, /methodology, /references, /societies, /walkthroughs, /dossiers,
/decisions, /partnerships, /shots, /decades, /editing, /music, /sound,
/production-design, /costume-hair-makeup, /locations), add dedicated sitemap segments
for the dynamic entity types that lack them (societies, walkthroughs, dossiers,
decisions, partnerships, decades), and add the 12 /for-* role pages. Add a canonical
URL to the scene detail page and gear item/series pages. Fix `EvidenceGallery`
alt text to use `item.caption` as the accessible name.

**Next sprint:** Address the 36 `console.warn`/`console.error` violations by routing
them through Sentry; enrich short index-page titles to fill the 30–60 char range;
add primary-role context to crew detail page titles; generate a fallback meta
description for high-credit crew pages without biographies.
