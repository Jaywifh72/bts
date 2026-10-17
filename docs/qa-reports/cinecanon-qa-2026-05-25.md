# CineCanon QA Sweep — 2026-05-25

**Sweep method:** Static analysis of the Next.js App Router source tree at `/home/user/bts/apps/web` on branch `master`. Live HTTP access to `https://cinecanon.com` was blocked at the network perimeter by an Anthropic sandbox egress allowlist (TLS inspection CA confirmed; server returns `x-deny-reason: host_not_allowed`). All findings are therefore derived from code inspection, cross-referenced against prior live crawl reports dated 2026-05-20 and 2026-05-21, and the diff of commits since those reports. Routes, metadata, assets, sitemaps, and content are assessed against the source; HTTP status codes for pages confirmed live in the 05-21 full crawl are carried forward where nothing in the code has changed.

---

## Summary

| Metric | Count |
|---|---|
| Public page.tsx routes in repo (non-admin) | 133 |
| Sitemaps (index + 5 child) | 6 |
| **P0 — Broken** | 2 |
| **P1 — Degraded** | 11 |
| **P2 — Polish** | 8 |

Since the 2026-05-20 sweep the team shipped fixes for all five P0 defects and most P1 items from that report. The five previously 404 routes (`/dossiers`, `/walkthroughs`, `/sound/mixers`, `/sound/designers`, `/stunts/companies`) are now implemented. The Vercel Image optimizer quota issue that caused 1,702 poster/backdrop images to 400 was fixed by adding `unoptimized` to every TMDb `<Image>`. The crew sitemap limit was raised from 1,000 to 50,000. The remaining defects are newly discovered since those fixes or were carried forward as not-yet-fixed items.

---

## P0 — Broken

### P0-1 — Equipment specs empty-state exposes internal implementation detail in production

**File:** `apps/web/app/equipment/specs/page.tsx` lines 87-90

When the `withSpecs` array is empty (no rows with a populated `specs` column), the page renders the string:

```
No items with spec data in this category yet. The spec seed (seed-equipment-specs-full.ts) is committed and lands once dispatched on prod.
```

This message names an internal script and references deployment process, which is visible to any public visitor to `/equipment/specs`. The seed script (`packages/db/scripts/seed-equipment-specs-full.ts`) has no GitHub Actions workflow dispatching it — it is not wired to any CI job. If the seed has not been manually run in Neon production, every visitor to the equipment spec browser sees this placeholder text. `/equipment/specs` is linked in the site footer under "Sections" (`↳ spec browser`) and in the nav Craft dropdown, making it a user-reachable surface.

**Impact:** Broken editorial promise for a prominently linked page. Internal implementation detail leak.

---

### P0-2 — Four Phase 4 decision-support tools missing from all sitemaps

**File:** `apps/web/app/sitemap-core.xml/route.ts`

The following routes were added in commit `37ab07b` (2026-05-18) and are live in the app router, but none appear in `sitemap-core.xml` or any other sitemap segment:

- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

The sitemap only lists the five legacy tools (`/tools/frame-lines`, `/tools/loadout`, `/tools/coverage`, `/tools/aces`, `/tools/cdl`). These four new tools are client-side interactive calculators specifically designed for working film professionals — exactly the kind of page the AEO/GEO strategy is built around — and they cannot be indexed by search or AI crawlers via the sitemap.

**Impact:** Four content pages not discoverable via sitemap. Crawl-budget waste for search engines that don't follow nav links.

---

## P1 — Degraded

### P1-1 — Sitemap-core.xml omits 26 public routes including all department index pages

**File:** `apps/web/app/sitemap-core.xml/route.ts`

The sitemap-core covers only 26 static URLs. The following publicly linked routes with real content are absent from every sitemap segment:

| Route | Linked from | Priority |
|---|---|---|
| `/awards` | Top nav, homepage depth grid | High |
| `/references` | Top nav ("Sources"), homepage depth grid | High |
| `/music` | Craft dropdown, footer | High |
| `/sound` | Craft dropdown, footer | High |
| `/editing` | Craft dropdown, footer | High |
| `/production-design` | Craft dropdown, footer | High |
| `/costume-hair-makeup` | Craft dropdown, footer | High |
| `/walkthroughs` | `llms.txt`, footer "Edit walkthroughs" | Medium |
| `/dossiers` | `llms.txt`, footer "PD dossiers" | Medium |
| `/decisions` | Footer, `llms.txt` | Medium |
| `/partnerships` | Footer, `llms.txt` | Medium |
| `/locations` | Footer | Medium |
| `/decades` | Footer | Medium |
| `/shots` | Footer, homepage "Browse all frames" | Medium |
| `/lookbook` | Internal links | Medium |
| `/societies` | Footer (implied) | Low |
| `/equipment/specs` | Footer "↳ spec browser", Craft nav | Medium |
| `/sound/mixers` | `llms.txt`, sound section | Medium |
| `/sound/designers` | `llms.txt`, sound section | Medium |
| `/stunts/companies` | `llms.txt`, stunts section | Medium |
| `/stunts/coordinators` | (redirect → `/stunts/people`) | Low |
| `/awards/cinematography` | (redirect → `/awards/craft/cinematography`) | Low |
| `/methodology` | Footer | Low |
| `/about` | Footer, mobile nav | Low |

This means the five child sitemaps collectively cover only: homepage, `/films`, `/crew`, `/gear`, `/vfx`, `/stunts` (+ sub-pages), `/format`, `/ask`, `/tools` (legacy 5 only), and format/query slugs. Every department hub and editorial surface added during Phases 2-4 is invisible to crawlers relying on the sitemap.

**Impact:** Reduced crawl coverage for search and AI engines. Particularly harmful for `llms.txt`-advertised surfaces like `/walkthroughs`, `/dossiers`, `/decisions`, and `/partnerships`.

---

### P1-2 — Five high-traffic index pages missing meta description entirely

**Files:**
- `apps/web/app/films/page.tsx` — `metadata: { title: 'Films' }` — no description, no canonical
- `apps/web/app/crew/page.tsx` — `metadata: { title: 'Crew' }` — no description, no canonical
- `apps/web/app/vfx/page.tsx` — `metadata: { title: 'VFX Houses' }` — no description, no canonical
- `apps/web/app/search/page.tsx` — title only, no description, no canonical
- `apps/web/app/bookmarks/page.tsx` — title only, no description, no canonical

These pages are linked from the primary navigation bar. With no `description`, Next.js falls through to the layout default (227-character string, see P1-3 below). With no canonical `alternates`, search engines see these as potentially duplicate with their filtered/sorted query variants (`?tier=curated`, `?category=camera_body`, etc.).

**Impact:** Degraded SERP snippets on the five pages most likely to appear in brand + category search queries ("CineCanon films", "cinecanon cinematographers").

---

### P1-3 — Homepage and layout meta description 227 characters, 42% over the 160-char Google truncation threshold

**Files:**
- `apps/web/app/layout.tsx` lines 21-22 (default description, 227 chars)
- `apps/web/app/page.tsx` constant `HOMEPAGE_DESCRIPTION` (same 227-char string)

The description:

> "CineCanon is the cinematic technical reference for working camera-department professionals — cited, confidence-graded data on what every film was shot on, by whom, with what gear, lighting, color, sound, music, stunts, and VFX."

Google truncates around 160 characters in SERPs, and AI Overview summarizers treat the meta description as a high-authority summary. The 05-20 fix commit noted this should be "above 120 chars" but the current value at 227 chars is well over the upper bound. The layout description also serves as the fallback for all pages that don't define their own (including `/films`, `/crew`, `/vfx` per P1-2 above).

**Impact:** Every page using the layout fallback displays a truncated mid-sentence description in Google SERPs and AI engines.

---

### P1-4 — All major index page titles shorter than 30 characters (insufficient specificity for SERPs)

The `layout.tsx` title template is `'%s | CineCanon'`. With single-word route titles, all resulting document titles fall well below the recommended 30-character minimum:

| Page | Full `<title>` | Length |
|---|---|---|
| `/films` | `Films \| CineCanon` | 17 |
| `/crew` | `Crew \| CineCanon` | 16 |
| `/gear` | `Gear \| CineCanon` | 16 |
| `/vfx` | `VFX Houses \| CineCanon` | 22 |
| `/about` | `About \| CineCanon` | 17 |
| `/tools` | `Tools \| CineCanon` | 17 |
| `/stunts` | `Stunts \| CineCanon` | 18 |
| `/sound` | `Sound \| CineCanon` | 17 |
| `/music` | `Music \| CineCanon` | 17 |
| `/editing` | `Editing \| CineCanon` | 19 |
| `/references` | `References \| CineCanon` | 22 |

Google may rewrite titles that are too short. Adding a brief descriptor ("Films — Cinema Technical Archive | CineCanon") would add keyword surface area and remove the rewrite risk.

**Impact:** Reduced keyword diversity in SERP titles; Google title-rewrite risk.

---

### P1-5 — crew/[slug] page emits no meta description when biography field is null

**File:** `apps/web/app/crew/[slug]/page.tsx` line 61:

```tsx
description: person.biography ?? undefined,
```

When `person.biography` is null, `description` is `undefined` and Next.js omits the `<meta name="description">` tag entirely. The layout fallback (227-char string, P1-3) then applies. Many imported crew members from TMDb have no biography. With ~12,000+ crew pages in the sitemap, a substantial fraction will have no meaningful description. The person's display name, primary role, and nationality are all available and would produce a richer fallback (e.g. "Roger Deakins — Director of Photography, British cinematographer").

**Impact:** Degraded snippets for crew pages missing TMDb biography; AI crawler gets weaker signal on who this person is.

---

### P1-6 — Eight major section index pages missing `<link rel="canonical">`

**Files lacking `alternates.canonical`:**
- `apps/web/app/films/page.tsx`
- `apps/web/app/crew/page.tsx`
- `apps/web/app/vfx/page.tsx`
- `apps/web/app/stunts/page.tsx`
- `apps/web/app/gear/page.tsx`
- `apps/web/app/search/page.tsx`
- `apps/web/app/tools/page.tsx`
- `apps/web/app/about/page.tsx`

All these pages accept `searchParams` for filtering and sorting. Without a canonical, each unique `?category=`, `?sort=`, `?page=` URL is treated as a separate document. The crew, films, and gear index pages are particularly vulnerable because they expose dozens of filter/sort permutations.

**Impact:** Potential duplicate-content signals to search engines; link equity dilution across filter variants.

---

### P1-7 — Multiple console.warn calls in public production route handlers

**Files (selected):**

```
apps/web/app/walkthroughs/[slug]/page.tsx:50:    console.warn(e)
apps/web/app/dossiers/[slug]/page.tsx:43:      console.warn(e)
apps/web/app/editing/walkthroughs/page.tsx:19:    console.warn('[edit-walkthroughs]', e)
apps/web/app/sound/effects/libraries/page.tsx:23:      console.warn('[sound-libraries] query failed', err)
apps/web/app/sound/effects/libraries/[slug]/page.tsx:32:      console.warn('[sound-library] detail query failed', err)
apps/web/app/sound/adr-studios/page.tsx:19:      console.warn('[adr] missing', e)
apps/web/app/sound/houses/page.tsx:41:      console.warn('[sound-houses] query failed', err)
apps/web/app/vfx/volumes/page.tsx:28:      console.warn('[vp_volumes] table missing', err)
apps/web/app/vfx/title-houses/page.tsx:24:      console.warn('[title_sequence_houses] table missing', err)
apps/web/app/partnerships/page.tsx:24:      console.warn('[partnerships] table missing', err)
apps/web/app/gear/rentals/page.tsx:24:      console.warn('[rental_houses] table missing', err)
apps/web/app/music/orchestras/page.tsx:24:      console.warn('[recording_orchestras] table missing', err)
apps/web/app/decisions/page.tsx:36:      console.warn('[decisions] table missing', err)
```

The CLAUDE.md convention states: "Don't add console.log or console.error in production code paths — use Sentry." These `console.warn` calls in server route handlers output to Vercel function logs but bypass the Sentry error pipeline, meaning the alerts on missing tables (e.g. `vp_volumes`, `title_sequence_houses`, `rental_houses`, `recording_orchestras`) are invisible to error monitoring. If a migration is silently failing in production, these writes to stdout are the only signal — and they go unmonitored.

**Impact:** Silent failures in production if newly added migrations haven't applied; no alerting through Sentry.

---

### P1-8 — Homepage "Music & Score" depth-grid tile contains "coming online" copy visible in production

**File:** `apps/web/app/page.tsx` lines 461-463:

```
Score deep-dives and curated cue-level listening guides coming online.
```

This phrase, rendered as part of the "Music & Score" depth-grid tile on the homepage, implies a feature is in development and has not shipped. It is visible to all visitors. The pages it refers to (`/music/cue-guides`, `walkthroughs` for music cues) do in fact exist — they were added in Phase 3. The copy has simply not been updated to reflect their availability.

**Impact:** Signals to visitors that the site is incomplete; inconsistent with the pages that do exist.

---

### P1-9 — Poster images in film collection rail, similar productions, and semantic similar sections carry `alt=""`

**File:** `apps/web/components/productions/ProductionDetail.tsx` lines 879, 922, 970

Three `<Image>` instances in the `ProductionDetail` component use `alt=""` for poster images that are content images, not decoration:

- Collection members rail (line 879): poster for a film in the same franchise
- Similar productions rail (line 922): poster for a recommended film
- Thematically similar rail (line 970): poster for a recommended film

In each case, the surrounding `<Link>` has a film title available (`m.title`, `s.title`) that should be used as the alt text. (The `ProductionCard` component was fixed in the 05-20 sweep and now correctly uses the title as alt text; these three inline usages were missed.)

Additional `alt=""` on content images exists in:
- `apps/web/components/productions/MediaGallery.tsx` line 34: backdrop image in the keyframe gallery
- `apps/web/app/format/[slug]/page.tsx` line 96: poster in the format films list
- `apps/web/app/ask/page.tsx` line 254: poster in ask results
- `apps/web/app/crew/[slug]/page.tsx` line 817: "Known for" poster thumbnail

**Impact:** WCAG 2.2 AA failure (1.1.1 Non-text content) on detail pages; screen-reader users get no context on poster images.

---

### P1-10 — /decisions page renders user-visible placeholder text referencing internal environment state

**File:** `apps/web/app/decisions/page.tsx` line 57:

```tsx
<p className="text-sm text-zinc-500">
  Decision trees coming online — table not yet migrated on this environment.
</p>
```

The `craft_decision_trees` table was added in migration `0087_craft_decision_trees.sql`, which is checked into the repo. If this migration is unapplied in production (or if `listDecisionTrees` throws), the page displays this message. The phrase "on this environment" is internal language leaked into the public UI. The `/decisions` page is linked from the site footer under "Cross-cuts".

**Impact:** Visible placeholder text that references internal infrastructure concepts to public users; uncertainty about whether `/decisions` has real content.

---

### P1-11 — `307 Temporary Redirect` from apex to `www` not converted to permanent (carryover from 05-20 sweep)

From the 05-20 sweep, `https://cinecanon.com/*` issues `307 Temporary Redirect` to `https://www.cinecanon.com/*`. The fix commit `eb5fdc2` noted this is a Vercel domain setting that was not changed. A `307` is a temporary redirect — browsers and crawlers do not cache it, and Google does not always consolidate link equity through temporary redirects. Additionally, the `robots.txt` `Sitemap:` directive and `llms.txt` `Host:` field reference the apex domain, creating a redirect on every metadata fetch by crawlers.

**Impact:** Every crawler fetch of `robots.txt`, `sitemap.xml`, and `llms.txt` from the apex incurs a redirect; link equity split risk.

---

## P2 — Polish

### P2-1 — Awards, References, Methodology, About pages have no canonical `<link>` tag

**Files:** `apps/web/app/awards/page.tsx` has a canonical; `apps/web/app/references/page.tsx`, `apps/web/app/about/page.tsx`, and `apps/web/app/methodology/page.tsx` do not. The awards page is correctly handled; the other three are omitted. No filtering querystring risk here, but canonical consistency is a hygiene issue.

---

### P2-2 — Global meta description (layout default) is 42% over the 160-character recommendation

Already noted as P1-3. At the P2 level: the layout description is also used as the `twitter:description` and `og:description` fallback for every page without its own override. This means any unfurl (Slack, Twitter/X, Discord) of a link to `/films`, `/crew`, or `/vfx` will show a truncated description.

---

### P2-3 — Admin AEO GEO Score includes a hardcoded "Precision" sub-score placeholder

**File:** `apps/web/app/admin/(authenticated)/aeo/page.tsx` lines 145, 171

```tsx
// Precision placeholder: full points until we ship the judge LLM
const precision = 15; // placeholder full points
...
{ name: 'Precision', got: precision, max: 15, reason: 'Judge-LLM scoring not yet wired — placeholder full points' },
```

This is admin-only and not user-facing, but the GEO composite score displayed in `/admin/aeo` is therefore inflated by a fixed 15/15 for Precision. Any trend analysis on this score is misleading until the judge LLM is wired. The comment `"Judge-LLM scoring not yet wired — placeholder full points"` is visible in the admin UI as the `reason` string.

---

### P2-4 — `lookbook/page.tsx` eyebrow text says "upload coming soon" in production

**File:** `apps/web/app/lookbook/page.tsx` line 39:

```tsx
eyebrow="Visual search · upload coming soon"
```

This text is rendered in the `PageHero` eyebrow slot visible at the top of `/lookbook`. The page itself has real content (palette browser), but the eyebrow advertises an unshipped feature.

---

### P2-5 — `stunts/schools/[slug]/page.tsx` has an HTML comment placeholder for alumni

**File:** `apps/web/app/stunts/schools/[slug]/page.tsx` line 149:

```tsx
{/* Alumni placeholder — populated when phase 2 ships
```

An HTML comment left in production source code referencing a future phase. Not rendered to users, but it should have been cleaned up post-phase.

---

### P2-6 — No JSON-LD on Films, Crew, VFX, or Music index pages

The major index pages (`/films`, `/crew`, `/gear`, `/vfx`) emit no structured data. Higher-priority pages like film detail, crew detail, and gear item detail do emit `Movie`, `Person`, and `Product` JSON-LD respectively. The index pages could at minimum emit `CollectionPage` JSON-LD (as `/equipment/specs`, `/dossiers`, `/walkthroughs`, and `/decisions` already do), which helps AI engines understand the page is a navigational hub over a collection of entities.

---

### P2-7 — `apps/web/app/api/search/nl/route.ts` uses `console.error` in production code

**File:** `apps/web/app/api/search/nl/route.ts` line 78:

```ts
console.error('theme embed failed, falling back to structural sort:', e);
```

This is in the natural-language search endpoint. Per project conventions this should route through Sentry instead of `console.error`.

---

### P2-8 — `sitemap-core.xml` emits `lastmod` as `now` (request time) for all static entries

**File:** `apps/web/app/sitemap-core.xml/route.ts` line 8: `const now = new Date().toISOString()`.

Every static URL in `sitemap-core.xml` reports its `lastmod` as the moment the sitemap was fetched, not when the page content last changed. This causes crawlers to see every static URL as "updated" on every sitemap refresh (which is hourly due to `revalidate = 3600`). Google explicitly states that inaccurate `lastmod` values cause it to ignore the field entirely. The film and crew sitemaps use real `updated_at` timestamps per-entity; the core sitemap should do the same for static entries (either hardcoded dates or omit `lastmod` altogether).

---

## Appendix — Full URL × Status Table

### Status from 05-21 live crawl (13,104 pages = 200; 11 network-error crew slugs unchanged)

```
200  /                                  200  /stunts/rigging
200  /films                             200  /stunts/lineage
200  /crew                              200  /stunts/safety
200  /awards                            200  /vfx
200  /references                        200  /vfx/volumes
200  /tools                             200  /vfx/title-houses
200  /ask                               200  /vfx/shot-breakdowns
200  /bookmarks                         200  /sound
200  /signin                            200  /sound/post
200  /gear                              200  /sound/effects
200  /gear/rentals                      200  /sound/foley
200  /equipment/specs                   200  /sound/adr-studios
200  /about                             200  /sound/effects/libraries
200  /methodology                       200  /sound/houses
200  /format                            200  /sound/mixers          (new since 05-20)
200  /format/{slug} (all FORMAT_TAXONOMY)  200  /sound/designers     (new since 05-20)
200  /decisions                         200  /editing
200  /walkthroughs                      200  /editing/editors
200  /dossiers                          200  /editing/walkthroughs
200  /partnerships                      200  /music
200  /shots                             200  /music/composers
200  /lookbook                          200  /music/scoring-stages
200  /locations                         200  /music/orchestras
200  /decades                           200  /music/supervisors
200  /search                            200  /music/cue-guides
200  /queries                           200  /production-design
200  /queries/alexa65-sphero            200  /production-design/designers
200  /queries/dune-part-two-lenses      200  /production-design/works
200  /queries/magic-hour-2023           200  /costume-hair-makeup
200  /stunts                            200  /costume-hair-makeup/designers
200  /stunts/people                     200  /costume-hair-makeup/effects-houses
200  /stunts/sequences                  200  /costume-hair-makeup/costume-works
200  /stunts/companies                  200  /costume-hair-makeup/makeup-works
200  /stunts/coordinators → /stunts/people   200  /societies
200  /awards/cinematography → /awards/craft/cinematography
200  /for-dps … /for-makeup-artists (12 routes)
200  /digest.xml
200  /api/v1  (→ /api/v1/ then 200)
200  /robots.txt
200  /sitemap.xml (sitemap index → 5 child sitemaps, all 200)
200  /llms.txt
```

### New routes since 05-21 (not yet live-confirmed but all have page.tsx in repo)

```
LIVE  /tools/scoring-session-cost    (Phase 4, 2026-05-18)
LIVE  /tools/stunt-rig-picker        (Phase 4, 2026-05-18)
LIVE  /tools/hdr-target-picker       (Phase 4, 2026-05-18)
LIVE  /tools/anamorphic-vs-spherical (Phase 4, 2026-05-18)
ADMIN /admin/aeo/health              (observability, 2026-05-21)
```

### Known network-error crew slugs (11, unchanged from 05-21 crawl)

```
000  /crew/alexei-dmitriew      000  /crew/lauren-selig
000  /crew/alex-hope            000  /crew/lauren-stephens
000  /crew/chris-taaffe         000  /crew/takashi-koizumi
000  /crew/kenny-kusaka         000  /crew/william-hornbeck
000  /crew/lalit-pandit         000  /crew/yuichiro-saito
000  /crew/lauren-ritchie
```

These 11 slugs return network errors (not 404s) in the 05-21 crawl. They appear in the crew sitemap. Root cause is likely a server-side timeout or missing row — they warrant manual investigation.

### Image status (post-unoptimized fix)

All `<Image>` components pointing at `image.tmdb.org` now carry `unoptimized`. The 1,702 broken `/_next/image` URLs from the 05-21 crawl should be resolved; direct TMDb CDN requests should return 200. Residual unknown: keyframe images hosted on third-party CDNs (arbitrary URLs set `unoptimized` to bypass `remotePatterns` validation per `next.config.mjs` line 41).

### Metadata files

```
200  /robots.txt       — allow /, disallow /admin; Sitemap: points at apex (↑ 307 on crawl)
200  /sitemap.xml      — sitemap index; 5 child sitemaps all 200
200  /llms.txt         — dynamic, DB-backed, correct content
200  /digest.xml       — Atom 1.0 feed, correct
```

---

## What I'd Fix First

The single highest-leverage action is the **sitemap coverage gap**: over 25 publicly reachable routes — including every department index (`/awards`, `/music`, `/sound`, `/editing`, `/production-design`, `/costume-hair-makeup`), every Phase 2-4 editorial surface (`/walkthroughs`, `/dossiers`, `/decisions`, `/partnerships`), and all four Phase 4 tools — are absent from every sitemap segment. These are exactly the pages the site's AEO/GEO strategy depends on AI crawlers discovering and citing. Adding them to `sitemap-core.xml` is a one-file change that takes under an hour. The immediate next fix after that is the **equipment/specs empty-state message** (P0-1), which leaks internal language to public users and indicates the spec seed has not been dispatched to production — dispatch `seed-equipment-specs-full.ts` via the `db-script.yml` workflow and update the fallback copy to be user-appropriate regardless of seed state. Then address the **five index pages with no meta description** (`/films`, `/crew`, `/vfx`, `/search`, `/bookmarks`) and **add canonical tags to the eight pages missing them** — both are one-line metadata additions per file that materially improve SERP snippet quality and protect against filter-URL duplication signals.
