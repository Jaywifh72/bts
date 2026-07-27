# CineCanon QA Sweep — 2026-07-27

**Audit Method:** Full source-code analysis of the repository at `/home/user/bts` (branch `master`). Live HTTP verification could not be performed because the egress proxy blocks connections to `cinecanon.com:443` under session policy (recorded failure: `connect_rejected`, `gateway answered 403`). All findings are derived from code, routes, metadata, and component inspection. Any defect marked with "(live-verify)" requires a browser or off-proxy check to confirm.

---

## Summary

Pages catalogued from route tree: **~135 public-facing page routes** (excluding admin). Analysis covered route definitions, metadata exports, component files, sitemap routes, robots.txt, llms.txt, JSON-LD builders, navigation, image handling, and code-quality conventions.

| Severity | Count |
|---|---|
| P0 — Broken | 0 confirmed; 1 risk item flagged |
| P1 — Degraded | 5 distinct issues, ~60+ affected URLs |
| P2 — Polish | 7 distinct issues |

---

## P0 — Broken

No pages are confirmed broken from code analysis. However, one risk item deserves immediate live-verify:

**P0-RISK: `NEXT_PUBLIC_SITE_URL` fallback is `http://localhost:3000`**

`apps/web/lib/site.ts` line 11:
```
const FALLBACK = 'http://localhost:3000';
```

Every canonical URL, OG meta URL, JSON-LD `@id`, sitemap `<loc>`, and `llms.txt` absolute URL is built from `siteUrl()`. If `NEXT_PUBLIC_SITE_URL` is absent or blank in the Vercel environment, all of these emit `http://localhost:3000/…`. Since `NEXT_PUBLIC_*` variables are inlined at build time, a misconfigured build would permanently corrupt the canonical graph until a re-deploy with the env var set. Recommend adding a build-time assertion or a CI check that aborts if the env var is missing.

---

## P1 — Degraded

### P1-1: Sitemap Index Covers Only 5 of ~15 Content Sections — Approx. 60+ Indexable URLs Excluded

`/sitemap.xml` delegates to five sub-sitemaps: `core`, `films`, `crew`, `gear`, `vfx`. The following entire sections of the site are reachable by internal links (footer, nav) but appear in no sitemap, giving search and AI crawlers no systematic discovery path:

**Section-index pages missing from all sitemaps:**
- `/awards` (the index), `/awards/craft/cinematography`, `/awards/craft/editing`, `/awards/craft/production-design`, `/awards/craft/costume-design`, `/awards/craft/makeup-hairstyling`, `/awards/craft/sound-design`, `/awards/craft/dialogue-adr`, `/awards/craft/music-editing`, `/awards/craft/score`, `/awards/craft/music-supervision`, `/awards/craft/visual-effects`, `/awards/craft/stunts`, `/awards/craft/casting`, `/awards/craft/animation`, `/awards/craft/art-direction` — 16 awards pages total; all have `generateStaticParams`.
- `/methodology`, `/about`, `/references` — core editorial credibility pages.
- All 12 `for-*` role landing pages: `/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-coordinators`, `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-editors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`. These have canonical URLs set and are linked from the footer "For working pros" column.
- `/sound`, `/sound/post`, `/sound/effects`, `/sound/foley`, `/sound/mixers`, `/sound/designers`, `/sound/adr-studios`, `/sound/houses`.
- `/music`, `/music/composers`, `/music/cue-guides`, `/music/scoring-stages`, `/music/supervisors`, `/music/orchestras`.
- `/editing`, `/editing/editors`, `/editing/walkthroughs`.
- `/production-design`, `/production-design/designers`, `/production-design/works`.
- `/costume-hair-makeup`, `/costume-hair-makeup/designers`, `/costume-hair-makeup/effects-houses`, `/costume-hair-makeup/construction-houses`, `/costume-hair-makeup/costume-works`, `/costume-hair-makeup/makeup-works`.
- `/dossiers`, `/walkthroughs`, `/decisions`, `/partnerships`.
- `/locations`, `/shots`, `/lookbook`, `/decades`, `/queries`.
- `/societies`.
- `/vfx/shot-breakdowns`, `/vfx/title-houses`, `/vfx/volumes`.
- `/gear/rentals`.

**Detail pages with `generateStaticParams` missing from all sitemaps:**
- `/stunts/companies/[slug]`, `/stunts/sequences/[productionSlug]/[sequenceSlug]`, `/stunts/rigging/[slug]`, `/stunts/safety/[slug]`.
- `/dossiers/[slug]`, `/walkthroughs/[slug]`, `/decisions/[slug]`, `/partnerships/[slug]`.
- `/societies/[slug]`, `/references/[id]`.
- `/sound/houses/[slug]`, `/sound/effects/libraries/[slug]`, `/sound/adr-studios/[slug]`.
- `/music/scoring-stages/[slug]`, `/music/orchestras/[slug]`, `/music/supervision-agencies/[slug]`.

**New Phase 4 tool pages missing from `sitemap-core.xml`:**
- `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical` — all present in code with canonical URLs and metadata, absent from `sitemap-core.xml` which lists only 5 tool sub-pages.

**Impact:** Google, Bing, and AI crawlers (ChatGPT-search, Perplexity, Gemini) use the sitemap as the primary crawl queue signal. Sections absent from the sitemap rely entirely on link-following, which is slower, less reliable, and gives no `lastmod` signal for freshness prioritisation. Given CineCanon's stated GEO goal of AI-engine citation precision, this gap directly undermines the Sentinel programme.

---

### P1-2: `console.warn` / `console.error` in Production Server Components (CLAUDE.md Violation)

CLAUDE.md states: "Don't add console.log or console.error in production code paths — use Sentry."

Approximately 23 production `.tsx` files (non-admin, non-test) contain `console.warn` or `console.error` calls on error paths. Representative examples:

- `app/page.tsx` lines 79–80: `console.error('[homepage] listRecentlyResolvedCorrections failed'…)` and `console.error('[homepage] listRecentCitations failed'…)`
- `app/api/search/nl/route.ts` line 78: `console.error('theme embed failed…')`
- `app/vfx/volumes/page.tsx`: `console.warn('[vp_volumes] table missing or query failed…')`
- `app/vfx/title-houses/page.tsx`: `console.warn('[title_sequence_houses] table missing')`
- `app/partnerships/page.tsx`: `console.warn('[partnerships] table missing or query failed')`
- `app/gear/rentals/page.tsx`: `console.warn('[rental_houses] table missing or query failed')`
- `app/music/orchestras/page.tsx`: `console.warn('[recording_orchestras] table missing or query failed')`
- `app/sound/houses/page.tsx`, `app/sound/effects/libraries/page.tsx`, `app/sound/adr-studios/page.tsx`: similar patterns
- Plus 14 more files in costume, music, VFX, editing, dossiers, and walkthroughs sections.

The repeated "table missing" messages suggest several newer sections may be silently serving empty content in production because underlying DB migrations haven't been applied. Pages catch the error and render empty-state UIs rather than crashing, so visitors see hollow sections without knowing why. Sentry would make these failures visible.

---

### P1-3: `EvidenceGallery` — `alt=""` on Claim-Evidence Images

File: `apps/web/components/ui/EvidenceGallery.tsx` line 29.

The `EvidenceGallery` component renders cited evidence items (BTS photos, production stills, document scans) with `alt=""`. These are not decorative images — they are the primary visual proof attached to specific editorial claims and displayed on film detail pages alongside confidence-grade badges. A screen-reader user who encounters a claim backed by a BTS photo receives no description of what the photo shows.

The component already receives `item.caption` and `item.source_title`; either or both could populate the `alt` attribute. The fix is mechanical: `alt={item.caption ?? item.source_title ?? ''}`. Per WCAG 2.1 §1.1.1, content images must have a text alternative.

---

### P1-4: `MediaGallery` — `alt=""` on Film Backdrop Images

File: `apps/web/components/productions/MediaGallery.tsx` line 34.

The `MediaGallery` component renders up to 8 TMDb backdrop images per film detail page in a horizontal scroll strip. All use `alt=""`. At minimum the film title is available from the call site. The component signature does not accept a `title` prop, so the fix requires either adding one or switching to a slot pattern. Lower urgency than EvidenceGallery since these images appear within the film detail context where the title is visible, but still an accessibility gap.

---

### P1-5: Meta Descriptions Significantly Over the 160-Character Target on Four Key Pages

Pages that render with descriptions exceeding 160 characters get truncated arbitrarily by Google in SERPs and AI-engine summaries.

| Route | Description Length | Excess |
|---|---|---|
| `/awards` | 272 chars | +112 |
| `/decisions` | 201 chars | +41 |
| `/ask` | 193 chars | +33 |
| `/films` | 163 chars | +3 |

The `/awards` description lists 10 award body names in a run-on sentence. Recommendation: front-load the single most important signal and trim, e.g. "Every documented cinematography, editing, VFX, stunts, sound, music, and design award — Oscars, BAFTAs, ASC, VES, Taurus. Filterable by craft, org, and year." (153 chars).

---

## P2 — Polish

### P2-1: Short Page Titles on Major Section Indexes

After the root layout's `%s | CineCanon` title template is applied, these section index pages produce titles well under the 30-character lower bound:

| Route | Full Title | Length |
|---|---|---|
| `/gear` | "Gear \| CineCanon" | 16 |
| `/tools` | "Tools \| CineCanon" | 17 |
| `/music` | "Music \| CineCanon" | 17 |
| `/awards` | "Awards \| CineCanon" | 18 |
| `/stunts` | "Stunts \| CineCanon" | 18 |
| `/editing` | "Editing \| CineCanon" | 19 |
| `/ask` | "Ask anything \| CineCanon" | 24 |

Short titles reduce CTR and give AI engines a weak signal for entity recognition. Each single-word section title should adopt the `Section — Brief Tagline` pattern used elsewhere (e.g. "Films — Cameras, Lenses & Crew Database \| CineCanon").

---

### P2-2: Missing `alternates.canonical` on Several Indexable Pages

Next.js does not auto-inject a canonical `<link>` unless declared in `alternates.canonical`. Pages missing it:

- `/gear`, `/tools`, `/stunts`, `/format`, `/societies`
- `/gear/[manufacturer]` (all manufacturer pages)
- `/gear/[manufacturer]/[series]` (all series pages)
- `/stunts/schools/[slug]`
- `/import/letterboxd`

Without a canonical, Google must infer it — which creates risk of query-string variants being treated as alternate pages.

---

### P2-3: `tools/loadout` Has Two `<h1>` Elements in DOM

File: `apps/web/app/tools/loadout/page.tsx` lines 81 and 91.

An `<h1>Loadout calculator</h1>` at line 81 and a second `<h1>CineCanon — Loadout</h1>` at line 91 (hidden via `hidden print:block`) both appear in the DOM. Search crawlers render the full DOM and see both H1 elements. The print H1 should be scoped as `<p>` or `<h2>` with `print:text-2xl` styling.

---

### P2-4: "Upload Coming Soon" Placeholder Text Visible to Visitors

File: `apps/web/app/lookbook/page.tsx` line 39.

The Lookbook page's eyebrow reads `"Visual search · upload coming soon"`. If visual upload is not on the immediate roadmap, the text should be removed or softened to `"Visual search"` to avoid priming visitors with an undelivered promise.

---

### P2-5: `for-*` Pages and Several Entity Pages Lack JSON-LD Structured Data

All 12 `for-*` role landing pages have no JSON-LD. These pages surface curated crew, tools, and reference content targeted at specific working professionals. A `WebPage` or `FAQPage` schema block would allow AI engines to understand them as authoritative role-specific resources.

Additionally lacking JSON-LD:
- `/gear/[manufacturer]` — manufacturer profiles
- `/gear/[manufacturer]/[series]` — lens/camera series pages
- `/references` and `/references/[id]` — the citation graph
- `/societies` and `/societies/[slug]` — cinematography society pages

---

### P2-6: Recently-Shipped Sections Have Silent Empty-State Risk

The following 13 pages carry error-catch blocks with "table missing or query failed" messages and render silent empty-state UIs:

`/vfx/volumes`, `/vfx/title-houses`, `/partnerships`, `/gear/rentals`, `/music/orchestras`, `/music/scoring-stages`, `/music/supervision-agencies`, `/costume-hair-makeup/construction-houses`, `/costume-hair-makeup/effects-houses`, `/sound/effects/libraries`, `/sound/adr-studios`, `/editing/walkthroughs`, `/vfx/shot-breakdowns`.

Visitors arriving at these pages see an empty list with no indication whether data is missing or the page is incomplete. The empty-state copy should read "Catalogue coming soon" (or similar) so it reads as intentional rather than broken.

---

### P2-7: `ProductionDetail` Poster Thumbnails in "Similar" Rails Use `alt=""`

File: `apps/web/components/productions/ProductionDetail.tsx` lines 888, 931, 979.

Poster thumbnails in the "Collection members", "Similar productions", and "Thematically similar" rails use `alt=""`. The current markup does not associate images with the adjacent title text, so a screen reader announces an unlabelled link image. Minimal fix: `alt={m.title}` / `alt={s.title}`.

---

## Appendix: Route × Sitemap Coverage Table

| Route | Has metadata | In sitemap | Canonical set | JSON-LD | Notes |
|---|---|---|---|---|---|
| `/` | Yes | sitemap-core | Yes | WebSite | OK |
| `/films` | Yes | sitemap-core | Yes | ItemList | Description 163 chars |
| `/films/[slug]` | Yes (dynamic) | sitemap-films | Yes | Movie + ClaimReview | OK |
| `/films/[slug]/loadout` | Yes | — | — | None | Not in sitemap |
| `/crew` | Yes | — | Yes | ItemList | Missing from sitemap |
| `/crew/[slug]` | Yes (dynamic) | sitemap-crew (≥8 credits) | Yes | Person | OK |
| `/gear` | Yes | sitemap-core | No | ItemList | Short title, no canonical |
| `/gear/[manufacturer]` | Yes (dynamic) | sitemap-gear | No | None | No canonical, no JSON-LD |
| `/gear/[manufacturer]/[series]` | Yes (dynamic) | sitemap-gear | No | None | No canonical, no JSON-LD |
| `/gear/[manufacturer]/[series]/[item]` | Yes (dynamic) | sitemap-gear | Yes | — | OK |
| `/gear/compare` | Yes | — | — | None | — |
| `/gear/rentals` | Yes | — | — | — | Missing from sitemap |
| `/gear/rentals/[slug]` | Yes (dynamic) | — | — | — | Missing from sitemap |
| `/vfx` | Yes | — | Yes | ItemList | Missing from sitemap |
| `/vfx/[slug]` | Yes (dynamic) | sitemap-vfx | Yes | Organization | OK |
| `/vfx/shot-breakdowns` | Yes | — | — | — | Missing from sitemap |
| `/vfx/title-houses` | Yes | — | — | — | Missing from sitemap |
| `/vfx/title-houses/[slug]` | Yes (dynamic) | — | — | — | Missing from sitemap |
| `/vfx/volumes` | Yes | — | — | — | Missing from sitemap |
| `/vfx/volumes/[slug]` | Yes (dynamic) | — | — | — | Missing from sitemap |
| `/stunts` | Yes | sitemap-core | No | WebPage | Short title, no canonical |
| `/stunts/companies/[slug]` | Yes (dynamic) | — | Yes | — | Has generateStaticParams but no sitemap |
| `/stunts/sequences/[…]/[…]` | Yes (dynamic) | — | Yes | — | Has generateStaticParams but no sitemap |
| `/stunts/rigging/[slug]` | Yes (dynamic) | — | Yes | — | Has generateStaticParams but no sitemap |
| `/stunts/safety/[slug]` | Yes (dynamic) | — | Yes | — | Has generateStaticParams but no sitemap |
| `/stunts/schools/[slug]` | Yes (dynamic) | — | No | — | No canonical, not in sitemap |
| `/sound` | Yes | — | Yes | — | Entire section missing from sitemap |
| `/music` | Yes | — | Yes | — | Entire section missing from sitemap |
| `/editing` | Yes | — | Yes | — | Entire section missing from sitemap |
| `/production-design` | Yes | — | Yes | — | Entire section missing from sitemap |
| `/costume-hair-makeup` | Yes | — | — | — | Entire section missing from sitemap |
| `/awards` | Yes | — | Yes | — | Missing from sitemap, description +112 chars |
| `/awards/craft/[craft]` | Yes (dynamic) | — | Yes | — | 16 craft slugs, all missing from sitemap |
| `/dossiers` | Yes | — | Yes | ItemList | Missing from sitemap |
| `/dossiers/[slug]` | Yes (dynamic) | — | Yes | Article + ClaimReview | Missing from sitemap |
| `/walkthroughs` | Yes | — | Yes | ItemList | Missing from sitemap |
| `/walkthroughs/[slug]` | Yes (dynamic) | — | Yes | Article + ClaimReview | Missing from sitemap |
| `/decisions` | Yes | — | Yes | ItemList | Missing from sitemap, description +41 chars |
| `/decisions/[slug]` | Yes (dynamic) | — | Yes | TechArticle + ClaimReview | Missing from sitemap |
| `/partnerships` | Yes | — | — | — | Missing from sitemap |
| `/partnerships/[slug]` | Yes (dynamic) | — | Yes | — | Missing from sitemap |
| `/locations` | Yes | — | — | — | Missing from sitemap |
| `/locations/[id]` | Yes (dynamic) | — | — | — | Missing from sitemap |
| `/decades` | Yes | — | — | — | Missing from sitemap |
| `/decades/[decade]` | Yes (dynamic) | — | — | — | Missing from sitemap |
| `/format` | Yes | — | No | — | Missing from sitemap (format slugs ARE in sitemap-core) |
| `/format/[slug]` | Yes (dynamic) | sitemap-core | Yes | — | OK |
| `/societies` | Yes | — | — | None | Missing from sitemap, no JSON-LD |
| `/societies/[slug]` | Yes (dynamic) | — | Yes | None | Has generateStaticParams but no sitemap |
| `/queries` | Yes | — | Yes | — | Index missing from sitemap; 3 individual queries in sitemap-core |
| `/lookbook` | Yes | — | — | None | "Upload coming soon" visible text |
| `/shots` | Yes | — | — | — | Missing from sitemap |
| `/references` | Yes | — | — | None | Missing from sitemap, no JSON-LD |
| `/references/[id]` | Yes (dynamic) | — | — | None | Missing from sitemap, no JSON-LD |
| `/ask` | Yes | sitemap-core | — | None | Description 193 chars, no canonical |
| `/tools` | Yes | sitemap-core | No | — | Short title, no canonical |
| `/tools/scoring-session-cost` | Yes | — | Yes | — | Missing from sitemap (Phase 4) |
| `/tools/stunt-rig-picker` | Yes | — | Yes | — | Missing from sitemap (Phase 4) |
| `/tools/hdr-target-picker` | Yes | — | Yes | — | Missing from sitemap (Phase 4) |
| `/tools/anamorphic-vs-spherical` | Yes | — | Yes | — | Missing from sitemap (Phase 4) |
| `/for-dps` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-colorists` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-gaffers` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-coordinators` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-sound-mixers` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-sound-designers` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-composers` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-music-supervisors` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-editors` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-production-designers` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-costume-designers` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/for-makeup-artists` | Yes | — | Yes | None | Not in sitemap, no JSON-LD |
| `/methodology` | Yes | — | Yes | Article | Missing from sitemap |
| `/about` | Yes | — | Yes | — | Missing from sitemap |
| `/search` | Yes (noindex) | — | — | None | Correctly noindexed |
| `/signin` | Yes | — | — | None | OK |
| `/bookmarks` | Yes | — | — | None | User-specific, OK |
| `/robots.txt` | — | — | — | — | Correct, disallows /admin/ |
| `/sitemap.xml` | — | — | — | — | OK as index; covers only 5 of 15+ sections |
| `/llms.txt` | — | — | — | — | Exists and is dynamic/well-structured |
| `/digest.xml` | — | — | — | — | Atom feed exists and linked in layout |

---

## What to Fix First

The single highest-leverage fix is expanding the sitemap index to cover all live content sections. The current five-sitemap architecture covers films, crew, gear, VFX, and core pages, but omits every department section, all 12 role landing pages, awards by craft, all new Phase 4 tools, walkthroughs, decisions, dossiers, and partnerships — representing well over half the site's indexable surface area. Since CineCanon's competitive edge and AEO strategy depends on AI crawlers correctly attributing technical claims to CineCanon rather than to IMDb or Wikipedia, having those pages absent from the sitemap directly undermines citation precision.

Recommended approach: add a `sitemap-departments.xml` covering all section-index and detail pages not in the five existing sitemaps, and register it in `app/sitemap.xml/route.ts`. Alongside this, replacing the ~23 production `console.warn/error` calls with `Sentry.captureException` (as CLAUDE.md requires) would surface the "table missing" failures that are currently silent and may be causing hollow sections to appear live.
