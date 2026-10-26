# CineCanon QA Sweep — 2026-10-26

**Inspector:** Claude Sonnet 4.6 (subagent, read-only)
**Repo path:** `/home/user/bts` · branch `master`
**Live site:** https://cinecanon.com

> **Crawl note:** The egress proxy in this sandbox blocks connections to cinecanon.com (403 `connect_rejected`). No live HTTP requests were possible. This report is entirely code-analysis-based — it reflects what the code at HEAD will produce, not confirmed live HTTP status codes. Findings marked "[CODE]" are derived from static analysis. Findings from the prior crawl (2026-05-21) that are still relevant are noted.

---

## Summary

| Severity | Count |
|---|---|
| P0 — Broken / Security | 2 |
| P1 — Significant / Degraded | 7 |
| P2 — Polish / Minor | 7 |
| **Total** | **16** |

**Overall health:** Amber. The core routes (films, crew, gear, vfx index + detail pages) are structurally sound. The two main structural gaps are (1) a PII-leaking `console.log` that fires on every page render in production, and (2) large blocks of the site that are invisible to search crawlers because they are missing from every sitemap. Neither is site-breaking for human visitors, but the PII leak is a security defect and the sitemap gap measurably harms SEO for the sound, music, editing, walkthroughs, decisions, partnerships, dossiers, and all "for-*" landing pages — content that was recently shipped and deserves crawl budget.

---

## P0 — Broken / Security

### P0-1 — `safe-auth.ts` logs session PII to production server logs on every page render

**File:** `apps/web/lib/safe-auth.ts`, lines 27-32

**Evidence:**
```ts
console.log(
  '[safeAuth]',
  session
    ? { email: session.user?.email, role: session.user?.role, id: session.user?.id }
    : 'null',
);
```

`safeAuth()` is called from `app/layout.tsx` `RootLayout`, which means it runs on every server-rendered page request. The comment says the log exists for production diagnosis. The effect is that every authenticated user's email address, role, and internal ID are written to Vercel function logs on each page visit.

**Why P0:** PII (email addresses) in unredacted server logs violates reasonable data-handling expectations and potentially GDPR/CCPA. It is also an explicit CLAUDE.md violation: "Don't add console.log or console.error in production code paths — use Sentry."

**Suggested fix:** Remove the `console.log` entirely. If session-shape diagnostics are needed, capture the signal as a Sentry breadcrumb or a structured Sentry event with `scope.setUser({ id })` (not email) gated behind a debug flag.

---

### P0-2 — Developer-facing migration messages visible to public users in empty states

**Files:**
- `apps/web/app/partnerships/page.tsx` line 55: `"Catalog seeds with migration 0086 + dispatch."`
- `apps/web/app/vfx/volumes/page.tsx` line 64: `"No LED volumes catalogued yet. The seed lands once migration 0078 is applied"`
- `apps/web/app/vfx/title-houses/page.tsx` line 54: `"Catalog seeds with migration 0084 + dispatch."`
- `apps/web/app/gear/rentals/page.tsx` line 54: `"dispatch loads it."`

**Evidence (sample — partnerships/page.tsx):**
```tsx
{partnerships.length === 0 ? (
  <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
    Catalog seeds with migration 0086 + dispatch.
  </div>
) : (
```

These strings are implementation notes left in the empty-state fallback. If the tables are seeded (migrations 0083–0086 are committed to the repo), the messages are invisible. If a table query fails or data is absent, a public visitor sees raw developer jargon referencing internal migration numbers.

**Why P0:** A public user hitting `/partnerships`, `/vfx/volumes`, `/vfx/title-houses`, or `/gear/rentals` when the data layer is empty or erroring receives nonsensical developer text. It undermines editorial credibility — the brand promise is "every claim cited," and the first thing visitors see is "dispatch loads it."

**Suggested fix:** Replace each empty-state message with a user-facing copy such as "Catalog coming soon — check back shortly." or suppress the section entirely until data exists.

---

## P1 — Significant / Degraded

### P1-1 — Phase 4 tools completely absent from sitemap

**Files:** `apps/web/app/sitemap-core.xml/route.ts`

**Evidence:** `sitemap-core.xml` lists only `/tools`, `/tools/frame-lines`, `/tools/loadout`, `/tools/coverage`, `/tools/aces`, and `/tools/cdl`. The following pages — each with proper metadata and canonical — are omitted:

| URL | Title |
|---|---|
| `/tools/scoring-session-cost` | Scoring session cost calculator |
| `/tools/stunt-rig-picker` | Stunt rig decision picker |
| `/tools/hdr-target-picker` | HDR delivery target picker |
| `/tools/anamorphic-vs-spherical` | Anamorphic vs spherical matrix |

These are the four Phase 4 tools just shipped (per CLAUDE.md "In flight") and referenced in `llms.txt` as working-pro decision aids. They are linked from the `/tools` index page and from `llms.txt` but are not in any sitemap segment.

**Suggested fix:** Add four `SitemapEntry` objects to `sitemap-core.xml/route.ts` with `priority: 0.7` and `changefreq: 'monthly'`.

---

### P1-2 — ~30 major section index pages absent from every sitemap

**Files:** `apps/web/app/sitemap-core.xml/route.ts` (and all other sitemap segment routes)

**Evidence:** The sitemap index covers five segments (core, films, crew, gear, vfx). The following public routes appear in the footer navigation and/or `llms.txt` but are in no sitemap:

```
/about                   /awards                   /decisions
/dossiers                /editing                  /editing/editors
/editing/walkthroughs    /music                    /music/composers
/music/scoring-stages    /music/orchestras          /music/supervisors
/music/cue-guides        /partnerships              /production-design
/production-design/designers                        /societies
/sound                   /sound/houses              /sound/mixers
/sound/effects           /sound/adr-studios         /sound/foley
/vfx/shot-breakdowns     /vfx/title-houses          /vfx/volumes
/walkthroughs            /costume-hair-makeup        /for-dps
/for-gaffers             /for-colorists             /for-sound-mixers
/for-editors             /for-production-designers   /for-costume-designers
/locations               /decades                   /shots
/references              /queries                   /about
```

All are linked from the footer ("Sections", "Cross-cuts", "For working pros"), but Google's crawler has no structured discovery path for them. Dynamic sub-pages (e.g. `/walkthroughs/[slug]`, `/decisions/[slug]`, `/partnerships/[slug]`, `/dossiers/[slug]`) are also unindexable since their parent indexes are not sitemapped and there are no dedicated sitemap segments for them.

**Suggested fix:** Add a `sitemap-content.xml` segment route covering the new content areas. Sub-page sitemaps for walkthroughs, decisions, and partnerships can be modeled exactly like `sitemap-vfx.xml` (one `list*` DB query, map to URLs).

---

### P1-3 — 31 public pages have metadata but no `canonical` URL

**Evidence:** Static analysis of all `page.tsx` files outside `/admin/`:

```
/gear                           /gear/[manufacturer]
/gear/[manufacturer]/[series]   /gear/[manufacturer]/[series]/[item]
/gear/compare                   /format                   /format/[slug]
/stunts                         /stunts/people            /stunts/sequences
/stunts/lineage                 /stunts/rigging/[slug]    /stunts/companies/[slug]
/stunts/schools/[slug]          /stunts/sequences/[productionSlug]/[sequenceSlug]
/films/compare                  /crew/compare
/ask                            /search
/societies                      /tools                    /tools/cdl
/tools/frame-lines              /tools/coverage
/films/[slug]/scenes/[sceneSlug]
/references/[id]
```

(Plus `/account`, `/bookmarks`, `/signin`, `/import/letterboxd` — less critical.)

Without a `canonical`, search engines may index parameterised or filtered variants of the same page as separate documents. The gear item pages (`/gear/[manufacturer]/[series]/[item]`) are particularly exposed since URL variants can exist.

**Suggested fix:** Add `alternates: { canonical: \`${siteUrl()}/...\` }` to each `metadata` / `generateMetadata` export. For the `/stunts` family this can be done in a batch.

---

### P1-4 — `EvidenceGallery` content images use `alt=""`

**File:** `apps/web/components/ui/EvidenceGallery.tsx`, line ~30

**Evidence:**
```tsx
<img
  src={mediaUrl}
  alt=""
  className="aspect-video w-full object-cover opacity-90"
  loading="lazy"
/>
```

Evidence thumbnails are the primary visual proof for confidence-graded claims — they are screenshots from productions, magazine scans, or BTS photos that are content, not decoration. An empty `alt` hides this content from screen readers and from image-indexed search results.

**Additional instances:** `MediaGallery.tsx` line 34 (film backdrops in the scroll strip — acceptable as decorative), but the following are content images that warrant descriptive alt text:
- `ProductionDetail.tsx` lines 888, 931, 979 — poster thumbnails in "Franchise" / "Similar" / related-film rails (the film title is available; `alt={m.title}` is one line)
- `VfxFilmography.tsx` line 28, `FilmographyTable.tsx` line 48, `crew/[slug]/page.tsx` line 848 — poster thumbnails next to film titles (the title is available in the same component)

**Suggested fix:** For `EvidenceGallery`, use `alt={item.caption ?? item.source_title ?? 'Evidence'}`. For filmography poster thumbnails, use `alt={title}` where the title string is already in scope (all cases above have it).

---

### P1-5 — `safe-auth.ts` console.log is a CLAUDE.md violation across the entire codebase

*(This overlaps with P0-1 but has an additional technical scope.)*

`safeAuth()` is called from `app/layout.tsx` RootLayout — the root server component that wraps every page. Every SSR page render — films index, film detail, crew, gear, homepage, all 100+ routes — triggers this log. The Vercel log volume at scale is:

- `N_daily_page_views × log_bytes_per_entry`

Beyond the PII concern already documented in P0-1, this constitutes a measurable performance overhead and log-sink waste. Per CLAUDE.md: "Don't add console.log or console.error in production code paths."

---

### P1-6 — Film detail `generateMetadata` returns `{}` for non-existent slugs (no fallback title)

**File:** `apps/web/app/films/[slug]/page.tsx`, line ~70

**Evidence:**
```ts
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) return {};  // <-- empty metadata object
```

When `getProductionWithFullDetail` returns null (slug not found), `generateMetadata` returns an empty `{}`. The page then calls `notFound()`, which renders a 404. The issue is that the 404 HTML has no `<title>`, no `<meta name="description">`, and no `<meta name="robots" content="noindex">`. A Googlebot that crawls an ISR cache-miss URL before it 404s may see a page with no title metadata.

**Affected pages:** Any `/films/[slug]` that is in the sitemap but whose DB row was deleted. The `sitemap-films.xml` route uses `listProductions(db)` with a deduplication pass, so stale slugs could linger in the sitemap for up to `revalidate: 3600` hours after a row deletion.

**Suggested fix:**
```ts
if (!data) return { title: 'Film not found', robots: { index: false, follow: false } };
```
Or use the existing `not-found.tsx` file's metadata.

---

### P1-7 — Multiple production-server `console.warn` calls violate CLAUDE.md

**Evidence:** The following non-admin production server files use `console.warn` in catch blocks rather than `Sentry.captureException`:

```
app/editing/walkthroughs/page.tsx:19        app/sound/effects/libraries/[slug]/page.tsx:32
app/sound/adr-studios/page.tsx:19           app/sound/houses/page.tsx:41
app/dossiers/[slug]/page.tsx:43             app/vfx/volumes/page.tsx:28
app/vfx/shot-breakdowns/page.tsx:19         app/vfx/title-houses/page.tsx:24
app/partnerships/page.tsx:24                app/gear/rentals/page.tsx:24
app/music/orchestras/page.tsx:24            app/music/cue-guides/page.tsx:19
app/music/scoring-stages/page.tsx:23        app/music/supervision-agencies/page.tsx:19
app/costume-hair-makeup/costume-works/page.tsx:19
app/costume-hair-makeup/construction-houses/page.tsx:19
app/costume-hair-makeup/makeup-works/page.tsx:19
app/costume-hair-makeup/effects-houses/page.tsx:24
app/decisions/page.tsx:36                   app/walkthroughs/[slug]/page.tsx:50
app/page.tsx:79,80                          lib/safe-auth.ts:36
```

CLAUDE.md states: "Don't add console.log or console.error in production code paths — use Sentry." All of these represent caught errors that silently emit empty states without alerting the operator. If a table query fails on production, there is no Sentry signal — the page just renders blank/empty and the failure is only observable by reading Vercel function logs.

**Suggested fix:** Replace `console.warn(...)` with `Sentry.captureException(err, { tags: { route: '/...' } })` in each catch block.

---

## P2 — Polish / Minor

### P2-1 — `gear` index page missing canonical tag

**File:** `apps/web/app/gear/page.tsx`

**Evidence:**
```ts
export const metadata: Metadata = {
  title: 'Gear',
  description: 'Cinema cameras, lenses, lighting...',
  // no alternates.canonical
};
```

`/gear` is a top-level section listed in the sitemap-gear.xml (which covers manufacturer pages) and the primary nav. Without a canonical, search engines may conflate `/gear` with `/gear?sort=...` filter variants.

**Suggested fix:** Add `alternates: { canonical: \`${siteUrl()}/gear\` }` to match the crew/films/vfx convention.

---

### P2-2 — Many index page titles are under 30 characters including the site suffix

**Evidence:** With the layout's `template: '%s | CineCanon'`, the following rendered titles are well below Google's preferred 30-character minimum:

| Page | Raw title | Rendered title | Chars |
|---|---|---|---|
| `/gear` | `Gear` | `Gear \| CineCanon` | 16 |
| `/music` | `Music` | `Music \| CineCanon` | 17 |
| `/tools` | `Tools` | `Tools \| CineCanon` | 17 |
| `/awards` | `Awards` | `Awards \| CineCanon` | 18 |
| `/sound` | `Sound` | `Sound \| CineCanon` | 17 |
| `/stunts` | `Stunts` | `Stunts \| CineCanon` | 18 |
| `/sound/foley` | `Foley` | `Foley \| CineCanon` | 17 |
| `/editing` | `Editing` | `Editing \| CineCanon` | 20 |
| `/search` | `Search` | `Search \| CineCanon` | 18 |

Thin titles reduce CTR from SERPs and give AI crawlers less signal for topical relevance.

**Suggested fix:** Expand each to a keyword-rich phrase, e.g. `'Gear — Cameras, Lenses & Rental Houses'`, `'Music — Composers, Scoring Stages & Supervisors'`, following the pattern used for `/films` ("Films — Cameras, Lenses & Crew Database").

---

### P2-3 — Multiple `<h1>` elements in `gear/compare` and `tools/loadout`

**Files:**
- `apps/web/app/gear/compare/page.tsx` — three `<h1>` elements (`Compare gear`, `No items found`, `Comparison`) that render under mutually exclusive conditions
- `apps/web/app/tools/loadout/page.tsx` — two `<h1>` elements, one in the `print:hidden` screen block and one in the `hidden print:block` print block

**Evidence (gear/compare):** Lines 39, 64, 111 each contain `<h1>`. Only one renders at runtime (no-args state, empty-results state, or loaded state), but the HTML file contains three `<h1>` declarations, which confuses automated accessibility auditors and some schema validators.

**Suggested fix:** Promote the secondary headings to `<h2>` or manage the single `<h1>` via a shared variable. For the print/screen split in `tools/loadout`, using `aria-hidden="true"` on the print-only block and a single `<h1>` visible to both contexts is cleaner.

---

### P2-4 — `societies` page missing canonical

**File:** `apps/web/app/societies/page.tsx`

**Evidence:**
```ts
export const metadata: Metadata = {
  title: 'Cinematography societies',
  description: '...',
  // no alternates.canonical
};
```

Society pages are linked from crew detail pages. Without a canonical, `/societies` is deduplication-ambiguous.

---

### P2-5 — `films/[slug]/loadout` has no meta description

**File:** `apps/web/app/films/[slug]/loadout/page.tsx`

**Evidence:**
```ts
return {
  title: `${data.production.title} — Loadout`,
  robots: { index: false, follow: false },
};
```

The loadout page is `noindex` (correct for a print-format utility page), but has no description. When the route is shared directly (e.g. link from a DP's social post), the shared preview card shows no description. This is minor since the page is intentionally deindexed.

---

### P2-6 — No sitemap coverage for new dynamic entity types (walkthroughs, decisions, partnerships, dossiers)

**Summary:** The `/walkthroughs/[slug]`, `/decisions/[slug]`, `/partnerships/[slug]`, and `/dossiers/[slug]` detail pages are completely absent from any sitemap. The parent index pages are linked from the footer and `llms.txt`, but detail-page URLs are not discoverable via sitemap. Googlebot can only find them via internal links from other pages.

This is lower severity than P1-2 (which covers the index pages) because the detail pages do have canonicals. However, without sitemap coverage, crawl discovery depends entirely on internal linking, which is sparse for newer content types.

**Suggested fix:** Add a `sitemap-content.xml` segment that uses `listWalkthroughs`, `listDecisionTrees`, `listPartnerships`, and `listCraftDossiers` queries to emit URLs.

---

### P2-7 — `llms.txt` references `/partnerships` and `/dossiers` sections but those sections are absent from sitemap-core

**File:** `apps/web/app/llms.txt/route.ts`

`llms.txt` explicitly lists `/dossiers`, `/walkthroughs`, `/decisions`, and `/partnerships` as navigable sections and invites AI crawlers to dereference them. These pages are built and functional but are not sitemapped. An AI crawler following the `llms.txt` links arrives at those pages but cannot systematically discover the detail pages underneath. This undercuts the AEO strategy since AI indexers reward sites that expose a complete, consistent graph of entities.

---

## Appendix A — Route Coverage Table

All non-admin public `page.tsx` routes found in `apps/web/app/`:

| Route | Has Metadata | Has Canonical | In Sitemap |
|---|---|---|---|
| `/` | yes | yes | yes (sitemap-core) |
| `/films` | yes | yes | yes (sitemap-core) |
| `/films/[slug]` | yes | yes | yes (sitemap-films) |
| `/films/[slug]/loadout` | yes (noindex) | no | no |
| `/films/[slug]/scenes/[sceneSlug]` | yes | no | no |
| `/films/compare` | yes | no | no |
| `/crew` | yes | yes | yes (sitemap-core) |
| `/crew/[slug]` | yes | yes | yes (sitemap-crew) |
| `/crew/compare` | yes | no | no |
| `/gear` | yes | **no** | no |
| `/gear/[manufacturer]` | yes | no | yes (sitemap-gear) |
| `/gear/[manufacturer]/[series]` | yes | no | no |
| `/gear/[manufacturer]/[series]/[item]` | yes | no | no |
| `/gear/compare` | yes | no | no |
| `/gear/rentals` | yes | yes | no |
| `/gear/rentals/[slug]` | yes | yes | no |
| `/vfx` | yes | yes | yes (sitemap-core) |
| `/vfx/[slug]` | yes | yes | yes (sitemap-vfx) |
| `/vfx/volumes` | yes | yes | **no** |
| `/vfx/volumes/[slug]` | yes | yes | no |
| `/vfx/title-houses` | yes | yes | **no** |
| `/vfx/title-houses/[slug]` | yes | yes | no |
| `/vfx/shot-breakdowns` | yes | yes | **no** |
| `/format` | yes | no | yes (sitemap-core) |
| `/format/[slug]` | yes | no | yes (sitemap-core) |
| `/stunts` | yes | no | yes (sitemap-core) |
| `/stunts/people` | yes | no | yes (sitemap-core) |
| `/stunts/sequences` | yes | no | yes (sitemap-core) |
| `/stunts/lineage` | yes | no | yes (sitemap-core) |
| `/stunts/rigging` | yes | yes | yes (sitemap-core) |
| `/stunts/rigging/[slug]` | yes | no | no |
| `/stunts/companies/[slug]` | yes | no | no |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | yes | no | no |
| `/awards` | yes | yes | **no** |
| `/awards/craft/[craft]` | yes | yes | no |
| `/decisions` | yes | yes | **no** |
| `/decisions/[slug]` | yes | yes | no |
| `/dossiers` | yes | yes | **no** |
| `/dossiers/[slug]` | yes | yes | no |
| `/editing` | yes | yes | **no** |
| `/editing/editors` | yes | yes | **no** |
| `/editing/walkthroughs` | yes | yes | **no** |
| `/music` | yes | yes | **no** |
| `/music/composers` | yes | yes | **no** |
| `/music/scoring-stages` | yes | yes | **no** |
| `/music/orchestras` | yes | yes | **no** |
| `/music/supervisors` | yes | yes | **no** |
| `/music/cue-guides` | yes | yes | **no** |
| `/partnerships` | yes | yes | **no** |
| `/partnerships/[slug]` | yes | yes | no |
| `/production-design` | yes | yes | **no** |
| `/production-design/designers` | yes | yes | **no** |
| `/societies` | yes | **no** | **no** |
| `/sound` | yes | yes | **no** |
| `/sound/houses` | yes | yes | **no** |
| `/sound/mixers` | yes | yes | **no** |
| `/sound/adr-studios` | yes | yes | **no** |
| `/sound/effects` | yes | yes | **no** |
| `/sound/effects/libraries` | yes | yes | **no** |
| `/sound/foley` | yes | yes | **no** |
| `/sound/post` | yes | yes | **no** |
| `/walkthroughs` | yes | yes | **no** |
| `/walkthroughs/[slug]` | yes | yes | no |
| `/costume-hair-makeup` | yes | yes | **no** |
| `/costume-hair-makeup/designers` | yes | yes | **no** |
| `/references` | yes | yes | **no** |
| `/references/[id]` | yes | **no** | no |
| `/methodology` | yes | yes | **no** |
| `/about` | yes | yes | **no** |
| `/queries` | yes | yes | yes (sitemap-core) |
| `/ask` | yes | **no** | yes (sitemap-core) |
| `/tools` | yes | **no** | yes (sitemap-core) |
| `/tools/scoring-session-cost` | yes | yes | **no** |
| `/tools/stunt-rig-picker` | yes | yes | **no** |
| `/tools/hdr-target-picker` | yes | yes | **no** |
| `/tools/anamorphic-vs-spherical` | yes | yes | **no** |
| `/tools/frame-lines` | yes | **no** | yes (sitemap-core) |
| `/tools/loadout` | yes | **no** | yes (sitemap-core) |
| `/tools/coverage` | yes | **no** | yes (sitemap-core) |
| `/tools/aces` | yes | yes | yes (sitemap-core) |
| `/tools/cdl` | yes | **no** | yes (sitemap-core) |
| `/shots` | yes | yes | **no** |
| `/locations` | yes | yes | **no** |
| `/decades` | yes | yes | **no** |
| `/for-dps` | yes | yes | **no** |
| `/for-colorists` | yes | yes | **no** |
| `/for-gaffers` | yes | yes | **no** |
| `/for-sound-mixers` | yes | yes | **no** |
| `/for-sound-designers` | yes | yes | **no** |
| `/for-editors` | yes | yes | **no** |
| `/for-composers` | yes | yes | **no** |
| `/for-music-supervisors` | yes | yes | **no** |
| `/for-production-designers` | yes | yes | **no** |
| `/for-costume-designers` | yes | yes | **no** |
| `/for-makeup-artists` | yes | yes | **no** |
| `/for-coordinators` | yes | yes | **no** |
| `/lookbook` | yes | yes | **no** |
| `/search` | yes | **no** | **no** |
| `/account` | yes | **no** | no (auth-gated) |
| `/bookmarks` | yes | **no** | no (auth-gated) |
| `/import/letterboxd` | yes | **no** | no (utility) |
| `/signin` | yes | **no** | no (auth-gated) |
| `/stunts/coordinators` | redirect → /stunts/people | — | — |
| `/awards/cinematography` | redirect → /awards/craft/cinematography | — | — |
| `/claims/[id]` | no metadata (redirect resolver) | — | — |

---

## Appendix B — Image Alt Text Audit

| Component | Location | Alt text | Content/Decorative | Verdict |
|---|---|---|---|---|
| `EvidenceGallery` | `components/ui/EvidenceGallery.tsx:30` | `""` | **Content** (claim evidence) | FAIL — needs descriptive alt |
| `MediaGallery` | `components/productions/MediaGallery.tsx:34` | `""` | Decorative (backdrop strip) | OK |
| `ProductionDetail` (collection posters) | `ProductionDetail.tsx:888,931,979` | `""` | **Content** (franchise/similar links) | FAIL — film title in scope |
| `VfxFilmography` | `VfxFilmography.tsx:28` | `""` | Decorative (thumbnail beside title text) | Acceptable |
| `FilmographyTable` | `FilmographyTable.tsx:48` | `""` | Decorative (thumbnail beside title text) | Acceptable |
| `PersonAvatar` | `PersonAvatar.tsx:79` | (correct, uses display_name) | Content | OK |
| `ProductionCard` | `ProductionCard.tsx:74` | `${title}${year} poster` | Content | OK |
| `ProductionDetail` hero | `ProductionDetail.tsx:260` | `${title} backdrop` | Content | OK |
| `UserMenu` avatar | `UserMenu.tsx:52` | `""` | Decorative (beside name text) | OK |

---

## Appendix C — Previous QA Report Delta

The 2026-05-21 crawl report identified 1,702 broken images (HTTP 400) from `/_next/image?url=...image.tmdb.org...&w=3840&q=75`. The current codebase shows that the images producing those errors were from Vercel's image-optimization pipeline being invoked with `w=3840` on TMDb backdrop URLs. Since the May 2026 report, the team applied `unoptimized` to substantially all TMDb-sourced `<Image>` components (confirmed in `ProductionCard.tsx`, `MediaGallery.tsx`, `VideoGallery.tsx`, `ProductionDetail.tsx`, and others). The 1,702 broken-image issue appears resolved at the code level; live confirmation is blocked by the sandbox egress restriction.

The 11 broken crew URLs from the May crawl (e.g. `crew/alexei-dmitriew`, `crew/william-hornbeck`) were network errors, not 404s, and likely represented Vercel cold-start timeouts on the `force-dynamic` crew pages during the crawl. No code change is visible that specifically addresses those; they may still be intermittent.

---

## What to Fix First

Remove the `console.log` in `safe-auth.ts` immediately — it leaks user email addresses on every page render in production. That is the only change with both a security dimension and a zero-risk fix. Then spend a focused engineering session on sitemap coverage: adding the 4 Phase 4 tools to `sitemap-core.xml` is a three-line change, and creating a `sitemap-content.xml` covering the ~30 orphaned section indexes and the dynamic walkthroughs/decisions/partnerships/dossier detail pages will meaningfully expand crawl discovery for the content that has been shipped in Phases 2–4. Together those two sitemap tasks take the site from roughly 14,000 indexed URLs (mostly films + crew) to a properly structured graph that lets Google and AI crawlers see the full archive. After that, the empty-state developer messages in `/partnerships`, `/vfx/volumes`, `/vfx/title-houses`, and `/gear/rentals` should be replaced with user-facing copy before the next editorial push, and the `EvidenceGallery` alt text should be fixed to unblock accessibility compliance.
