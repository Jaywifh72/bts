# CineCanon QA Sweep — 2026-09-21

## Methodology note

**The live site https://cinecanon.com is inaccessible from this environment** — the organization egress proxy returns 403 for all connections to `cinecanon.com:443`. Every finding below is therefore derived from **static analysis of the repository at `/home/user/bts`** (branch `master`). Live HTTP status codes, asset CDN responses, actual rendered HTML, and performance measurements could not be obtained. All reported bugs are real code defects; severity is conservatively estimated based on impact if the code is deployed as-is. Items that require live verification are marked **[VERIFY LIVE]**.

Scope coverage achieved:
- Routes: 133 public page.tsx files catalogued; all route directories traversed.
- Sitemaps/robots/llms.txt: all 7 sitemap files + robots.ts + llms.txt/route.ts read in full.
- Metadata: all static `metadata` exports and `generateMetadata` functions in public routes audited.
- Assets/alt text: component and page JSX scanned for `alt=""` patterns.
- Console discipline: all `console.*` calls in non-admin app code scanned.
- Content: placeholder text, TODO/FIXME, and roadmap-forward strings grepped.
- JSON-LD: `lib/jsonLd.tsx` audited end-to-end.
- Navigation: `TopNav.tsx`, `Footer.tsx` checked against existing routes.

---

## Summary

| Severity | Count |
|----------|-------|
| P0 — Broken | 1 |
| P1 — Degraded | 7 |
| P2 — Polish | 9 |
| **Total** | **17** |

Pages audited: 133 public routes. Sitemaps: 5 segment sitemaps + 1 index. Significant structural gap: only ~30 of the 133 public-facing routes appear in any sitemap.

---

## P0 — Broken

### P0-1 · `/stunts/schools` index page missing (404)

**File:** No `page.tsx` exists at `/apps/web/app/stunts/schools/`. The directory contains only `[slug]/page.tsx` (individual school detail pages).

**Impact:** The main `/stunts/page.tsx` renders a stunt-school roster and links each entry to `/stunts/schools/{slug}`. Any user or crawler who navigates to `/stunts/schools` directly gets a hard 404. The route segment is also not in any sitemap, so the sub-pages at `/stunts/schools/{slug}` are only discoverable via the parent `/stunts` page — a crawl dead-end if the index 404s first.

**Evidence:** `grep -rn "stunts/schools"` in `apps/web/app/stunts/page.tsx` → line 273: `href={/stunts/schools/${s.slug}}`. No `apps/web/app/stunts/schools/page.tsx` found.

---

## P1 — Degraded

### P1-1 · Phase 4 tools missing from all sitemaps

**Files:** `app/tools/scoring-session-cost/page.tsx`, `app/tools/stunt-rig-picker/page.tsx`, `app/tools/hdr-target-picker/page.tsx`, `app/tools/anamorphic-vs-spherical/page.tsx`

All four Phase 4 tool pages are live in the repo, each with properly structured `export const metadata` blocks and canonical URLs. None appear in `sitemap-core.xml/route.ts` or any other sitemap segment. The existing `sitemap-core.xml` lists only five tools sub-pages: frame-lines, loadout, coverage, aces, cdl — the Phase 4 additions were never added.

Search crawlers will only discover these pages via internal links (footer's "Tools" section), never via sitemap — degrading indexing priority and speed for the most recent feature work.

### P1-2 · ~60 major section index pages absent from all sitemaps

**File:** `app/sitemap-core.xml/route.ts`

The five-segment sitemap covers film detail pages, crew detail pages (≥8 credits), gear detail pages, VFX house pages, and a limited core set. The following indexable public routes are in none of the five sitemaps:

`/sound`, `/sound/mixers`, `/sound/designers`, `/sound/foley`, `/sound/post`, `/sound/effects`, `/sound/effects/libraries`, `/sound/adr-studios`, `/sound/houses`, `/music`, `/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`, `/music/cue-guides`, `/editing`, `/editing/editors`, `/editing/walkthroughs`, `/production-design`, `/production-design/designers`, `/production-design/works`, `/costume-hair-makeup`, `/costume-hair-makeup/designers`, `/costume-hair-makeup/costume-works`, `/costume-hair-makeup/makeup-works`, `/costume-hair-makeup/effects-houses`, `/costume-hair-makeup/construction-houses`, `/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`, `/awards`, `/about`, `/methodology`, `/lookbook`, `/shots`, `/decades`, `/societies`, `/references`, `/gear/rentals`, `/gear/compare`, `/films/compare`, `/crew/compare`, `/locations`, `/equipment/specs`, and all twelve `/for-*` role landing pages.

Approximately 60+ indexable URLs receiving zero sitemap coverage. AI crawlers and Googlebot that respect sitemaps will deprioritize or miss these entirely.

### P1-3 · 36 `console.warn`/`console.error` calls in production code paths

**CLAUDE.md rule violated:** "Don't add console.log or console.error in production code paths — use Sentry."

Confirmed violations across 25+ route files. Representative samples:

```
app/page.tsx:79          console.error('[homepage] listRecentlyResolvedCorrections failed', e)
app/page.tsx:80          console.error('[homepage] listRecentCitations failed', e)
app/dossiers/[slug]/page.tsx:43       console.warn(e)
app/walkthroughs/[slug]/page.tsx:50   console.warn(e)
app/editing/walkthroughs/page.tsx:19  console.warn('[edit-walkthroughs]', e)
app/vfx/volumes/page.tsx:28           console.warn('[vp_volumes] table missing or query failed; ...')
app/partnerships/page.tsx:24          console.warn('[partnerships] table missing or query failed')
app/gear/rentals/page.tsx:24          console.warn('[rental_houses] table missing or query failed')
app/music/orchestras/page.tsx:24      console.warn('[recording_orchestras] table missing...')
app/decisions/page.tsx:36             console.warn('[decisions] table missing')
```

These errors are silent in Sentry and invisible to on-call. Any table-missing or query-failed condition on these routes is swallowed with no alert fired.

### P1-4 · Content images with `alt=""` in MediaGallery and EvidenceGallery

**Files:**
- `components/productions/MediaGallery.tsx` line 34: shot thumbnails shown in film detail media gallery
- `components/ui/EvidenceGallery.tsx` line 29: BTS evidence photos with citation attribution

Both render user-facing content images — frame grabs and cited BTS evidence — with `alt=""`. A screen-reader user receives no description of what the media shows. For `EvidenceGallery` this is worse: the images are the primary evidence for a claim, so the citation is incomplete for non-sighted users.

Three additional instances in `ProductionDetail.tsx` (lines 888, 931, 979) render production keyframes with empty alt. **[VERIFY LIVE]** whether context labels immediately adjacent to these images partially mitigate the screen-reader impact.

### P1-5 · User-visible roadmap placeholder text on stunt school detail pages

**File:** `app/stunts/schools/[slug]/page.tsx` lines 149–160

The "Notable alumni" section renders on every stunt school detail page with this visible text:

> "Performer-and-coordinator alumni are wired in once phase 2 of the stunt-section roadmap lands — same person × school mapping pattern CineCanon already uses for film-school alumni on the crew pages."

And a dashed box: "Alumni mapping coming with phase 2."

This internal roadmap language is live to users and AI crawlers. It undermines the professional tone of the page and may cause AI engines to flag the section as unfinished content.

### P1-6 · Lookbook page advertises unbuilt upload feature as live surface

**File:** `app/lookbook/page.tsx` line 39

```tsx
eyebrow="Visual search · upload coming soon"
```

The `PageHero` eyebrow field renders directly in the page `<h2>`/eyebrow area. "Upload coming soon" is user-facing text on a production URL (`/lookbook`). The feature is clearly documented in code comments as not built (no SigLIP encoder, no backfill), but the route is reachable and linked from the footer. **[VERIFY LIVE]** to confirm this renders in the visible hero area at the correct prominence.

### P1-7 · Crew detail page metadata description: untruncated biography

**File:** `app/crew/[slug]/page.tsx` line 80

```tsx
description: person.biography ?? undefined,
```

TMDb biographies routinely run 300–600 characters. Indexed crew pages (those with `isIndexable = true`) will ship untruncated biographies as meta descriptions. Google truncates at ~160 chars in SERPs, AI summarizers ingest the full string. This contrasts with `films/[slug]/page.tsx` which correctly calls `truncateForMeta(production.synopsis, 155)`.

---

## P2 — Polish

### P2-1 · 30+ pages with meta descriptions over 160 chars

| Route | Chars |
|-------|-------|
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
| `/vfx/title-houses` | 215 |
| `/vfx/volumes` | 207 |
| `/music/orchestras` | 205 |
| `/decisions` | 201 |
| `/for-music-supervisors` | 196 |
| `/for-sound-designers` | 194 |
| `/ask` | 193 |
| `/societies` | 192 |
| `/for-dps` | 188 |
| `/sound/houses` | 187 |
| `/for-colorists` | 184 |
| `/music/scoring-stages` | 183 |
| `/music/composers` | 181 |
| `/sound/post` | 180 |
| `/for-gaffers` | 180 |
| `/for-makeup-artists` | 177 |
| `/gear/rentals` | 176 |
| `/for-sound-mixers` | 174 |
| `/sound` | 170 |
| `/sound/effects` | 164 |
| `/sound/foley` | 163 |
| `/sound/effects/libraries` | 163 |
| `/films` | 163 |
| `/stunts` | 162 |

### P2-2 · Three pages have no meta description

**Files:** `app/search/page.tsx`, `app/account/page.tsx`, `app/bookmarks/page.tsx`

All three have `export const metadata` blocks with a `title` but no `description`. `/search` is a primary user-facing surface and should carry a targeted description.

### P2-3 · 15+ pages have rendered titles under 30 chars

With the layout's `template: '%s | CineCanon'` applied, these titles are very short:

| Base title | Full rendered title | Chars |
|------------|---------------------|-------|
| Cue | Cue \| CineCanon | 15 |
| Gear | Gear \| CineCanon | 16 |
| Foley | Foley \| CineCanon | 17 |
| Music | Music \| CineCanon | 17 |
| Score | Score \| CineCanon | 17 |
| Sound | Sound \| CineCanon | 17 |
| Tools | Tools \| CineCanon | 17 |
| Awards | Awards \| CineCanon | 18 |
| Search | Search \| CineCanon | 18 |
| Stunts | Stunts \| CineCanon | 18 |
| Account | Account \| CineCanon | 19 |
| Editing | Editing \| CineCanon | 19 |
| Editors | Editors \| CineCanon | 19 |
| Sign in | Sign in \| CineCanon | 19 |
| Decision | Decision \| CineCanon | 20 |

### P2-4 · Three titles over 60 chars; two with "CineCanon" appearing twice

The layout template `'%s | CineCanon'` doubles the brand name when the page title already contains "CineCanon":

| Route | Final title | Chars |
|-------|-------------|-------|
| `/` | `CineCanon — Cinematic Technical Reference \| CineCanon` | 53 (double-branded) |
| `/about` | `About CineCanon — Sources, Curation & Citation Tiers \| CineCanon` | 64 (over 60 + double) |
| `/vfx` | `VFX Houses — Studios, Boutique & In-House Facilities \| CineCanon` | 66 (over 60) |
| `/queries/alexa65-sphero` | `Films shot on ARRI ALEXA 65 + Panavision Sphero lenses \| CineCanon` | 66 (over 60) |
| `/methodology` | `Methodology — Citation Tiers & Editorial Review \| CineCanon` | 61 (marginally over) |

The `/about` page should use `title: { absolute: '...' }` to bypass the template.

### P2-5 · Dossier and walkthrough metadata use raw `.slice(0, 160)` instead of `truncateForMeta()`

**Files:** `app/dossiers/[slug]/page.tsx` ~line 35, `app/walkthroughs/[slug]/page.tsx` ~line 42

Both use:
```ts
description: d.summary?.split('\n\n')[0]?.slice(0, 160)
```

This can cut the description mid-word or mid-emoji. `films/[slug]/page.tsx` correctly calls `truncateForMeta(production.synopsis, 155)`. Apply the same utility.

### P2-6 · Canonical URL format inconsistency across pages

Some pages emit relative canonicals, others emit absolute:
- Relative: `alternates: { canonical: '/films' }` (films, vfx, crew, about, queries, homepage)
- Absolute: `alternates: { canonical: \`${siteUrl()}/music\`` }` (music, sound, editing, tools, dossiers, walkthroughs, etc.)

Both resolve correctly with `metadataBase` set, but the inconsistency complicates auditing and could cause mismatches if `NEXT_PUBLIC_SITE_URL` is misconfigured.

### P2-7 · Several key index pages have descriptions under 120 chars

| Route | Description length |
|-------|--------------------|
| `/queries` | 41 chars |
| `/vfx` | 58 chars |
| `/signin` | 60 chars |
| `/crew/compare` | 61 chars |
| `/decades` | 61 chars |
| `/gear/compare` | 70 chars |
| `/crew` | 80 chars |
| `/music` | 82 chars |

### P2-8 · OG images only exist for homepage and film/crew detail pages

Only three `opengraph-image.tsx` files exist: `app/opengraph-image.tsx` (site default), `app/films/[slug]/opengraph-image.tsx`, `app/crew/[slug]/opengraph-image.tsx`.

All other pages — gear items, VFX houses, format pages, awards, tools, dossiers, walkthroughs — share the site-level generic OG card, losing context when shared on social or cited by AI engines.

### P2-9 · `/queries` description extremely short at 41 chars

`app/queries/page.tsx` description: `'Hand-picked cross-cutting cinema queries.'` — 41 chars, below any reasonable minimum. Will appear truncated/unhelpful in SERPs and AI citation contexts.

---

## Appendix — Full URL × Status Table

> HTTP status codes not verified (live site inaccessible from sweep environment). Status is inferred from code.

| URL | Inferred Status | Sitemap | Notes |
|-----|-----------------|---------|-------|
| `/` | 200 | sitemap-core | Homepage |
| `/films` | 200 | sitemap-core | |
| `/films/[slug]` | 200/404 | sitemap-films | ISR |
| `/films/[slug]/loadout` | 200/404 | — | Not in sitemap |
| `/films/[slug]/scenes/[sceneSlug]` | 200/404 | — | Not in sitemap |
| `/films/compare` | 200 | — | |
| `/crew` | 200 | sitemap-core | |
| `/crew/[slug]` | 200/404/noindex | sitemap-crew | Filtered to ≥8 credits |
| `/crew/compare` | 200 | — | |
| `/gear` | 200 | sitemap-core | |
| `/gear/[manufacturer]` | 200/404 | sitemap-gear | |
| `/gear/[manufacturer]/[series]` | 200/404 | sitemap-gear | |
| `/gear/[manufacturer]/[series]/[item]` | 200/404 | sitemap-gear | |
| `/gear/compare` | 200 | — | |
| `/gear/rentals` | 200 | — | Description 176 chars |
| `/gear/rentals/[slug]` | 200/404 | — | |
| `/vfx` | 200 | sitemap-core | Title 66 chars |
| `/vfx/[slug]` | 200/404 | sitemap-vfx | |
| `/vfx/volumes` | 200 | — | Description 207 chars |
| `/vfx/volumes/[slug]` | 200/404 | — | |
| `/vfx/title-houses` | 200 | — | Description 215 chars |
| `/vfx/title-houses/[slug]` | 200/404 | — | |
| `/vfx/shot-breakdowns` | 200 | — | |
| `/stunts` | 200 | sitemap-core | Description 162 chars |
| `/stunts/people` | 200 | sitemap-core | |
| `/stunts/coordinators` | 307 → `/stunts/people` | — | Redirect |
| `/stunts/sequences` | 200 | sitemap-core | |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | 200/404 | — | |
| `/stunts/lineage` | 200 | sitemap-core | Description 262 chars |
| `/stunts/rigging` | 200 | sitemap-core | Description 235 chars |
| `/stunts/rigging/[slug]` | 200/404 | — | |
| `/stunts/safety` | 200 | sitemap-core | Description 252 chars |
| `/stunts/safety/[slug]` | 200/404 | — | |
| `/stunts/companies` | 200 | — | |
| `/stunts/companies/[slug]` | 200/404 | — | |
| `/stunts/schools` | **404** | — | **P0: index page missing** |
| `/stunts/schools/[slug]` | 200/404 | — | Has placeholder alumni text |
| `/sound` | 200 | — | Description 170 chars |
| `/sound/mixers` | 200 | — | |
| `/sound/designers` | 200 | — | |
| `/sound/foley` | 200 | — | Description 163 chars |
| `/sound/post` | 200 | — | Description 180 chars |
| `/sound/effects` | 200 | — | Description 164 chars |
| `/sound/effects/libraries` | 200 | — | Description 163 chars |
| `/sound/effects/libraries/[slug]` | 200/404 | — | |
| `/sound/adr-studios` | 200 | — | |
| `/sound/adr-studios/[slug]` | 200/404 | — | |
| `/sound/houses` | 200 | — | Description 187 chars |
| `/sound/houses/[slug]` | 200/404 | — | |
| `/music` | 200 | — | Description 82 chars |
| `/music/composers` | 200 | — | Description 181 chars |
| `/music/scoring-stages` | 200 | — | Description 183 chars |
| `/music/orchestras` | 200 | — | Description 205 chars |
| `/music/orchestras/[slug]` | 200/404 | — | |
| `/music/supervisors` | 200 | — | |
| `/music/supervision-agencies` | 200 | — | |
| `/music/supervision-agencies/[slug]` | 200/404 | — | |
| `/music/cue-guides` | 200 | — | |
| `/music/cues/[productionSlug]/[cueSlug]` | 200/404 | — | |
| `/music/scores/[productionSlug]` | 200/404 | — | |
| `/editing` | 200 | — | |
| `/editing/editors` | 200 | — | |
| `/editing/walkthroughs` | 200 | — | |
| `/production-design` | 200 | — | |
| `/production-design/designers` | 200 | — | |
| `/production-design/works` | 200 | — | |
| `/costume-hair-makeup` | 200 | — | |
| `/costume-hair-makeup/designers` | 200 | — | |
| `/costume-hair-makeup/costume-works` | 200 | — | |
| `/costume-hair-makeup/makeup-works` | 200 | — | |
| `/costume-hair-makeup/effects-houses` | 200 | — | Description 260 chars |
| `/costume-hair-makeup/effects-houses/[slug]` | 200/404 | — | |
| `/costume-hair-makeup/construction-houses` | 200 | — | |
| `/costume-hair-makeup/construction-houses/[slug]` | 200/404 | — | |
| `/walkthroughs` | 200 | — | |
| `/walkthroughs/[slug]` | 200/404 | — | |
| `/dossiers` | 200 | — | |
| `/dossiers/[slug]` | 200/404 | — | |
| `/decisions` | 200 | — | Description 201 chars |
| `/decisions/[slug]` | 200/404 | — | |
| `/partnerships` | 200 | — | Description 242 chars |
| `/partnerships/[slug]` | 200/404 | — | |
| `/awards` | 200 | — | Description 272 chars |
| `/awards/cinematography` | 307 → `/awards/craft/cinematography` | — | Redirect |
| `/awards/craft/[craft]` | 200 | — | |
| `/about` | 200 | — | Title 64 chars, double-branded |
| `/methodology` | 200 | — | Title 61 chars |
| `/format` | 200 | sitemap-core | |
| `/format/[slug]` | 200/404 | sitemap-core | |
| `/lookbook` | 200 | — | "Coming soon" feature text visible |
| `/shots` | 200 | — | |
| `/decades` | 200 | — | Description 61 chars |
| `/decades/[decade]` | 200/404 | — | |
| `/societies` | 200 | — | Description 192 chars |
| `/societies/[slug]` | 200/404 | — | |
| `/references` | 200 | — | Description 221 chars |
| `/references/[id]` | 200/404 | — | |
| `/locations` | 200 | — | |
| `/locations/[id]` | 200/404 | — | |
| `/equipment/specs` | 200 | — | Description 231 chars |
| `/for-dps` | 200 | — | Description 188 chars |
| `/for-colorists` | 200 | — | Description 184 chars |
| `/for-gaffers` | 200 | — | Description 180 chars |
| `/for-coordinators` | 200 | — | Description 216 chars |
| `/for-sound-mixers` | 200 | — | Description 174 chars |
| `/for-sound-designers` | 200 | — | Description 194 chars |
| `/for-composers` | 200 | — | Description 225 chars |
| `/for-music-supervisors` | 200 | — | Description 196 chars |
| `/for-editors` | 200 | — | |
| `/for-production-designers` | 200 | — | |
| `/for-costume-designers` | 200 | — | |
| `/for-makeup-artists` | 200 | — | Description 177 chars |
| `/tools` | 200 | sitemap-core | |
| `/tools/frame-lines` | 200 | sitemap-core | |
| `/tools/loadout` | 200 | sitemap-core | |
| `/tools/coverage` | 200 | sitemap-core | |
| `/tools/aces` | 200 | sitemap-core | |
| `/tools/cdl` | 200 | sitemap-core | |
| `/tools/scoring-session-cost` | 200 | — | **P1: missing from sitemap** |
| `/tools/stunt-rig-picker` | 200 | — | **P1: missing from sitemap** |
| `/tools/hdr-target-picker` | 200 | — | **P1: missing from sitemap** |
| `/tools/anamorphic-vs-spherical` | 200 | — | **P1: missing from sitemap** |
| `/ask` | 200 | sitemap-core | Description 193 chars |
| `/search` | 200 | — | No meta description |
| `/queries` | 200 | — | Description 41 chars |
| `/queries/alexa65-sphero` | 200 | sitemap-core | Title 66 chars |
| `/queries/dune-part-two-lenses` | 200 | sitemap-core | |
| `/queries/magic-hour-2023` | 200 | sitemap-core | |
| `/import/letterboxd` | 200 | — | Auth-gated |
| `/bookmarks` | 200 | — | Auth-gated; no meta description |
| `/account` | 200/307 | — | Auth-gated; no meta description |
| `/signin` | 200 | — | Description 60 chars |
| `/corrections` | 200 | — | |
| `/robots.txt` | 200 | — | Correct; disallows /admin/ |
| `/sitemap.xml` | 200 | — | Index pointing to 5 segments |
| `/sitemap-core.xml` | 200 | — | Missing ~60 routes |
| `/sitemap-films.xml` | 200 | — | OK |
| `/sitemap-crew.xml` | 200 | — | Filtered to ≥8 credits; OK |
| `/sitemap-gear.xml` | 200 | — | OK |
| `/sitemap-vfx.xml` | 200 | — | OK |
| `/llms.txt` | 200 | — | Dynamic; content looks correct |
| `/api/v1` | 200 | — | Discovery doc |
| `/api/v1/productions/[slug]` | 200/404 | — | |
| `/api/v1/crew/[slug]` | 200/404 | — | |
| `/api/health` | 200 | — | |

---

## What I'd fix first

The single highest-leverage fix is **P1-2: rebuilding `sitemap-core.xml/route.ts` to cover the full public route surface**. Right now roughly 60 indexable URLs — including entire department sections (sound, music, editing, production design, costume/hair/makeup), the Phase 4 tools, all twelve role-landing pages, dossiers, walkthroughs, decisions, partnerships, the about page, and the methodology page — receive zero sitemap coverage. CineCanon's competitive edge is AI citation precision, and AI crawlers (ChatGPT, Perplexity, Gemini) rely heavily on sitemaps and `llms.txt` to prioritize what to index. Expanding the sitemap is zero-risk, takes about 30 lines of code in `sitemap-core.xml/route.ts`, and immediately improves discoverability for every page that has already been written. Close behind it: fix P0-1 (add `app/stunts/schools/page.tsx` to prevent the 404 on a directly-linked route), then sweep the 30+ over-length meta descriptions in bulk — most just need trimming of one clause — to unblock the AI-summarizer and SERP click-through improvements that the sitemap expansion will start driving.
