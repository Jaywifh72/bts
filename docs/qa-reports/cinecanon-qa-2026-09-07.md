# CineCanon QA Sweep — 2026-09-07

**Sweep type:** Static repository analysis (live crawl blocked — see constraint note below)
**Repo:** /home/user/bts, branch `master`
**Analyst:** Claude Sonnet 4.6 (QA agent)

---

## CONSTRAINT ON THIS REPORT

**cinecanon.com is blocked by the session's network egress policy (403 CONNECT refused on all outbound HTTPS to that domain).** No live HTTP status checks, asset HEAD requests, or rendered-HTML inspection were possible. Every finding below is sourced entirely from static analysis of the repository source code at `/home/user/bts`. Severity ratings and the "Appendix" table reflect code-inferred status only. A complementary live crawl from an unrestricted network is required to confirm or clear the P0 section.

---

## Summary

Pages analyzed: 133 public-facing route files (non-admin, non-auth) identified in `apps/web/app/`. Live HTTP status: unavailable (egress blocked).

| Severity | Count | Description |
|---|---|---|
| P0 — Broken | 0 confirmed + 1 process constraint | No broken pages identified from code; live verification impossible |
| P1 — Degraded | 8 findings | Sitemap gaps, console-vs-Sentry violations, missing canonicals, missing JSON-LD, missing OG images, empty alt on content images, unoptimized images, /ask metadata failures |
| P2 — Polish | 7 findings | Title/description length, orphaned /lookbook, Phase 4 tools not in sitemap, gear dynamic pages missing canonical |

---

## P0 — Broken

**P0-0: Live crawl not possible — egress blocked**

Severity: P0 on process, not on site content.
All HTTP status checks (4xx, 5xx, redirect chains, asset HEAD requests, mixed-content detection) require a live crawl that could not be completed from this environment. The network egress proxy returns 403 CONNECT refused for cinecanon.com. Rerun this sweep from an unrestricted network (Vercel preview URL, local tunnel, or CI with outbound egress) to complete P0 coverage.

No code-level dead pages, unresolved imports, or guaranteed 5xx conditions were found during the static analysis.

---

## P1 — Degraded

**P1-1: 54 published routes absent from every sitemap**

The sitemap index at `/sitemap.xml` points to five sub-sitemaps: `sitemap-core.xml`, `sitemap-films.xml`, `sitemap-crew.xml`, `sitemap-gear.xml`, `sitemap-vfx.xml`. Together these cover the homepage, films, crew, gear items, and VFX houses — but 54 additional routes with real pages are absent from all five.

High-value missing routes (these are prominent nav/footer destinations with own metadata and JSON-LD):

- `/music`, `/music/composers`, `/music/scoring-stages`, `/music/orchestras`, `/music/supervisors`
- `/sound`, `/sound/adr-studios`, `/sound/houses`, `/sound/effects`, `/sound/foley`, `/sound/effects/libraries`
- `/awards` (in main nav)
- `/references` (in main nav as "Sources")
- `/about`, `/methodology`
- `/decisions`, `/walkthroughs`, `/dossiers`, `/partnerships`
- `/decades`, `/locations`, `/societies`, `/shots`
- `/editing`, `/editing/walkthroughs`, `/editing/editors`
- `/costume-hair-makeup`, `/production-design`, `/costume-hair-makeup/designers`, `/costume-hair-makeup/effects-houses`, `/production-design/designers`
- `/stunts/companies`, `/stunts/schools` (sub-pages of the /stunts family — note: /stunts/people, /stunts/rigging, /stunts/safety, /stunts/sequences, /stunts/lineage are correctly in sitemap-core)
- `/vfx/volumes`, `/vfx/title-houses`, `/vfx/shot-breakdowns`
- `/gear/rentals`, `/equipment/specs`
- 12 `/for-[role]` pages: /for-dps, /for-colorists, /for-gaffers, /for-sound-mixers, /for-sound-designers, /for-composers, /for-music-supervisors, /for-editors, /for-production-designers, /for-costume-designers, /for-makeup-artists, /for-coordinators
- 4 Phase 4 tools: `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`

These pages are discoverable via internal links (nav, footer), so they are not dead. But without sitemap entries Google relies solely on crawl link-following and cannot prioritize them for re-crawl after updates.

File to edit: `apps/web/app/sitemap-core.xml/route.ts`

---

**P1-2: 35 console.warn / console.error calls in production page handlers**

CLAUDE.md says explicitly: "Don't add console.log or console.error in production code paths — use Sentry." These calls suppress observable error signals: Sentry does not capture them, so on-call operators have no alert when these code paths fail.

Files with violations (non-exhaustive):

- `app/page.tsx` (2 instances — homepage corrections/citations queries)
- `app/editing/walkthroughs/page.tsx`
- `app/sound/effects/libraries/[slug]/page.tsx` (3 instances)
- `app/sound/adr-studios/[slug]/page.tsx`, `app/sound/adr-studios/page.tsx`
- `app/sound/houses/page.tsx`
- `app/dossiers/[slug]/page.tsx`
- `app/vfx/volumes/page.tsx`, `app/vfx/volumes/[slug]/page.tsx`
- `app/vfx/shot-breakdowns/page.tsx`, `app/vfx/title-houses/page.tsx`, `app/vfx/title-houses/[slug]/page.tsx`
- `app/production-design/works/page.tsx`
- `app/partnerships/page.tsx`, `app/partnerships/[slug]/page.tsx`
- `app/gear/rentals/page.tsx`, `app/gear/rentals/[slug]/page.tsx`
- `app/music/cue-guides/page.tsx`

Pattern: these are all defensive try/catch blocks guarding against missing migrations, and the `console.warn` was used as a cheap fallback. They should use `Sentry.captureException(err, { extra: { context: '...' } })`.

---

**P1-3: /gear and /stunts index pages lack canonical tags**

`apps/web/app/gear/page.tsx` and `apps/web/app/stunts/page.tsx` both export `metadata` without an `alternates.canonical` field. The gear index page accepts filter querystrings (`?kind=camera`, `?kind=lens`), and without a canonical these variants could split PageRank. Stunts is the same pattern. Every other major section index (films, crew, vfx, awards, music, sound, about, methodology) has a canonical.

---

**P1-4: /stunts index page has no JSON-LD structured data**

`apps/web/app/stunts/page.tsx` emits no JSON-LD. All peer section index pages (films, crew, gear, vfx, awards, music, sound, references, dossiers, walkthroughs) do emit at minimum a `CollectionPage` or `ItemList` block. The omission means the stunts section — which CLAUDE.md identifies as CineCanon's most differentiating dataset — gets no AEO/GEO structured-data signal.

---

**P1-5: Eight high-traffic section index pages lack opengraph-image files**

The following section roots have no `opengraph-image.tsx` (nor a static `opengraph-image.png`):

`/gear`, `/vfx`, `/stunts`, `/awards`, `/music`, `/sound`, `/tools`, `/about`

Films and crew detail pages have proper per-entity OG cards (1200×630 via `ImageResponse`). Section index pages fall back to Next.js's default (typically none, or the layout-level OG image if one were defined — the root layout defines none). Social shares of these URLs will render without a preview image.

---

**P1-6: Empty alt text on linked film-poster content images**

`alt=""` is used on film poster `<Image>` components that sit inside `<Link>` elements whose visible text is the film title. WCAG 2.2 SC 1.1.1 permits `alt=""` on decorative images, but in this pattern a screen reader user following the link hears only the anchor text (which is present), so it is technically compliant. However Google's image crawler also uses alt text for reverse-image signal, and the pattern effectively hides the relationship between poster and film from image search.

Affected files and contexts:

- `app/vfx/[slug]/page.tsx` line 172 — film poster in VFX house filmography cards
- `app/gear/[manufacturer]/[series]/page.tsx` line 268 — film poster in gear filmography
- `app/crew/[slug]/page.tsx` line 848 — film poster in "Known for" cards
- `app/format/[slug]/page.tsx` line 96 — film poster in format filmography
- `app/ask/page.tsx` line 254 — result poster thumbnail

---

**P1-7: 11 Next.js Image components use `unoptimized` prop in production pages**

The `unoptimized` prop bypasses Vercel's image CDN: images are served at full upstream resolution (TMDb `w342`/`w500` crops, YouTube thumbnails, Wikimedia photos) without on-demand resizing, format conversion (WebP/AVIF), or CDN caching. Affected pages:

`films/compare`, `stunts/rigging/[slug]`, `stunts/companies/[slug]`, `stunts/page`, `vfx/[slug]`, `format/[slug]`, `ask`, `gear/[manufacturer]/[series]`, `gear/[manufacturer]/[series]/[item]`, `gear/compare`, `crew/[slug]`

The comment in `next.config.mjs` explains the rationale (keyframe URLs that don't pass `remotePatterns` validation), but the fix should be to add the missing hostnames to `remotePatterns` rather than opting out of optimization globally per component.

---

**P1-8: /ask page has three metadata defects simultaneously**

`apps/web/app/ask/page.tsx` is CineCanon's primary natural-language interface — it is in the main nav and in sitemap-core with priority 0.7 — yet:

- **Title**: "Ask anything | CineCanon" = 24 characters (below the 30-char minimum; Google may rewrite it).
- **Canonical**: no `alternates.canonical` field. The page accepts a `?q=` querystring, meaning every query URL (`/ask?q=roger+deakins`) is a distinct uncanonicalized URL that could be indexed.
- **Description**: 193 characters (above the 160-char recommended maximum; Google will truncate in SERPs).

---

## P2 — Polish

**P2-1: Title too short (<30 chars) on 9 section pages**

These titles render via the `'%s | CineCanon'` template, giving the final rendered title in parentheses:

| Page | Raw Title | Rendered Title | Length |
|---|---|---|---|
| /gear | Gear | Gear \| CineCanon | 16 |
| /stunts | Stunts | Stunts \| CineCanon | 18 |
| /awards | Awards | Awards \| CineCanon | 18 |
| /music | Music | Music \| CineCanon | 17 |
| /sound | Sound | Sound \| CineCanon | 17 |
| /decades | By decade | By decade \| CineCanon | 21 |
| /ask | Ask anything | Ask anything \| CineCanon | 24 |
| /for-colorists | For Colorists | For Colorists \| CineCanon | 25 |
| /for-gaffers | For Gaffers | For Gaffers \| CineCanon | 23 |

Google's recommended range is 30–60 characters. Short titles are more likely to be rewritten in SERPs.

---

**P2-2: Title too long (>60 chars) on 2 pages**

| Page | Rendered Title | Length |
|---|---|---|
| /vfx | VFX Houses — Studios, Boutique & In-House Facilities \| CineCanon | 64 |
| /about | About CineCanon — Sources, Curation & Citation Tiers \| CineCanon | 64 |

---

**P2-3: Meta description outside 120–160 char range on 10 pages**

| Page | Length | Status |
|---|---|---|
| /awards | 274 | Too long |
| /ask | 193 | Too long |
| /sound | 170 | Too long |
| /stunts | 162 | Too long |
| /films | 163 | Too long |
| /layout default | 161 | Borderline long |
| /music | 80 | Too short |
| /about | 115 | Too short |
| /locations | 112 | Too short |
| /decades | 61 | Too short |

---

**P2-4: Phase 4 tools not in sitemap-core**

The four tools shipped in the most recent Phase 4 sprint — `/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical` — each have correct `alternates.canonical` and page metadata, but none appear in `sitemap-core.xml/route.ts`. The parent `/tools` is in sitemap; the children are not. Add four entries to sitemap-core.

---

**P2-5: /lookbook is an orphaned page**

`app/lookbook/page.tsx` has correct metadata and a canonical, but is linked only from a single sentence on `/shots` (`→ /lookbook`). It does not appear in the top nav, the footer, any sitemap, or the `llms.txt`. Visitors and crawlers arriving via sitemap or nav have no path to it.

---

**P2-6: Gear manufacturer and series dynamic pages lack canonical tags**

`app/gear/[manufacturer]/page.tsx` and `app/gear/[manufacturer]/[series]/page.tsx` both return `generateMetadata` results without an `alternates.canonical` field. Their peer `/gear/[manufacturer]/[series]/[item]/page.tsx` similarly lacks a canonical. Without it, any querystring parameter appended by an analytics tracker or referrer creates an uncanonicalized variant.

---

**P2-7: /societies page lacks canonical tag**

`app/societies/page.tsx` exports metadata without `alternates.canonical`. Its peers — decades, locations, shots, walkthroughs, dossiers, decisions, partnerships — all have canonicals. Societies is the odd one out.

---

## Appendix — Route Status Table (repo-derived)

Status codes are inferred from code analysis only. "200-expected" means the route handler exists, data queries are present, and no `notFound()` call fires on a baseline request. "noindex" means the page's metadata includes `robots: { index: false }`. Live verification required.

| URL | Code-inferred Status | Notes |
|---|---|---|
| / | 200-expected | h1 present, JSON-LD, canonical, OG card |
| /films | 200-expected | canonical, JSON-LD, h1 via PageHero |
| /films/[slug] | 200-expected | canonical, JSON-LD, OG image, `notFound()` on missing slug |
| /crew | 200-expected | canonical, JSON-LD, h1 via PageHero |
| /crew/[slug] | 200-expected | canonical, JSON-LD, OG image; noindex if <8 credits and no bio |
| /gear | 200-expected | JSON-LD present; **missing canonical** |
| /gear/[manufacturer] | 200-expected | **missing canonical** |
| /gear/[manufacturer]/[series] | 200-expected | **missing canonical** |
| /gear/[manufacturer]/[series]/[item] | 200-expected | **missing canonical** |
| /gear/compare | 200-expected | Multiple h1 in conditional branches (one rendered at a time) |
| /gear/rentals | 200-expected | Not in sitemap |
| /gear/rentals/[slug] | 200-expected | Not in sitemap |
| /vfx | 200-expected | canonical, JSON-LD, h1 via PageHero |
| /vfx/[slug] | 200-expected | canonical, JSON-LD; `alt=""` on poster images |
| /vfx/volumes | 200-expected | Not in sitemap; defensive console.warn |
| /vfx/volumes/[slug] | 200-expected | Not in sitemap; console.warn |
| /vfx/title-houses | 200-expected | Not in sitemap; console.warn |
| /vfx/title-houses/[slug] | 200-expected | Not in sitemap; console.warn |
| /vfx/shot-breakdowns | 200-expected | Not in sitemap; console.warn |
| /stunts | 200-expected | **missing canonical, missing JSON-LD**; not in sitemap |
| /stunts/people | 200-expected | In sitemap-core |
| /stunts/sequences | 200-expected | In sitemap-core |
| /stunts/lineage | 200-expected | In sitemap-core |
| /stunts/rigging | 200-expected | In sitemap-core |
| /stunts/safety | 200-expected | In sitemap-core |
| /stunts/companies | 200-expected | Not in sitemap |
| /stunts/companies/[slug] | 200-expected | Not in sitemap |
| /stunts/schools | 200-expected | Not in sitemap |
| /stunts/schools/[slug] | 200-expected | Not in sitemap |
| /stunts/sequences/[productionSlug]/[sequenceSlug] | 200-expected | Not in sitemap |
| /stunts/rigging/[slug] | 200-expected | Not in sitemap |
| /stunts/safety/[slug] | 200-expected | Not in sitemap |
| /awards | 200-expected | canonical, JSON-LD; not in sitemap; description 274 chars |
| /awards/cinematography | 200-expected | Not in sitemap |
| /awards/craft/[craft] | 200-expected | Not in sitemap |
| /music | 200-expected | canonical, JSON-LD; not in sitemap; description 80 chars |
| /music/composers | 200-expected | Not in sitemap |
| /music/scoring-stages | 200-expected | Not in sitemap |
| /music/orchestras | 200-expected | Not in sitemap |
| /music/supervisors | 200-expected | Not in sitemap |
| /music/cue-guides | 200-expected | Not in sitemap; console.warn |
| /music/scores/[productionSlug] | 200-expected | Not in sitemap |
| /music/cues/[productionSlug]/[cueSlug] | 200-expected | Not in sitemap |
| /music/orchestras/[slug] | 200-expected | Not in sitemap |
| /music/scoring-stages/[slug] | 200-expected | Not in sitemap |
| /music/supervision-agencies | 200-expected | Not in sitemap |
| /music/supervision-agencies/[slug] | 200-expected | Not in sitemap |
| /sound | 200-expected | canonical, JSON-LD; not in sitemap |
| /sound/mixers | 200-expected | Not in sitemap |
| /sound/designers | 200-expected | Not in sitemap |
| /sound/foley | 200-expected | Not in sitemap |
| /sound/post | 200-expected | Not in sitemap |
| /sound/adr-studios | 200-expected | Not in sitemap; console.warn |
| /sound/adr-studios/[slug] | 200-expected | Not in sitemap; console.warn |
| /sound/houses | 200-expected | Not in sitemap; console.warn |
| /sound/houses/[slug] | 200-expected | Not in sitemap |
| /sound/effects | 200-expected | Not in sitemap |
| /sound/effects/libraries | 200-expected | Not in sitemap; console.warn |
| /sound/effects/libraries/[slug] | 200-expected | Not in sitemap; console.warn |
| /editing | 200-expected | Not in sitemap |
| /editing/editors | 200-expected | Not in sitemap |
| /editing/walkthroughs | 200-expected | Not in sitemap; console.warn |
| /production-design | 200-expected | Not in sitemap |
| /production-design/designers | 200-expected | Not in sitemap |
| /production-design/works | 200-expected | Not in sitemap; console.warn |
| /costume-hair-makeup | 200-expected | Not in sitemap |
| /costume-hair-makeup/designers | 200-expected | Not in sitemap |
| /costume-hair-makeup/effects-houses | 200-expected | Not in sitemap |
| /costume-hair-makeup/effects-houses/[slug] | 200-expected | Not in sitemap |
| /costume-hair-makeup/costume-works | 200-expected | Not in sitemap |
| /costume-hair-makeup/makeup-works | 200-expected | Not in sitemap |
| /costume-hair-makeup/construction-houses | 200-expected | Not in sitemap |
| /costume-hair-makeup/construction-houses/[slug] | 200-expected | Not in sitemap |
| /dossiers | 200-expected | canonical; not in sitemap |
| /dossiers/[slug] | 200-expected | canonical; not in sitemap; console.warn |
| /walkthroughs | 200-expected | canonical; not in sitemap |
| /walkthroughs/[slug] | 200-expected | canonical, JSON-LD; not in sitemap |
| /decisions | 200-expected | canonical; not in sitemap |
| /decisions/[slug] | 200-expected | canonical; not in sitemap |
| /partnerships | 200-expected | canonical; not in sitemap; console.warn |
| /partnerships/[slug] | 200-expected | not in sitemap; console.warn |
| /societies | 200-expected | **missing canonical**; not in sitemap |
| /societies/[slug] | 200-expected | Not in sitemap |
| /decades | 200-expected | canonical; not in sitemap |
| /decades/[decade] | 200-expected | Not in sitemap |
| /locations | 200-expected | canonical; not in sitemap |
| /locations/[id] | 200-expected | Not in sitemap |
| /format | 200-expected | In sitemap-core |
| /format/[slug] | 200-expected | In sitemap-core; `alt=""` on poster images |
| /shots | 200-expected | canonical; not in sitemap |
| /lookbook | 200-expected | canonical; not in sitemap; not in nav/footer — orphaned |
| /references | 200-expected | canonical, JSON-LD; not in sitemap |
| /references/[id] | 200-expected | Not in sitemap |
| /claims/[id] | 200-expected | Not in sitemap |
| /ask | 200-expected | In sitemap-core; **missing canonical**; title 24 chars; description 193 chars |
| /tools | 200-expected | In sitemap-core |
| /tools/frame-lines | 200-expected | In sitemap-core |
| /tools/loadout | 200-expected | In sitemap-core |
| /tools/coverage | 200-expected | In sitemap-core |
| /tools/aces | 200-expected | In sitemap-core |
| /tools/cdl | 200-expected | In sitemap-core |
| /tools/scoring-session-cost | 200-expected | canonical; **not in sitemap** |
| /tools/stunt-rig-picker | 200-expected | canonical; **not in sitemap** |
| /tools/hdr-target-picker | 200-expected | canonical; **not in sitemap** |
| /tools/anamorphic-vs-spherical | 200-expected | canonical; **not in sitemap** |
| /about | 200-expected | canonical, JSON-LD; not in sitemap |
| /methodology | 200-expected | not in sitemap |
| /queries | 200-expected | canonical; in footer |
| /queries/alexa65-sphero | 200-expected | In sitemap-core |
| /queries/dune-part-two-lenses | 200-expected | In sitemap-core |
| /queries/magic-hour-2023 | 200-expected | In sitemap-core |
| /for-dps | 200-expected | canonical; not in sitemap |
| /for-colorists | 200-expected | canonical; not in sitemap |
| /for-gaffers | 200-expected | canonical; not in sitemap |
| /for-sound-mixers | 200-expected | canonical; not in sitemap |
| /for-sound-designers | 200-expected | canonical; not in sitemap |
| /for-composers | 200-expected | canonical; not in sitemap |
| /for-music-supervisors | 200-expected | canonical; not in sitemap |
| /for-editors | 200-expected | canonical; not in sitemap |
| /for-production-designers | 200-expected | canonical; not in sitemap |
| /for-costume-designers | 200-expected | canonical; not in sitemap |
| /for-makeup-artists | 200-expected | canonical; not in sitemap |
| /for-coordinators | 200-expected | canonical; not in sitemap |
| /equipment/specs | 200-expected | canonical; not in sitemap |
| /search | 200-expected | noindex (correct) |
| /bookmarks | 200-expected | noindex (correct) |
| /account | 200-expected | auth-gated |
| /signin | 200-expected | auth utility |
| /import/letterboxd | 200-expected | not in nav or sitemap; utility page |
| /robots.txt | 200-expected | served by Next.js robots.ts; correct disallow on /admin/ |
| /sitemap.xml | 200-expected | sitemap index pointing to 5 sub-sitemaps |
| /llms.txt | 200-expected | dynamically generated; correct Content-Type |
| /digest.xml | 200-expected | Atom feed |
| /api/v1 | 200-expected | discovery doc |
| /api/v1/productions/[slug] | 200-expected | public, CC-BY 4.0 |
| /api/v1/crew/[slug] | 200-expected | public, CC-BY 4.0 |
| /api/health | 200-expected | health probe |

---

## What I'd Fix First

The single highest-ROI fix is expanding `sitemap-core.xml/route.ts` to include the 54 missing routes, prioritizing the major section index pages that carry their own JSON-LD and are already linked from the top nav and footer: `/music`, `/sound`, `/awards`, `/references`, `/about`, `/methodology`, `/decisions`, `/walkthroughs`, `/dossiers`, `/partnerships`, `/decades`, `/locations`, and the four Phase 4 tools. These pages have correct metadata and structured data but are invisible to Googlebot's sitemap-driven crawl scheduling, undermining the entire AEO/GEO/SEO investment described in CLAUDE.md. The sitemap expansion is a one-file edit that costs nothing in runtime performance and immediately broadens the surface area that AI citation engines and search crawlers can discover and recrawl on a predictable schedule. Once sitemaps are current, the second-highest-value fix is replacing the 35 `console.warn`/`console.error` calls in production page handlers with `Sentry.captureException` per the existing repo convention — those pages are silently swallowing errors from recently-shipped features (LED volumes, title-sequence houses, craft dossiers, partnerships, gear rental houses) that have no on-call visibility if their underlying DB queries begin failing in production.
