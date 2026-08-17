# CineCanon QA Sweep — 2026-08-17

## Scope and methodology note

Live HTTP crawl of https://cinecanon.com was **blocked by the session's egress proxy** (HTTP 403 CONNECT on all destinations outside the allowlist). All findings below are therefore from **static analysis of the repository at `/home/user/bts` (branch `master`)** rather than live network responses. Where a defect is detectable only from live traffic (exact HTTP status codes, response body sizes, actual CDN image resolution) this is noted explicitly. All source-code references are absolute paths.

Pages in scope: 133 non-admin `page.tsx` files (96 static-route pages, 37 dynamic-route groups), 27 API route handlers, 5 sitemap XML routes, and the `robots.ts` + `llms.txt/route.ts` discovery endpoints.

---

## Summary

| Metric | Count |
|---|---|
| Page route files analyzed | 133 (non-admin) |
| API route files analyzed | 27 |
| P0 — Broken defects | 3 |
| P1 — Degraded defects | 9 |
| P2 — Polish defects | 4 |
| Total defects | 16 |

---

## P0 — Broken

### P0-1: Placeholder text live on production stunt-school detail pages

**File:** `apps/web/app/stunts/schools/[slug]/page.tsx`, lines 149–162

Every `/stunts/schools/<slug>` detail page renders a section titled "Notable alumni" containing the literal string **"Alumni mapping coming with phase 2."** inside a dashed-border box. This is a wireframe-level placeholder that was never replaced before ship. Any visitor navigating to a school detail page (linked from stunt-coordinator crew pages) sees unfinished product.

Rendered HTML excerpt (static, not conditioned on any data flag):
```
<div class="... border-dashed ...">
  Alumni mapping coming with phase 2.
</div>
```

**Impact:** Breaks the brand promise ("every claim cited") on a department CineCanon markets as its key differentiator ("the most under-documented department, catalogued").

---

### P0-2: Unshipped feature promoted in hero on /lookbook

**File:** `apps/web/app/lookbook/page.tsx`, lines 36–39

The `/lookbook` page hero eyebrow reads **"Visual search · upload coming soon"** and the description explicitly states "Reference-still upload is in development." The page is linked from multiple internal cross-cut surfaces. First-time visitors are greeted with an incomplete feature before they can find the palette browser that does exist.

**Impact:** Trust regression on first visit. The page is indexable (no `robots: noindex`) so Google may surface it as the landing page for "CineCanon visual search"-type queries, immediately surfacing "coming soon."

---

### P0-3: JSON-LD `<script>` tag lacks `</script>` escaping — latent XSS vector

**File:** `apps/web/lib/jsonLd.tsx`, line 25

The `JsonLd` component renders structured data using:
```tsx
dangerouslySetInnerHTML={{ __html: JSON.stringify(cleaned) }}
```

`JSON.stringify` does **not** replace `</` with `<\/`. If any claim `statement`, synopsis, or title stored in the database contains the literal string `</script>`, the browser's HTML parser will prematurely close the JSON-LD `<script>` tag at that point. Everything after the `</script>` becomes raw HTML, and an attacker with write access to the `claims` table (or who can coerce a bad ingest record) could inject arbitrary script content into film and crew detail pages.

The `clean()` helper strips nulls/undefined but performs no HTML escaping. Content-trusted paths (admin-curated claims, TMDb-sourced synopses) reduce exploitation likelihood, but the vulnerability class is well-documented (OWASP: "Unsafe inline script via JSON-LD").

The fix is a one-liner in `clean()` or immediately before `JSON.stringify`:
```ts
JSON.stringify(cleaned).replace(/<\/script>/gi, '<\\/script>')
```

**Impact:** Latent XSS. Risk is moderate-to-high given the admin curate flow allows arbitrary text entry into `claims.statement`.

---

## P1 — Degraded

### P1-1: 36 `console.warn`/`console.error` calls in production server code

**CLAUDE.md policy:** "Don't add console.log or console.error in production code paths — use Sentry."

34 non-admin production page files and 1 API route (`api/search/nl/route.ts`) emit `console.warn` or `console.error`. These calls write plaintext errors to Vercel's function log stream rather than through Sentry, meaning:
- Errors are not aggregated, alerted, or tagged with page context.
- Stack traces are visible in Vercel logs but not in the error-tracking dashboard.
- The pattern `try { ... } catch (e) { console.warn(e); }` silently swallows errors that should trigger operational alerts.

Files affected (abbreviated):
```
app/page.tsx (console.error — homepage queries)
app/editing/walkthroughs/page.tsx
app/sound/adr-studios/[slug]/page.tsx
app/sound/houses/page.tsx
app/vfx/volumes/[slug]/page.tsx
app/vfx/title-houses/page.tsx
app/music/orchestras/[slug]/page.tsx
app/partnerships/[slug]/page.tsx
app/gear/rentals/[slug]/page.tsx
app/costume-hair-makeup/construction-houses/page.tsx
... (26 more)
```

---

### P1-2: 29+ section-level routes absent from all sitemap segments

The sitemap index at `/sitemap.xml` points to five segment sitemaps (`sitemap-core.xml`, `sitemap-films.xml`, `sitemap-crew.xml`, `sitemap-gear.xml`, `sitemap-vfx.xml`). The following publicly-linked index pages appear in no segment:

| Missing route | Linked from |
|---|---|
| `/sound` | TopNav "Craft" dropdown, Footer |
| `/music` | TopNav "Craft" dropdown, Footer |
| `/editing` | TopNav "Craft" dropdown, Footer |
| `/production-design` | Footer |
| `/costume-hair-makeup` | Footer |
| `/awards` | TopNav flat links |
| `/about` | TopNav mobile drawer, Footer |
| `/methodology` | Footer, llms.txt |
| `/references` | TopNav flat links |
| `/walkthroughs` | Footer |
| `/dossiers` | Footer |
| `/decisions` | Footer |
| `/partnerships` | Footer |
| `/shots` | Footer, Homepage |
| `/decades` | Footer |
| `/lookbook` | Footer |
| `/gear/rentals` | Footer |
| `/equipment/specs` | Footer |
| `/vfx/volumes` | Footer |
| `/vfx/title-houses` | Footer |
| `/vfx/shot-breakdowns` | Footer |
| `/societies` | (linked from crew pages) |
| `/for-dps` | Footer, llms.txt |
| `/for-colorists` | Footer, llms.txt |
| `/for-gaffers` | Footer, llms.txt |
| `/for-editors` | Footer, llms.txt |
| `/for-composers` | Footer, llms.txt |
| `/for-coordinators` | Footer, llms.txt |
| ... (all 12 for-* role pages) | Footer |

Search engines relying on the sitemap for crawl-budget allocation cannot discover these pages. Google Search Console will not report them as indexed.

---

### P1-3: 4 Phase 4 decision tools missing from sitemap

The four tools shipped in the most recent delivery cycle are linked from `/tools` and mentioned in `llms.txt` but absent from `sitemap-core.xml`:

- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

**File:** `apps/web/app/sitemap-core.xml/route.ts` — none of these slugs appear in the `entries` array.

All four pages have correct `alternates.canonical` metadata, so Google can self-discover the canonical once it crawls them, but without a sitemap entry there is no crawl-budget signal.

---

### P1-4: Missing `alternates.canonical` on 23 page routes

The following pages have `export const metadata` but omit `alternates: { canonical: ... }`. Without a canonical tag, parameter-polluted URLs (e.g. `/gear?utm_source=x`) can be indexed as duplicate pages, and Google may pick an arbitrary URL as the canonical.

| Route | File |
|---|---|
| `/ask` | `app/ask/page.tsx` |
| `/stunts` | `app/stunts/page.tsx` |
| `/stunts/people` | `app/stunts/people/page.tsx` |
| `/stunts/sequences` | `app/stunts/sequences/page.tsx` |
| `/stunts/lineage` | `app/stunts/lineage/page.tsx` |
| `/gear` (index) | `app/gear/page.tsx` |
| `/gear/[manufacturer]` | `app/gear/[manufacturer]/page.tsx` |
| `/gear/compare` | `app/gear/compare/page.tsx` |
| `/format` | `app/format/page.tsx` |
| `/format/[slug]` | `app/format/[slug]/page.tsx` |
| `/tools` | `app/tools/page.tsx` |
| `/tools/frame-lines` | `app/tools/frame-lines/page.tsx` |
| `/tools/coverage` | `app/tools/coverage/page.tsx` |
| `/tools/cdl` | `app/tools/cdl/page.tsx` |
| `/references/[id]` | `app/references/[id]/page.tsx` |
| `/societies` | `app/societies/page.tsx` |
| `/search` | `app/search/page.tsx` |
| `/signin` | `app/signin/page.tsx` |
| `/account` | `app/account/page.tsx` |
| `/bookmarks` | `app/bookmarks/page.tsx` |
| `/import/letterboxd` | `app/import/letterboxd/page.tsx` |
| `/crew/compare` | `app/crew/compare/page.tsx` |
| `/films/compare` | `app/films/compare/page.tsx` |

---

### P1-5: `alt=""` on content-adjacent film poster images in search-result contexts

**Files:** `apps/web/app/ask/page.tsx` line 254, `apps/web/app/vfx/[slug]/page.tsx` line 172, `apps/web/app/gear/[manufacturer]/[series]/page.tsx` line 268, `apps/web/app/crew/[slug]/page.tsx` line 848.

In each case a film poster (fetched from `posterUrl()`) is rendered with `alt=""`. These images appear in result lists where the adjacent film title text is the accessible label. However:

- The `/ask` results list renders posters alongside film titles — a screen-reader user who navigates by image gets nothing but the link's text fallback.
- The VFX house filmography on `/vfx/[slug]` uses `alt=""` on a 2:3 poster without a sibling visible title in the same element.

`alt=""` is correct for purely decorative images (where adjacent text fully describes the content), but the rule is imprecise for these poster thumbnails. At minimum the crew "known for" and ask result posters should carry `alt={film.title}`.

---

### P1-6: Meta description out-of-range on three high-traffic pages

| Page | Char count | Issue |
|---|---|---|
| `/awards` | 272 | 70% over 160-char limit; Google truncates at ~158 chars, cutting off the filter affordance copy |
| `/sound` | 170 | Slightly over 160-char limit |
| `/music` | 80 | Under 120-char lower bound; too thin for SERP display |

**Files:**
- `apps/web/app/awards/page.tsx` — description is a single long run-on sentence listing every award body.
- `apps/web/app/sound/page.tsx` — description is slightly too long.
- `apps/web/app/music/page.tsx` — description is "Composers, music supervisors, and orchestrators — credited and cross-referenced." (80 chars).

---

### P1-7: `/awards/cinematography` performs an unlogged server redirect

**File:** `apps/web/app/awards/cinematography/page.tsx`

The file calls `redirect('/awards/craft/cinematography')` without going through the `notFound()` guard or logging to Sentry. The redirect is one hop and uses the correct `307` status, so crawlers will follow it. However:

- The `llms.txt` and some internal links point to `/awards/cinematography` directly, so all AI crawlers following those links burn an extra round-trip.
- The source URL `/awards/cinematography` has no canonical metadata and will appear in Vercel analytics as a redirect.

This is low-severity but contributes to crawl waste.

---

### P1-8: No `Content-Security-Policy` header configured

**File:** `apps/web/next.config.mjs`

The security headers block sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` but omits `Content-Security-Policy`. Without CSP:

- The JSON-LD injection risk (P0-3) has no second line of defense.
- Injected inline scripts, if exploited, would execute without restriction.
- Lighthouse Best-Practices may dock points for missing CSP.

---

### P1-9: Phase 4 tools absent from `llms.txt` individual link list

**File:** `apps/web/app/llms.txt/route.ts`, "Tools" section (lines 127–129)

The `/llms.txt` Tools section only links to `/gear/compare` (side-by-side spec) and `/search`. The four Phase 4 decision tools are mentioned in passing in the Index pages section as "(scoring-session cost, stunt-rig picker, HDR target picker, anamorphic vs spherical)" but have no individual `[Tool Name](URL)` entries. AI crawlers following `llms.txt` to build their knowledge graph will not have stable per-tool URLs to cite.

---

## P2 — Polish

### P2-1: Title `<title>` too short on 8 section pages

With the layout template `%s | CineCanon` (appends 12 characters), the following pages produce final titles under 30 characters — too short to differentiate in SERPs:

| Page | Raw title | Final title | Chars |
|---|---|---|---|
| `/gear` | Gear | Gear \| CineCanon | 16 |
| `/sound` | Sound | Sound \| CineCanon | 17 |
| `/music` | Music | Music \| CineCanon | 17 |
| `/stunts` | Stunts | Stunts \| CineCanon | 18 |
| `/awards` | Awards | Awards \| CineCanon | 18 |
| `/editing` | Editing | Editing \| CineCanon | 19 |
| `/search` | Search | Search \| CineCanon | 18 |
| `/ask` | Ask anything | Ask anything \| CineCanon | 24 |

Comparable section pages that do it right: `/crew` → "Crew — Directors, DPs, Editors & Designers | CineCanon" (55 chars), `/vfx` → "VFX Houses — Studios, Boutique & In-House Facilities | CineCanon" (65 chars).

---

### P2-2: `/tools/loadout` renders two `<h1>` elements simultaneously in the DOM

**File:** `apps/web/app/tools/loadout/page.tsx`, lines 81 and 91

The page has an on-screen `<h1>Loadout calculator</h1>` inside `print:hidden` and a separate `<h1>CineCanon — Loadout</h1>` inside `hidden print:block`. The second h1 is visually hidden in browsers but is present in the DOM and therefore visible to search-engine crawlers and accessibility tools. The WCAG requirement for exactly one `<h1>` per page applies to the DOM, not the visual rendering. The second h1 would be better implemented as a `<p>` or `aria-hidden`.

---

### P2-3: `gear/[manufacturer]` detail pages missing OG/Twitter card metadata

**File:** `apps/web/app/gear/[manufacturer]/page.tsx`

`generateMetadata` returns `title` and `description` only — no `openGraph`, `twitter`, or `alternates.canonical`. When a manufacturer page URL is shared in Slack/Notion/Twitter, it will fall back to the root-level OG card (the generic CineCanon brand image) rather than a contextual card. The film and crew detail pages both have OG/Twitter metadata; manufacturer pages lag.

---

### P2-4: `/stunts/schools/[slug]` lacks `generateStaticParams` and has no `revalidate`

**File:** `apps/web/app/stunts/schools/[slug]/page.tsx`

No `generateStaticParams` is exported. The route renders fully dynamically on every cold request, with no ISR `revalidate`. For data that changes once a month at most, this wastes function invocations. Comparable pages (`/vfx/[slug]`, `/gear/[manufacturer]/[series]/[item]`) all export `revalidate = 86400`.

---

## Appendix — Full URL × Status Table

> **Note:** Live HTTP status codes could not be verified — the egress proxy blocks outbound HTTPS to cinecanon.com. The table below records the route and its expected HTTP behavior based on static analysis.

| Route | Type | Expected status | Notes |
|---|---|---|---|
| `/` | Static index | 200 | `revalidate=3600` |
| `/films` | Static index | 200 | `revalidate=3600` |
| `/films/[slug]` | Dynamic/ISR | 200 / 404 | `revalidate=86400`; curated set pre-rendered |
| `/films/compare` | Dynamic | 200 | No canonical |
| `/films/[slug]/loadout` | Dynamic | 200 | No revalidate |
| `/films/[slug]/scenes/[sceneSlug]` | Dynamic | 200 / 404 | |
| `/crew` | Dynamic | 200 | `revalidate=3600` |
| `/crew/[slug]` | Dynamic | 200 / 404 | `force-dynamic`; `revalidate=86400` |
| `/crew/compare` | Dynamic | 200 | No canonical |
| `/gear` | Dynamic | 200 | `revalidate=86400`; **no canonical** |
| `/gear/[manufacturer]` | Dynamic | 200 / 404 | **No canonical, no OG** |
| `/gear/[manufacturer]/[series]` | Dynamic | 200 / 404 | |
| `/gear/[manufacturer]/[series]/[item]` | Dynamic | 200 / 404 | |
| `/gear/compare` | Dynamic | 200 | No canonical |
| `/gear/rentals` | Dynamic | 200 | **Not in sitemap** |
| `/gear/rentals/[slug]` | Dynamic | 200 / 404 | |
| `/vfx` | Dynamic | 200 | `revalidate=86400` |
| `/vfx/[slug]` | Dynamic | 200 / 404 | |
| `/vfx/volumes` | Dynamic | 200 | **Not in sitemap** |
| `/vfx/volumes/[slug]` | Dynamic | 200 / 404 | |
| `/vfx/title-houses` | Dynamic | 200 | **Not in sitemap** |
| `/vfx/title-houses/[slug]` | Dynamic | 200 / 404 | |
| `/vfx/shot-breakdowns` | Dynamic | 200 | **Not in sitemap** |
| `/stunts` | Dynamic | 200 | **No canonical** |
| `/stunts/people` | Dynamic | 200 | **No canonical** |
| `/stunts/sequences` | Dynamic | 200 | **No canonical** |
| `/stunts/lineage` | Dynamic | 200 | **No canonical** |
| `/stunts/rigging` | Dynamic | 200 | |
| `/stunts/safety` | Dynamic | 200 | |
| `/stunts/companies` | Dynamic | 200 | Not in sitemap |
| `/stunts/coordinators` | Dynamic | 200 | Not in sitemap |
| `/stunts/schools/[slug]` | Dynamic | 200 | **Placeholder content live** |
| `/sound` | Dynamic | 200 | **Not in sitemap** |
| `/sound/post` | Dynamic | 200 | Not in sitemap |
| `/sound/effects` | Dynamic | 200 | Not in sitemap |
| `/sound/foley` | Dynamic | 200 | Not in sitemap |
| `/sound/houses` | Dynamic | 200 | Not in sitemap |
| `/sound/adr-studios` | Dynamic | 200 | Not in sitemap |
| `/sound/adr-studios/[slug]` | Dynamic | 200 / 404 | |
| `/sound/effects/libraries` | Dynamic | 200 | Not in sitemap |
| `/sound/effects/libraries/[slug]` | Dynamic | 200 / 404 | |
| `/music` | Dynamic | 200 | **Not in sitemap** |
| `/music/composers` | Dynamic | 200 | Not in sitemap |
| `/music/scoring-stages` | Dynamic | 200 | Not in sitemap |
| `/music/scoring-stages/[slug]` | Dynamic | 200 / 404 | |
| `/music/orchestras` | Dynamic | 200 | Not in sitemap |
| `/music/orchestras/[slug]` | Dynamic | 200 / 404 | |
| `/music/supervisors` | Dynamic | 200 | Not in sitemap |
| `/music/supervision-agencies` | Dynamic | 200 | Not in sitemap |
| `/music/cue-guides` | Dynamic | 200 | Not in sitemap |
| `/music/cues/[pSlug]/[cSlug]` | Dynamic | 200 / 404 | |
| `/music/scores/[pSlug]` | Dynamic | 200 / 404 | |
| `/editing` | Dynamic | 200 | **Not in sitemap** |
| `/editing/editors` | Dynamic | 200 | Not in sitemap |
| `/editing/walkthroughs` | Dynamic | 200 | Not in sitemap |
| `/production-design` | Dynamic | 200 | **Not in sitemap** |
| `/production-design/designers` | Dynamic | 200 | Not in sitemap |
| `/production-design/works` | Dynamic | 200 | Not in sitemap |
| `/costume-hair-makeup` | Dynamic | 200 | **Not in sitemap** |
| `/costume-hair-makeup/designers` | Dynamic | 200 | Not in sitemap |
| `/costume-hair-makeup/effects-houses` | Dynamic | 200 | Not in sitemap |
| `/costume-hair-makeup/effects-houses/[slug]` | Dynamic | 200 / 404 | |
| `/costume-hair-makeup/construction-houses` | Dynamic | 200 | Not in sitemap |
| `/costume-hair-makeup/construction-houses/[slug]` | Dynamic | 200 / 404 | |
| `/costume-hair-makeup/costume-works` | Dynamic | 200 | Not in sitemap |
| `/costume-hair-makeup/makeup-works` | Dynamic | 200 | Not in sitemap |
| `/walkthroughs` | Dynamic | 200 | **Not in sitemap** |
| `/walkthroughs/[slug]` | Dynamic | 200 / 404 | |
| `/dossiers` | Dynamic | 200 | Not in sitemap |
| `/dossiers/[slug]` | Dynamic | 200 / 404 | |
| `/decisions` | Dynamic | 200 | Not in sitemap |
| `/decisions/[slug]` | Dynamic | 200 / 404 | |
| `/partnerships` | Dynamic | 200 | Not in sitemap |
| `/partnerships/[slug]` | Dynamic | 200 / 404 | |
| `/awards` | Dynamic | 200 | **Not in sitemap; desc 272 chars** |
| `/awards/cinematography` | Server redirect | 307 → /awards/craft/cinematography | One-hop OK |
| `/awards/craft/[craft]` | Dynamic | 200 / 404 | |
| `/tools` | Static | 200 | **No canonical** |
| `/tools/frame-lines` | Static | 200 | **No canonical** |
| `/tools/coverage` | Static | 200 | **No canonical** |
| `/tools/aces` | Static | 200 | |
| `/tools/cdl` | Static | 200 | **No canonical** |
| `/tools/loadout` | Dynamic | 200 | **Two h1 in DOM** |
| `/tools/scoring-session-cost` | Static | 200 | **Not in sitemap** |
| `/tools/stunt-rig-picker` | Static | 200 | **Not in sitemap** |
| `/tools/hdr-target-picker` | Static | 200 | **Not in sitemap** |
| `/tools/anamorphic-vs-spherical` | Static | 200 | **Not in sitemap** |
| `/ask` | Dynamic | 200 | **No canonical** |
| `/search` | Dynamic | 200 | noindex, **no canonical** |
| `/references` | Dynamic | 200 | Not in sitemap |
| `/references/[id]` | Dynamic | 200 / 404 | **No canonical** |
| `/shots` | Dynamic | 200 | Not in sitemap |
| `/decades` | Dynamic | 200 | Not in sitemap |
| `/decades/[decade]` | Dynamic | 200 / 404 | |
| `/format` | Dynamic | 200 | **No canonical** |
| `/format/[slug]` | Dynamic | 200 / 404 | **No canonical** |
| `/lookbook` | Dynamic | 200 | **"coming soon" in hero** |
| `/about` | Static | 200 | Not in sitemap |
| `/methodology` | Static | 200 | Not in sitemap |
| `/societies` | Dynamic | 200 | **No canonical, not in sitemap** |
| `/queries` | Static | 200 | |
| `/queries/alexa65-sphero` | Static | 200 | In sitemap |
| `/queries/dune-part-two-lenses` | Static | 200 | In sitemap |
| `/queries/magic-hour-2023` | Static | 200 | In sitemap |
| `/for-dps` | Dynamic | 200 | **Not in sitemap** |
| `/for-colorists` | Dynamic | 200 | Not in sitemap |
| `/for-gaffers` | Dynamic | 200 | Not in sitemap |
| `/for-editors` | Dynamic | 200 | Not in sitemap |
| `/for-composers` | Dynamic | 200 | Not in sitemap |
| `/for-coordinators` | Dynamic | 200 | Not in sitemap |
| `/for-sound-mixers` | Dynamic | 200 | Not in sitemap |
| `/for-sound-designers` | Dynamic | 200 | Not in sitemap |
| `/for-production-designers` | Dynamic | 200 | Not in sitemap |
| `/for-costume-designers` | Dynamic | 200 | Not in sitemap |
| `/for-makeup-artists` | Dynamic | 200 | Not in sitemap |
| `/for-music-supervisors` | Dynamic | 200 | Not in sitemap |
| `/bookmarks` | Dynamic | 200 | No canonical |
| `/account` | Dynamic | 200 | No canonical |
| `/signin` | Dynamic | 200 | No canonical |
| `/import/letterboxd` | Dynamic | 200 | No canonical |
| `/locations` | Dynamic | 200 | |
| `/locations/[id]` | Dynamic | 200 / 404 | |
| `/claims/[id]` | Dynamic | 200 / 404 | |
| `/digest.xml` | Dynamic | 200 | Atom feed |
| `/sitemap.xml` | Dynamic | 200 | Sitemap index |
| `/sitemap-core.xml` | Dynamic | 200 | |
| `/sitemap-films.xml` | Dynamic | 200 | |
| `/sitemap-crew.xml` | Dynamic | 200 | |
| `/sitemap-gear.xml` | Dynamic | 200 | |
| `/sitemap-vfx.xml` | Dynamic | 200 | |
| `/robots.txt` | Generated | 200 | `app/robots.ts`; points to /sitemap.xml |
| `/llms.txt` | Dynamic | 200 | Hybrid static/DB |
| `/api/v1` | Dynamic | 200 | Discovery doc; CORS open |
| `/api/v1/productions/[slug]` | Dynamic | 200 / 404 | `s-maxage=300` |
| `/api/v1/crew/[slug]` | Dynamic | 200 / 404 | CORS open |
| `/api/health` | Dynamic | 200 | Internal health check |
| `/oembed` | Dynamic | 200 / 404 | `revalidate=3600` |

---

## What I'd fix first

The single highest-leverage fix is **P0-3: add `</script>` escaping to the `JsonLd` component in `lib/jsonLd.tsx`**. It is a one-line change (`JSON.stringify(cleaned).replace(/<\/script>/gi, '<\\/script>')`), it closes a real XSS class across every film, crew, and scene detail page simultaneously, and it eliminates a failure mode that would be catastrophic for a site whose brand promise is trustworthiness. After that, **P0-1** (remove the "Alumni mapping coming with phase 2" placeholder from stunt school pages) and **P0-2** (retitle or gate the `/lookbook` "coming soon" eyebrow) are both single-file changes that directly protect the editorial credibility the site is built on. Once the P0s are cleared, the sitemap gap (P1-2 + P1-3) should be addressed as a batch — adding 29+ section-level URLs to `sitemap-core.xml` costs minimal developer time and immediately unblocks search-engine crawl budget for the music, sound, editing, production design, and role-landing pages that represent months of editorial work but are currently invisible to crawlers.
