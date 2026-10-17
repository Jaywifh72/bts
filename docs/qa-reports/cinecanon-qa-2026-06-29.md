# CineCanon QA Sweep — 2026-06-29

## Summary

**Crawl method:** Static analysis of the local repo at `/home/user/bts` (branch `master`). Direct HTTP access to `https://cinecanon.com` was blocked by the egress proxy (org policy 403 on all CONNECT tunnels to the domain), so live HTTP status codes could not be obtained for individual URLs. All findings are sourced from source-code inspection of the Next.js App Router codebase (`apps/web/app`), the five sitemap route handlers, the layout, nav, footer, and component files. Where live HTTP status is unknown, findings are flagged accordingly.

**Routes inventoried:** 167 non-admin `page.tsx` files plus associated route handlers.

**Total defects:** 2 P0 (broken), 10 P1 (degraded), 7 P2 (polish).

---

## P0 — Broken

### P0-1: `/icon-512.png` returns 404 — broken Organization logo in JSON-LD structured data

**Location:** `apps/web/app/page.tsx` line 133

The homepage emits a `schema.org/Organization` JSON-LD block with `logo: siteUrl() + '/icon-512.png'`. No such file exists anywhere in the repository: `apps/web/public/` contains only `brand/cinecanon-mark.svg`, and `apps/web/app/` contains only `icon.svg` (which Next.js serves as the browser favicon, not at `/icon-512.png`). The structured data logo URL will resolve to a 404 on every production request.

Google's Knowledge Panel and AI engine entity resolution both depend on this field to anchor the Organization node. A 404 logo downgrades Google's confidence in the JSON-LD block. The fix is either to add a `public/icon-512.png` file or to change the reference to the existing SVG at `/icon-512.png` via a route handler, or to change the logo field to point to the OG image endpoint (`/opengraph-image`).

**Severity rationale:** Broken asset directly embedded in every-visitor structured data on the homepage.

---

### P0-2: Sentry declared as a dependency but never initialized — unhandled production exceptions silently dropped

**Location:** `apps/web/package.json` — `"@sentry/nextjs": "^10.52.0"` is listed as a dependency. No `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, or `instrumentation.ts` exists anywhere in the repository. The `next.config.mjs` does not wrap the config with `withSentryConfig`.

`CLAUDE.md` explicitly states: *"Sentry first. Errors go through @sentry/nextjs."* Without any Sentry initialization, all uncaught server-side exceptions, edge-runtime errors, and client-side React errors are swallowed — the error.tsx error boundary fires locally but no signal reaches the operator. This means production regressions (DB query failures, schema mismatches, edge-function crashes) are undetected until a user reports them.

**Severity rationale:** Breaks the stated production observability contract. Silent failure on any runtime error that reaches an error boundary.

---

## P1 — Degraded

### P1-1: Massive sitemap gap — 35+ indexable pages absent from all five sitemap segments

The five segments served at `/sitemap.xml` (index) → `sitemap-{core,films,crew,gear,vfx}.xml` collectively cover: `/`, `/films`, `/films/[slug]`, `/crew` (indexable only), `/crew/[slug]`, `/gear/**`, `/vfx/[slug]`, `/stunts` and five sub-paths, `/format` and slug variants, `/ask`, `/tools` and five sub-tools, and three `/queries/` slugs.

Every page listed below has a `page.tsx` with metadata, a canonical, and JSON-LD, and is linked from the footer or nav — but is entirely absent from all five sitemaps, making it invisible to Google's sitemap crawler:

**High-traffic index pages:** `/awards`, `/music`, `/sound`, `/editing`, `/production-design`, `/costume-hair-makeup`, `/references`, `/about`, `/methodology`, `/decades`, `/locations`, `/decisions`, `/walkthroughs`, `/dossiers`, `/partnerships`, `/shots`, `/societies`, `/search`, `/queries` (index — the three individual query slugs are present but the index is not)

**Role-specific landing pages (all 12):** `/for-dps`, `/for-colorists`, `/for-gaffers`, `/for-stunt-coordinators` (served as `/for-coordinators`), `/for-sound-mixers`, `/for-sound-designers`, `/for-composers`, `/for-music-supervisors`, `/for-editors`, `/for-production-designers`, `/for-costume-designers`, `/for-makeup-artists`

**Phase 4 tools (all landed per CLAUDE.md "in flight"):** `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`

**VFX sub-sections:** `/vfx/volumes`, `/vfx/title-houses`, `/vfx/shot-breakdowns`

**Other sub-sections reachable from footer:** `/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`, `/music/cue-guides`, `/sound/post`, `/sound/effects`, `/sound/foley`, `/sound/adr-studios`, `/sound/houses`, `/sound/effects/libraries`, `/editing/editors`, `/editing/walkthroughs`, `/stunts/companies`, `/stunts/schools/[slug]`, `/gear/rentals`, `/equipment/specs`, `/vfx/volumes/[slug]`, `/vfx/title-houses/[slug]`

The `sitemap-core.xml` is the right home for most of these. The llms.txt route already lists all of them in prose, creating a contradiction between the two discoverability surfaces.

---

### P1-2: Developer-facing empty-state text rendered to end users on five live pages

When these pages receive zero rows from the database (either because migrations haven't run on production or because the catalog is empty), they render internal engineering language directly to visitors:

| Page | User-visible text |
|---|---|
| `/partnerships` | `Catalog seeds with migration 0086 + dispatch.` |
| `/vfx/volumes` | `No LED volumes catalogued yet. The seed lands once migration 0078 is applied on the production Neon DB.` |
| `/vfx/title-houses` | `Catalog seeds with migration 0084 + dispatch.` |
| `/music/orchestras` | `Orchestra catalog seeds with migration 0083 + dispatch.` |
| `/costume-hair-makeup/effects-houses` | `Catalog seeds with migration 0084 + dispatch.` |
| `/decisions` | `Decision trees coming online — table not yet migrated on this environment.` |

These strings expose migration identifiers and internal dispatch workflow language to the public. Any visitor or AI crawler landing on these pages during a period of empty data sees a broken product signal.

---

### P1-3: Content images served with `alt=""` in search-result and similar-films contexts

Pages that render film posters as the primary visual identity of a search result use empty alt text, meaning screen readers announce nothing meaningful for what are content images (not decorative ones):

- `apps/web/app/ask/page.tsx` line 254 — film poster in the `/ask` results grid. Adjacent `<h2>` has the title, but the image itself carries no alt.
- `apps/web/components/productions/ProductionDetail.tsx` lines 888 and 931 — collection-member and similar-film poster thumbnails. The wrapping link has no accessible label beyond the empty-alt image.
- `apps/web/components/productions/MediaGallery.tsx` line 34 — media gallery images.
- `apps/web/app/vfx/[slug]/page.tsx` line 172 — associated film posters on VFX house detail page.

Decorative uses of `alt=""` (e.g., tiny 24px thumbnails in filmography tables where title text is immediately adjacent) are an accepted pattern. The `/ask` results grid and the collection-member rail on film detail pages are the cases where the image is the primary affordance at typical viewport widths and empty alt is a genuine accessibility and indexability gap.

---

### P1-4: `/api/v1/crew/{slug}` endpoint exists but is undocumented in the API discovery response

`apps/web/app/api/v1/crew/[slug]/route.ts` implements a full public crew endpoint with the same CC-BY 4.0 / 5-minute edge cache contract as the productions endpoint. The `apps/web/app/api/v1/route.ts` discovery document only advertises `production`, `search_suggest`, `aeo_precision`, `aeo_claims`, and `aeo_digest_atom`. AI crawlers and API consumers that read the discovery doc have no way to discover the crew endpoint.

Additionally, `CLAUDE.md` lists `/api/v1/crew/{slug}` as a stable public surface, reinforcing that this omission is unintentional.

---

### P1-5: 36 `console.warn` / `console.error` calls in production server paths violate the Sentry-first convention

`CLAUDE.md` explicitly states: *"Don't add console.log or console.error in production code paths — use Sentry."* The following files have catch blocks that call `console.warn` or `console.error` in server components, which means error signals go to the Vercel function log (not observable from a dashboard) and are silently dropped if Sentry is also uninitialized (see P0-2):

Files with console calls in non-admin production paths: `editing/walkthroughs/page.tsx`, `sound/effects/libraries/[slug]/page.tsx` (2 calls), `sound/effects/libraries/page.tsx`, `sound/adr-studios/[slug]/page.tsx`, `sound/adr-studios/page.tsx`, `sound/houses/page.tsx`, `dossiers/[slug]/page.tsx`, `vfx/volumes/[slug]/page.tsx`, `vfx/volumes/page.tsx`, `vfx/shot-breakdowns/page.tsx`, `vfx/title-houses/[slug]/page.tsx`, `vfx/title-houses/page.tsx`, `production-design/works/page.tsx`, `page.tsx` (homepage, 2 calls), `partnerships/[slug]/page.tsx`, `partnerships/page.tsx`, `gear/rentals/[slug]/page.tsx`, `walkthroughs/[slug]/page.tsx`, and several others.

---

### P1-6: Meta description length out of spec on 11 pages

The 120–160 character guideline applies. All deviations found:

**Too long (>160 chars) — content will be truncated by Google and AI summarizers:**

| Page | Length | Issue |
|---|---|---|
| `/films` | 163 | 3 chars over |
| `/awards` | 249 | 89 chars over — runs into fine-print territory |
| `/sound` | 170 | 10 chars over |
| `/stunts` | 162 | 2 chars over |
| `/ask` | 193 | 33 chars over |
| `/decisions` | 201 | 41 chars over |

**Too short (<120 chars) — leaves budget unused, reduces SERP click-through:**

| Page | Length | Issue |
|---|---|---|
| `/music` | 80 | Terse ("Composers, music supervisors, and orchestrators — credited and cross-referenced.") |
| `/about` | 93 | Generic |
| `/editing` | 90 | Single clause |
| `/walkthroughs` | 117 | 3 chars under |
| `/lookbook` | 118 | 2 chars under |

---

### P1-7: 21 static pages missing a canonical URL declaration

Pages below have `export const metadata` without `alternates: { canonical: ... }`. Because `metadataBase` is set in the root layout, Next.js will not self-canonicalize without the explicit declaration on paginated / filter-variant pages, leaving them open to canonicalization ambiguity when query strings are appended:

`/account`, `/ask`, `/bookmarks`, `/crew/compare`, `/films/compare`, `/format`, `/gear`, `/gear/compare`, `/import/letterboxd`, `/search`, `/signin`, `/societies`, `/stunts`, `/stunts/coordinators` (redirect page, less critical), `/stunts/lineage`, `/stunts/people`, `/stunts/rigging`, `/stunts/safety`, `/stunts/sequences`, `/tools`, `/tools/cdl`, `/tools/coverage`, `/tools/frame-lines`

Most of these are filter-driven or comparison pages where Google may crawl with query strings (`?sort=`, `?decade=`) and without a canonical the crawler has to guess which variant is authoritative.

---

### P1-8: Three pages missing `<title>` / `Metadata` export entirely

`/stunts/coordinators` — redirect-only page, low impact but crawlers see the redirect before the metadata.
`/claims/[id]` — resolver redirect; also low impact, but the route does render if the redirect target is not found.
`/awards/cinematography` — redirect to `/awards/craft/cinematography`; same situation.

All three are pure-redirect pages (`redirect()` on the first render), so they would never show a rendered page to a crawler. However, they produce 307 responses with no accompanying metadata, and the extra redirect hop should be monitored.

---

### P1-9: `/lookbook` page signals unfinished feature prominently in the eyebrow

`apps/web/app/lookbook/page.tsx` line 39 renders:

```
eyebrow="Visual search · upload coming soon"
```

The eyebrow label is the first text a visitor reads above the H1. "Coming soon" in the eyebrow signals an unfinished product to anyone arriving via internal link from `/shots`. The detailed commentary below the hero (about SigLIP inference gaps and contributor notes) is appropriately scoped to a developer-contributor aside, but the eyebrow copy is the public-facing brand statement.

---

### P1-10: `console.warn` instead of Sentry on critical DB-table-missing catch blocks

Several pages catch `Error` from DB queries where the underlying table may not exist on production (vfx_volumes, title_sequence_houses, partnerships, decisions), and call `console.warn` rather than `Sentry.captureException`. Combined with P0-2 (Sentry uninitialized), this means a migration gap on production is not observable from any monitoring surface.

---

## P2 — Polish

### P2-1: Eight section index page titles are single-word or two-word strings — below the 30-char target

Page titles (with the `| CineCanon` template suffix applied) at the following routes are shorter than 30 characters, which reduces SERP informativeness and click-through:

| Page | Full title | Length |
|---|---|---|
| `/vfx` | `VFX \| CineCanon` | 15 |
| `/gear` | `Gear \| CineCanon` | 16 |
| `/sound` | `Sound \| CineCanon` | 17 |
| `/music` | `Music \| CineCanon` | 17 |
| `/stunts` | `Stunts \| CineCanon` | 18 |
| `/awards` | `Awards \| CineCanon` | 18 |
| `/tools` | `Tools \| CineCanon` | 17 |
| `/references` | `References \| CineCanon` | 22 |

These are already in the film-slug pattern — e.g., `/films` is 51 chars and `/crew` is 54 — so the model for richer titles is already established.

---

### P2-2: No Content-Security-Policy header

`apps/web/next.config.mjs` sets four security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) but omits `Content-Security-Policy`. CSP is not required but is recommended for a Pro-grade reference site that surfaces user-generated content (corrections, annotations) and embeds YouTube iframes via the VideoGallery component.

---

### P2-3: `/about` page title is 64 characters — slightly over the 60-char guideline

`About CineCanon — Sources, Curation & Citation Tiers | CineCanon` is 64 characters. SERP snippets typically truncate around 60. Trimming to `About CineCanon — Sources, Curation & Citations | CineCanon` (58 chars) would fit cleanly.

---

### P2-4: `/films` meta description is 163 characters — 3 over the 160-char limit

The extra three characters are unlikely to cause a visible truncation in most SERPs but should be trimmed for consistency with the guideline.

---

### P2-5: `/queries` index page is linked from the footer and homepage but absent from all sitemaps

The three individual query slugs (`/queries/alexa65-sphero`, `/queries/dune-part-two-lenses`, `/queries/magic-hour-2023`) are correctly included in `sitemap-core.xml`, but `/queries` itself (the index page with all killer queries) is missing. Any AI engine that resolves the parent from the llms.txt index page entry will get a 200 page not listed in any sitemap.

---

### P2-6: `suppressHydrationWarning` on both `<html>` and `<body>` suppresses legitimate hydration mismatches

`apps/web/app/layout.tsx` lines 46 and 57 both set `suppressHydrationWarning`. Per the CLAUDE.md note, this is intentional for browser-extension compatibility. However, it globally silences any hydration mismatch on either element, including real bugs. This is a maintenance risk rather than a current defect.

---

### P2-7: Twitter card images not set on section index pages

Most section index pages (e.g., `/awards`, `/music`, `/sound`, `/stunts`) have `twitter: { card: 'summary_large_image', ... }` in metadata without a corresponding image. They fall back to the root `/opengraph-image` which works correctly, but setting an explicit `twitter.images` entry would let cards carry section-relevant imagery.

---

## Appendix — Full URL × Status Table

The following table covers every non-admin public route in the repo. HTTP status codes marked as `200 (ISR)` are inferred from the presence of a valid `page.tsx` with no crash path in the default render; `200 (API)` for route handlers; `307` for redirect pages; `404 (asset)` for a referenced asset that has no file backing it; `UNKNOWN` where live access was required but blocked.

| Route | Type | HTTP Status (inferred) | In Sitemap | Notes |
|---|---|---|---|---|
| `/` | Page | 200 (ISR) | YES (core) | |
| `/about` | Page | 200 (ISR) | NO | P1-1 |
| `/account` | Page | 200 / 307 anon | NO | Auth-gated redirect |
| `/ask` | Page | 200 (dynamic) | YES (core) | Description 193 chars (P1-6) |
| `/awards` | Page | 200 (dynamic) | NO | P1-1; description 249 chars (P1-6) |
| `/awards/cinematography` | Page | 307 → /awards/craft/cinematography | NO | Redirect page; no metadata (P1-8) |
| `/awards/craft/[craft]` | Page | 200 (dynamic) | NO | P1-1 |
| `/bookmarks` | Page | 200 / auth-gated | NO | No canonical |
| `/claims/[id]` | Page | 307 or 404 | NO | Resolver; no metadata (P1-8) |
| `/costume-hair-makeup` | Page | 200 (ISR) | NO | P1-1 |
| `/costume-hair-makeup/construction-houses` | Page | 200 (ISR) | NO | P1-1 |
| `/costume-hair-makeup/construction-houses/[slug]` | Page | 200/404 | NO | P1-1 |
| `/costume-hair-makeup/costume-works` | Page | 200 (ISR) | NO | P1-1 |
| `/costume-hair-makeup/designers` | Page | 200 (ISR) | NO | P1-1 |
| `/costume-hair-makeup/effects-houses` | Page | 200 (ISR) | NO | Empty state: dev text (P1-2) |
| `/costume-hair-makeup/effects-houses/[slug]` | Page | 200/404 | NO | P1-1 |
| `/costume-hair-makeup/makeup-works` | Page | 200 (ISR) | NO | P1-1 |
| `/crew` | Page | 200 (ISR) | YES (core) | |
| `/crew/[slug]` | Page | 200/404 | YES (crew) | Conditional noindex for thin pages |
| `/crew/compare` | Page | 200 (dynamic) | NO | No canonical |
| `/decades` | Page | 200 (ISR) | NO | P1-1 |
| `/decades/[decade]` | Page | 200/404 | NO | P1-1 |
| `/decisions` | Page | 200 (dynamic) | NO | P1-1; empty state dev text (P1-2) |
| `/decisions/[slug]` | Page | 200/404 | NO | P1-1 |
| `/dossiers` | Page | 200 (ISR) | NO | P1-1 |
| `/dossiers/[slug]` | Page | 200/404 | NO | P1-1 |
| `/editing` | Page | 200 (ISR) | NO | P1-1; description 90 chars |
| `/editing/editors` | Page | 200 (ISR) | NO | P1-1 |
| `/editing/walkthroughs` | Page | 200 (ISR) | NO | P1-1 |
| `/equipment/specs` | Page | 200 (ISR) | NO | Linked from footer; not in sitemap |
| `/films` | Page | 200 (ISR) | YES (core) | Description 163 chars (P2-4) |
| `/films/[slug]` | Page | 200/404 | YES (films) | 19 parallel queries; ISR 86400s |
| `/films/[slug]/loadout` | Page | 200/404 | NO | No JSON-LD |
| `/films/[slug]/scenes/[sceneSlug]` | Page | 200/404 | NO | |
| `/films/compare` | Page | 200 (dynamic) | NO | No canonical |
| `/for-colorists` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-composers` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-coordinators` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-costume-designers` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-dps` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-editors` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-gaffers` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-makeup-artists` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-music-supervisors` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-production-designers` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-sound-designers` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/for-sound-mixers` | Page | 200 (ISR) | NO | P1-1; no JSON-LD |
| `/format` | Page | 200 (ISR) | YES (core) | No canonical on page |
| `/format/[slug]` | Page | 200/404 | YES (core) | |
| `/gear` | Page | 200 (ISR) | YES (core) | |
| `/gear/[manufacturer]` | Page | 200/404 | YES (gear) | No JSON-LD |
| `/gear/[manufacturer]/[series]` | Page | 200/404 | YES (gear) | No JSON-LD; alt="" on posters |
| `/gear/[manufacturer]/[series]/[item]` | Page | 200/404 | YES (gear) | |
| `/gear/compare` | Page | 200 (dynamic) | NO | No canonical |
| `/gear/rentals` | Page | 200 (ISR) | NO | Linked from footer; no sitemap |
| `/gear/rentals/[slug]` | Page | 200/404 | NO | |
| `/import/letterboxd` | Page | 200 (auth) | NO | No canonical |
| `/locations` | Page | 200 (ISR) | NO | P1-1 |
| `/locations/[id]` | Page | 200/404 | NO | P1-1 |
| `/lookbook` | Page | 200 (ISR) | NO | "Upload coming soon" eyebrow (P1-9) |
| `/methodology` | Page | 200 (ISR) | NO | P1-1 (surprising for a trust page) |
| `/music` | Page | 200 (ISR) | NO | P1-1; description 80 chars |
| `/music/composers` | Page | 200 (ISR) | NO | P1-1 |
| `/music/cue-guides` | Page | 200 (ISR) | NO | P1-1 |
| `/music/cues/[productionSlug]/[cueSlug]` | Page | 200/404 | NO | |
| `/music/orchestras` | Page | 200 (ISR) | NO | Dev empty state (P1-2) |
| `/music/orchestras/[slug]` | Page | 200/404 | NO | |
| `/music/scores/[productionSlug]` | Page | 200/404 | NO | |
| `/music/scoring-stages` | Page | 200 (ISR) | NO | P1-1 |
| `/music/scoring-stages/[slug]` | Page | 200/404 | NO | |
| `/music/supervision-agencies` | Page | 200 (ISR) | NO | |
| `/music/supervision-agencies/[slug]` | Page | 200/404 | NO | |
| `/music/supervisors` | Page | 200 (ISR) | NO | P1-1 |
| `/partnerships` | Page | 200 (dynamic) | NO | Dev empty state (P1-2) |
| `/partnerships/[slug]` | Page | 200/404 | NO | |
| `/production-design` | Page | 200 (ISR) | NO | P1-1 |
| `/production-design/designers` | Page | 200 (ISR) | NO | P1-1 |
| `/production-design/works` | Page | 200 (ISR) | NO | P1-1 |
| `/queries` | Page | 200 (ISR) | NO | P2-5 |
| `/queries/alexa65-sphero` | Page | 200 (ISR) | YES (core) | |
| `/queries/dune-part-two-lenses` | Page | 200 (ISR) | YES (core) | |
| `/queries/magic-hour-2023` | Page | 200 (ISR) | YES (core) | |
| `/references` | Page | 200 (dynamic) | NO | P1-1 |
| `/references/[id]` | Page | 200/404 | NO | No JSON-LD |
| `/search` | Page | 200 (dynamic) | NO | P1-1 |
| `/shots` | Page | 200 (ISR) | NO | P1-1 |
| `/signin` | Page | 200 (ISR) | NO | No canonical |
| `/societies` | Page | 200 (ISR) | NO | No canonical; not in sitemap |
| `/societies/[slug]` | Page | 200/404 | NO | |
| `/sound` | Page | 200 (ISR) | NO | P1-1; description 170 chars |
| `/sound/adr-studios` | Page | 200 (ISR) | NO | P1-1 |
| `/sound/adr-studios/[slug]` | Page | 200/404 | NO | |
| `/sound/designers` | Page | 200 (ISR) | NO | P1-1 |
| `/sound/effects` | Page | 200 (ISR) | NO | P1-1 |
| `/sound/effects/libraries` | Page | 200 (ISR) | NO | P1-1 |
| `/sound/effects/libraries/[slug]` | Page | 200/404 | NO | |
| `/sound/foley` | Page | 200 (ISR) | NO | P1-1 |
| `/sound/houses` | Page | 200 (ISR) | NO | P1-1 |
| `/sound/houses/[slug]` | Page | 200/404 | NO | |
| `/sound/mixers` | Page | 200 (ISR) | NO | P1-1 |
| `/sound/post` | Page | 200 (ISR) | NO | P1-1 |
| `/stunts` | Page | 200 (ISR) | YES (core) | No canonical; description 162 chars |
| `/stunts/companies` | Page | 200 (ISR) | NO | Not in sitemap despite being a major section |
| `/stunts/companies/[slug]` | Page | 200/404 | NO | |
| `/stunts/coordinators` | Page | 307 → /stunts/people | NO | Redirect; no metadata |
| `/stunts/lineage` | Page | 200 (ISR) | YES (core) | No canonical |
| `/stunts/people` | Page | 200 (ISR) | YES (core) | No canonical |
| `/stunts/rigging` | Page | 200 (ISR) | YES (core) | No canonical |
| `/stunts/rigging/[slug]` | Page | 200/404 | NO | |
| `/stunts/safety` | Page | 200 (ISR) | YES (core) | No canonical |
| `/stunts/safety/[slug]` | Page | 200/404 | NO | |
| `/stunts/schools/[slug]` | Page | 200/404 | NO | Alumni section commented placeholder |
| `/stunts/sequences` | Page | 200 (ISR) | YES (core) | No canonical |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | Page | 200/404 | NO | |
| `/tools` | Page | 200 (ISR) | YES (core) | No canonical; title 17 chars |
| `/tools/aces` | Page | 200 (ISR) | YES (core) | No canonical; no JSON-LD |
| `/tools/anamorphic-vs-spherical` | Page | 200 (ISR) | NO | P1-1 (Phase 4) |
| `/tools/cdl` | Page | 200 (ISR) | YES (core) | No canonical; no JSON-LD |
| `/tools/coverage` | Page | 200 (ISR) | YES (core) | No canonical; no JSON-LD |
| `/tools/frame-lines` | Page | 200 (ISR) | YES (core) | No canonical; no JSON-LD |
| `/tools/hdr-target-picker` | Page | 200 (ISR) | NO | P1-1 (Phase 4) |
| `/tools/loadout` | Page | 200 (ISR) | YES (core) | No JSON-LD |
| `/tools/scoring-session-cost` | Page | 200 (ISR) | NO | P1-1 (Phase 4) |
| `/tools/stunt-rig-picker` | Page | 200 (ISR) | NO | P1-1 (Phase 4) |
| `/vfx` | Page | 200 (ISR) | YES (core) | |
| `/vfx/[slug]` | Page | 200/404 | YES (vfx) | alt="" on film poster thumbnails |
| `/vfx/shot-breakdowns` | Page | 200 (ISR) | NO | P1-1 |
| `/vfx/title-houses` | Page | 200 (ISR) | NO | Dev empty state (P1-2) |
| `/vfx/title-houses/[slug]` | Page | 200/404 | NO | |
| `/vfx/volumes` | Page | 200 (ISR) | NO | Dev empty state with "migration 0078" text (P1-2) |
| `/vfx/volumes/[slug]` | Page | 200/404 | NO | |
| `/walkthroughs` | Page | 200 (ISR) | NO | P1-1 |
| `/walkthroughs/[slug]` | Page | 200/404 | NO | |
| `/icon-512.png` | Asset | **404** | — | P0-1: referenced in homepage JSON-LD |
| `/robots.txt` | Route | 200 | — | Present; points to `/sitemap.xml` |
| `/sitemap.xml` | Route | 200 | — | Sitemap index; covers 5 segments |
| `/sitemap-core.xml` | Route | 200 | — | 22 static entries + format slugs + queries |
| `/sitemap-films.xml` | Route | 200 (dynamic) | — | All production slugs, deduped |
| `/sitemap-crew.xml` | Route | 200 (dynamic) | — | Crew with credit_count >= 8 only |
| `/sitemap-gear.xml` | Route | 200 (dynamic) | — | Manufacturers + series + items |
| `/sitemap-vfx.xml` | Route | 200 (dynamic) | — | VFX house slugs only |
| `/llms.txt` | Route | 200 (dynamic) | — | Present; well-structured |
| `/digest.xml` | Route | 200 (dynamic) | — | Atom feed; autodiscovery in layout |
| `/api/v1` | Route | 200 | — | Discovery doc; missing `/crew/{slug}` entry |
| `/api/v1/productions/[slug]` | Route | 200/404 | — | Correct CC-BY cache headers |
| `/api/v1/crew/[slug]` | Route | 200/404 | — | Undocumented in discovery doc (P1-4) |

---

## What I Would Fix First

The two items I would address before anything else are P0-2 and P1-1 taken together, because they compound each other. P0-2 (Sentry uninitialized) means any runtime fallout from the P1-1 sitemap expansion — DB queries failing for tables that are empty, ISR cache misses triggering concurrent DB hits across newly-indexed pages, or edge-function timeouts — will be entirely invisible to the operator. Initializing Sentry by adding `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` (with the `withSentryConfig` wrapper in `next.config.mjs`) takes a single session and immediately gives production observability for everything else. Once Sentry is live, fixing P0-1 (`/icon-512.png` missing) is a five-minute copy of the SVG mark into `public/icon-512.png` or a change to the JSON-LD to point at the OG image route, restoring the Organization structured data logo. After those two P0s are resolved, the highest-leverage P1 is the sitemap gap: expanding `sitemap-core.xml` to include all 35+ missing sections (starting with `/awards`, `/methodology`, `/references`, `/music`, `/sound`, `/decisions`, and all 12 `/for-*` role pages) directly unlocks crawl budget for the site's deepest editorial content and its most differentiated landing surfaces for working professionals.
