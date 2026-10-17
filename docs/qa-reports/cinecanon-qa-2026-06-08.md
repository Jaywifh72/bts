# CineCanon QA Sweep — 2026-06-08

**Scope:** Static analysis of repo at `/home/user/bts` (branch `master`, HEAD `2952b66`) cross-referenced against the previous live crawl results from `cinecanon-qa-2026-05-20.md` and `cinecanon-qa-full-crawl-2026-05-21.md`. Live HTTP probing was not possible from this environment (Anthropic egress gateway blocks outbound requests to production hosts). All findings are source-confirmed.

Note on prior sweep closure: all five P0s and five of six P1s from the 2026-05-20 report have been resolved in code and are noted in the Appendix. P1-5 (apex-domain 307 redirect) remains an infrastructure configuration outside the repo and is re-confirmed below.

---

## Summary

| Metric | Count |
|---|---|
| Route files scanned | ~140 page.tsx + route.ts files |
| Sitemap segments | 5 (core, films, crew, gear, vfx) |
| **P0 — Broken** | **1** |
| **P1 — Degraded** | **6** |
| **P2 — Polish** | **4** |

Overall structural health is strong. The five 404s from May 20 are gone. The single P0 is a data-privacy issue in a shared utility called from the root layout. The P1s cluster around sitemap coverage gaps introduced by three new content sections (walkthroughs, dossiers, decisions) that shipped without sitemap segments, and a misuse of Next.js `<Image>` on the homepage keyframe wall.

---

## P0 — Broken

### P0-1: `safeAuth` logs user PII on every page request

**File:** `apps/web/lib/safe-auth.ts`, lines 27–32

`safeAuth()` is called from `apps/web/app/layout.tsx` (line 44), which wraps every route. When a user is authenticated, it executes:

```ts
console.log(
  '[safeAuth]',
  session
    ? { email: session.user?.email, role: session.user?.role, id: session.user?.id }
    : 'null',
);
```

This emits the user's email address, role, and internal ID to server logs on every single page render for every authenticated visitor. Vercel's log drain sends these to whatever logging backend is configured; the values are also visible in Vercel's real-time function logs, which are accessible to all project collaborators. CLAUDE.md convention is "don't add console.log in production code paths — use Sentry." This is both a convention violation and a GDPR/privacy risk: email addresses in structured server logs constitute personal data with retention and access-control obligations. The `console.warn` on the error path (line 36) is acceptable for debugging but should be converted to `Sentry.captureException`.

**Severity rationale:** Classified P0 rather than P1 because it is a live data leak in production, not a UX degradation.

---

## P1 — Degraded

### P1-1: Homepage keyframe wall uses `<Image>` without `unoptimized` for arbitrary external URLs

**File:** `apps/web/app/page.tsx`, lines 339–345

The "Frames of the day" shot wall maps over `shotWall` rows and renders:

```tsx
<Image
  src={s.image_url}
  alt={`Keyframe from ${s.production_title}…`}
  fill
  sizes="(min-width: 640px) 22vw, 50vw"
  className="object-cover transition-transform group-hover:scale-105"
/>
```

`s.image_url` is a free-text field from the `keyframes` table — URLs can originate from any publisher CDN. `next.config.mjs` lines 39–41 explicitly documents: "Production keyframes can hot-link to publisher CDNs we don't enumerate. The keyframe admin page handles arbitrary URLs that wouldn't pass `remotePatterns`. Components that need this set `unoptimized` on the Image." Every other TMDb image in the codebase was fixed to use `unoptimized` in commits `031c80b` and `c891ea0` (2026-05-20). This component was missed. Without `unoptimized`, Next.js tries to proxy the image through `/_next/image`, which will return 400 for any URL not in `remotePatterns`, resulting in broken images on the homepage for every keyframe sourced from non-allowlisted CDNs.

The full crawl from 2026-05-21 recorded 1,702 broken `/_next/image` 400 responses (size=84 bytes, the Next.js error payload). These were predominantly `w1280`, `w342`, and `w154` TMDb URLs that have since been fixed with `unoptimized`. The keyframe wall is the remaining un-fixed instance.

### P1-2: `sitemap-core.xml` is missing four Phase 4 tools and all new content sections

**File:** `apps/web/app/sitemap-core.xml/route.ts`

The following routes exist in the repo and are advertised in `llms.txt` but are absent from `sitemap-core.xml`:

| Route | Notes |
|---|---|
| `/tools/scoring-session-cost` | Phase 4, has canonical, not in sitemap |
| `/tools/stunt-rig-picker` | Phase 4, has canonical, not in sitemap |
| `/tools/hdr-target-picker` | Phase 4, has canonical, not in sitemap |
| `/tools/anamorphic-vs-spherical` | Phase 4, has canonical, not in sitemap |
| `/walkthroughs` | Index page exists, not in sitemap |
| `/dossiers` | Index page exists, not in sitemap |
| `/decisions` | Index page exists, not in sitemap |
| `/partnerships` | Index page exists, not in sitemap |

The `sitemap.xml` index (`apps/web/app/sitemap.xml/route.ts`) references only five segments: `['core', 'films', 'crew', 'gear', 'vfx']`. There is no `sitemap-walkthroughs.xml`, `sitemap-dossiers.xml`, or `sitemap-decisions.xml`. The detail-level `[slug]` pages for walkthroughs, dossiers, and decisions are therefore completely undiscoverable to search engines via sitemap.

### P1-3: `sitemap-crew.xml` includes ~12,000 noindex thin crew pages

**File:** `apps/web/app/sitemap-crew.xml/route.ts` and `apps/web/app/crew/[slug]/page.tsx`

Commit `2952b66` (2026-05-29) added a noindex gate in `/crew/[slug]/generateMetadata`: pages where the person has no biography (fewer than 80 chars) AND fewer than 3 filmography credits get `robots: { index: false, follow: true }`. The commit message estimates ~12,000 of ~12,325 crew pages are thin. However, `sitemap-crew.xml` uses `listPeople(db, { limit: 50000 })` with no filtering, so it submits all ~12,000 noindex pages to Google Search Console. Google's documentation states that submitting noindex URLs in a sitemap is contradictory and may cause GSC warnings. More importantly it wastes the entire crawl budget allocated to the crew sitemap on pages that will be deindexed, delaying the ~325 curated crew pages.

### P1-4: Eight indexable static pages are missing `alternates.canonical`

The following non-dynamic pages have metadata but no `alternates: { canonical: '...' }`. Because the site serves `www.cinecanon.com` via a 307 redirect from `cinecanon.com`, search engines can encounter these pages on either host; without a canonical they cannot determine the preferred URL.

| Route | Rendered Title | Title Length |
|---|---|---|
| `/ask` | Ask anything \| CineCanon | 26 |
| `/format` | Browse by acquisition format \| CineCanon | 42 |
| `/gear` | Gear \| CineCanon | 16 |
| `/stunts` | Stunts \| CineCanon | 18 |
| `/stunts/people` | (varies) | — |
| `/stunts/sequences` | (varies) | — |
| `/stunts/lineage` | (varies) | — |
| `/societies` | Cinematography societies \| CineCanon | 37 |
| `/tools` | Tools \| CineCanon | 17 |
| `/tools/cdl` | (varies) | — |
| `/tools/coverage` | (varies) | — |
| `/tools/frame-lines` | (varies) | — |

Note: `/account`, `/signin`, `/import/letterboxd`, and the three `/*/compare` pages are also missing canonicals but are auth-gated or utility pages and do not require indexing; those are excluded from this count.

### P1-5: Apex-domain redirects remain `307 Temporary` (carry-over from 2026-05-20)

`https://cinecanon.com/*` continues to redirect with `307 Temporary Redirect` to `https://www.cinecanon.com/*`. A 307 is semantically "this might change back"; for canonical host normalization it should be `308 Permanent` or `301`. Additionally, `robots.txt` (`host: siteUrl()`) and the sitemap index both emit the `NEXT_PUBLIC_SITE_URL` value. If that env var is set to the apex `https://cinecanon.com` rather than the canonical `https://www.cinecanon.com`, every crawler hop incurs the extra redirect. This is an infrastructure/env-var configuration issue, not a code defect, but it has been open since May 20.

### P1-6: `EvidenceGallery` uses `alt=""` on evidence/citation images

**File:** `apps/web/components/ui/EvidenceGallery.tsx`, line 29

```tsx
<img
  src={mediaUrl}
  alt=""
  className="aspect-video w-full object-cover opacity-90"
  loading="lazy"
/>
```

These images are thumbnails of cited source evidence — screenshots of production documents, frame grabs used to substantiate editorial claims. They are content images, not decoration. CineCanon's brand promise is "every claim cited and confidence-graded"; an empty `alt` makes the citation images invisible to screen-reader users and to image-search indexing. The `item.caption` and `item.source_title` fields are available on the same `EvidenceItem` object and would make appropriate alt text.

---

## P2 — Polish

### P2-1: Multiple index page titles are too short

After the `" | CineCanon"` suffix is appended by the root layout, the following rendered titles fall under the 30-character minimum:

| Page | Rendered title | Length |
|---|---|---|
| `/ask` | Ask anything \| CineCanon | 26 |
| `/gear` | Gear \| CineCanon | 16 |
| `/tools` | Tools \| CineCanon | 17 |
| `/search` | Search \| CineCanon | 18 |
| `/stunts` | Stunts \| CineCanon | 18 |
| `/editing` | Editing \| CineCanon | 19 |

The `seo: mop up audit warnings` commit (1ce8ee7, 2026-05-26) lengthened `/films`, `/crew`, `/vfx`, `/about`, `/methodology`, and the query detail pages, but did not address `/gear`, `/stunts`, `/tools`, `/ask`, `/search`, or the sub-section indexes (Editing, Music, Sound).

### P2-2: `/decisions` meta description is 201 characters (over the 160-char threshold)

**File:** `apps/web/app/decisions/page.tsx`, line 11

The description `"Working-pro decision trees: anamorphic vs spherical, practical vs CGI, full orchestra vs samples, wire rig vs decelerator. Each tree with options, pros/cons, cost + complexity bands, and example films."` is 201 characters. Google truncates SERP descriptions at ~158 on desktop. The `truncateForMeta` utility exists in `lib/truncate-meta.ts` for this purpose and should be applied here.

### P2-3: `/tools/loadout` has two `<h1>` elements in the DOM simultaneously

**File:** `apps/web/app/tools/loadout/page.tsx`, lines 81 and 91

The page renders:
- Line 81: `<h1 className="mt-1 font-serif text-3xl text-zinc-50">Loadout calculator</h1>` inside `<header className="mb-6 print:hidden">`
- Line 91: `<h1 className="font-serif text-2xl">CineCanon — Loadout</h1>` inside `<header className="mb-6 hidden print:block">`

Both `<h1>` tags are in the DOM at all times; Tailwind's `hidden print:block` / `print:hidden` classes control screen-vs-print visibility via CSS but do not remove elements from the accessibility tree. Screen readers encounter two h1 headings, which violates WCAG 1.3.1 and the one-h1-per-page convention. The print header should use `<p>` or `<span>` styled as a heading rather than a semantic `<h1>`.

### P2-4: `console.warn` and `console.error` used broadly in production route handlers

Across 28+ route files and library modules, errors are caught and written to `console.warn`/`console.error` rather than routed through Sentry. Examples: `app/sound/adr-studios/[slug]/page.tsx`, `app/vfx/volumes/page.tsx`, `app/dossiers/[slug]/page.tsx`, `lib/gsc.ts`, `lib/tmdb.ts`. CLAUDE.md is explicit: "Don't add console.log or console.error in production code paths — use Sentry." These produce noise in Vercel function logs, diluting signal from genuine errors, and mean that when a database query silently fails the error is invisible in Sentry dashboards.

---

## Appendix — URL and status reference

### Previous P0s — confirmed resolved

| Item | Prior status | Current status |
|---|---|---|
| `/dossiers` | 404 | 200 — `app/dossiers/page.tsx` exists |
| `/walkthroughs` | 404 | 200 — `app/walkthroughs/page.tsx` exists |
| `/sound/mixers` | 404 | 200 — `app/sound/mixers/page.tsx` exists |
| `/sound/designers` | 404 | 200 — `app/sound/designers/page.tsx` exists |
| `/api/v1/aeo/digest` (no .xml) | 404 | Fixed — `llms.txt/route.ts` now references `.xml` variant |

### Previous P1s — confirmed resolved

| Item | Prior status | Current status |
|---|---|---|
| alt="" on homepage poster images | 10 empty-alt img tags | Homepage keyframe `<Image>` now has descriptive alt |
| Homepage missing canonical | No `<link rel="canonical">` | `alternates: { canonical: '/' }` in `app/page.tsx` |
| Film meta descriptions over 160 chars | Raw TMDb overviews | `truncateForMeta(max=155)` utility applied |
| `sitemap-films.xml` duplicates | 5 duplicate `<loc>` entries | `Set<string>` deduplication in route handler |
| Crew sitemap capped at 1,000 | 1k of ~12k crew indexed | `limit: 50000` passed to `listPeople` |
| `/stunts/coordinators`, `/stunts/companies`, `/awards/cinematography` 404 | 404 | Redirect pages exist |

### Previous P1-5 — still open

`https://cinecanon.com/*` → `307 Temporary` → `https://www.cinecanon.com/*`. Should be `308`/`301`. Consistent with infrastructure config; no code change in repo.

### Phase 4 tools — routes confirmed, sitemap absent

| Route | `page.tsx` | canonical | sitemap-core.xml |
|---|---|---|---|
| `/tools/scoring-session-cost` | Yes | Yes | No |
| `/tools/stunt-rig-picker` | Yes | Yes | No |
| `/tools/hdr-target-picker` | Yes | Yes | No |
| `/tools/anamorphic-vs-spherical` | Yes | Yes | No |

### New content sections — index routes present, no sitemap coverage

| Route | index `page.tsx` | `[slug]` pages | canonical on index | sitemap segment |
|---|---|---|---|---|
| `/walkthroughs` | Yes | Yes (force-dynamic) | Yes | None |
| `/dossiers` | Yes | Yes (force-dynamic) | Yes | None |
| `/decisions` | Yes | Yes (force-dynamic) | Yes | None |
| `/partnerships` | Yes | Yes (force-dynamic) | Yes | None |

### Full-crawl 2026-05-21 image findings (for continuity)

| Bucket | Count | Root cause | Current code state |
|---|---|---|---|
| `/_next/image` 400 (w1280 backdrops) | 541 | `unoptimized` missing on hero | Fixed in `c891ea0` |
| `/_next/image` 400 (w342/w154 posters) | 1,090 | `unoptimized` missing on cards | Fixed in `031c80b` / `c891ea0` |
| `/_next/image` 400 (w185 profiles) | 62 | `unoptimized` missing on crew | Fixed in `c891ea0` |
| `/_next/image` 000 (zero-byte/blocked) | 3 | TMDb hotlink probe-blocked | N/A — `unoptimized` bypasses proxy |
| Google favicon 404s | 12 | `BrandLogo` requests non-existent domains | Has `onError` fallback; cosmetic only |
| Crew pages network error (000) | 11 | Transient crawl-timeout, not server error | Pages exist in repo; presumed transient |

---

## What I'd fix first

The single most important change is **removing the `console.log` call from `safeAuth`** (lines 27–32 of `lib/safe-auth.ts`). Because `safeAuth()` is called from `app/layout.tsx`, which wraps every route in the application, it is emitting every authenticated user's email address, role, and internal ID to Vercel's server logs on every page load right now in production. Delete the `console.log` block and replace the `console.warn` on the catch path with `Sentry.captureException(err, { tags: { source: 'safeAuth' } })`. That is a two-line change with zero risk and closes a live PII leak.

After that, the highest-leverage single commit would be **expanding `sitemap-core.xml` and `sitemap.xml` to cover the three new content sections**. Add `/walkthroughs`, `/dossiers`, `/decisions`, and `/partnerships` to `sitemap-core.xml`, add the four Phase 4 tool pages, and either add a `sitemap-walkthroughs.xml` / `sitemap-dossiers.xml` / `sitemap-decisions.xml` segment or include the detail-page slugs in `sitemap-core.xml`. This work is worth doing immediately because these sections were the five former P0 "routes that exist in code but are dead in production" — they now exist and work, but Google still cannot discover their content pages. Simultaneously, add a `hasCuratableContent` filter to `sitemap-crew.xml` to exclude the ~12,000 thin noindex pages from the crawl budget. Those two sitemap tasks together — adding the new sections, subtracting the thin crew pages — would correct the most significant current discoverability gap.
