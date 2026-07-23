# CineCanon QA Sweep — 2026-06-15

**Scope:** Code-based inspection of the production site repo at `/home/user/bts` (branch `master`). The live site at `https://cinecanon.com` is unreachable from this environment — all HTTP requests return `403 x-deny-reason: host_not_allowed` via the Anthropic Egress Gateway TLS proxy. Accordingly, this report is derived entirely from static analysis of the Next.js App Router source (`apps/web/`), prior QA reports (`docs/qa-reports/`), and crawlability logic. **Live HTTP statuses, actual page weights, and rendered-HTML checks cannot be performed** — that limitation is documented per section.

Previous reports: `docs/qa-reports/cinecanon-qa-2026-05-20.md` and `cinecanon-qa-full-crawl-2026-05-21.md`.

---

## Summary

| Metric | Value |
|---|---|
| Route files inspected | ~200 page.tsx + route.ts files across apps/web/app |
| Prior P0 defects resolved since 2026-05-20 | 5 of 5 |
| Prior P1 defects resolved | 4 of 6 |
| Prior P2 defects resolved | 2 of 5 |
| **P0 — Broken (new)** | **0** |
| **P1 — Degraded (new)** | **7** |
| **P2 — Polish (new)** | **6** |

**Previously reported issues now fixed:** `/dossiers`, `/walkthroughs`, `/sound/mixers`, `/sound/designers`, `/stunts/coordinators`, `/stunts/companies`, `/awards/cinematography` all now have routes. Homepage canonical tag added. Film-page `truncateForMeta(155)` applied. Sitemap film deduplication added. Crew sitemap raised from 1,000 to 50,000 cap. Admin link hidden from anonymous users.

---

## P0 — Broken

No new P0 defects found in this sweep. All previously reported 404 pages have been resolved. The live HTTP check could not be performed due to network access restrictions, so runtime failures (5xx, connection errors, cold-start timeouts) cannot be excluded.

---

## P1 — Degraded

**P1-1: @tailwindcss/typography not installed; `prose` classes silently no-op on three public pages**

The `tailwind.config.ts` has `plugins: []` and `@tailwindcss/typography` is absent from `package.json`. However, three public-facing pages use Tailwind `prose` classes:

- `apps/web/app/methodology/page.tsx` — `className="prose prose-invert prose-zinc max-w-3xl"` plus `not-prose` on several child sections.
- `apps/web/app/about/page.tsx` — `className="prose-zinc max-w-2xl"` on the wrapping `<article>`.
- `apps/web/app/sound/foley/page.tsx`, `sound/post/page.tsx`, `sound/effects/page.tsx` — `className="prose prose-invert prose-sm max-w-3xl text-zinc-300"` on body-text divs.

Without the plugin, all `prose-*` class names are undefined and Tailwind emits zero CSS for them. The `/methodology` page is the most severely affected — it uses `not-prose` overrides on multiple child `<dl>`, `<ul>`, and `<pre>` blocks, meaning those overrides also no-op. The page still renders because each element has explicit Tailwind utility classes, but heading sizes, list styling, and link decoration differ from editorial intent.

**P1-2: Four Phase 4 tool pages are missing from all sitemaps**

The CLAUDE.md "In flight" note confirms Phase 4 tools just landed. `sitemap-core.xml` lists five pre-existing tools (`/tools/frame-lines`, `/tools/loadout`, `/tools/coverage`, `/tools/aces`, `/tools/cdl`) but the four new ones are absent:

- `/tools/scoring-session-cost`
- `/tools/stunt-rig-picker`
- `/tools/hdr-target-picker`
- `/tools/anamorphic-vs-spherical`

These pages have full metadata and are linked from `/tools/page.tsx`, but search engines have no sitemap signal. They will eventually be discovered via crawl, but omitting them from a `changefreq: monthly` sitemap entry costs weeks of indexing lag.

**P1-3: Eight additional high-value pages missing from all five sitemaps**

The sitemap index (`/sitemap.xml`) references only five child sitemaps: core, films, crew, gear, vfx. The following content-rich pages appear in `llms.txt`, the footer nav, and internal links but are in no sitemap:

- `/walkthroughs` and `/walkthroughs/[slug]` (Phase 3 annotated walkthroughs)
- `/dossiers` and `/dossiers/[slug]` (Phase 2 craft dossiers)
- `/decisions` and `/decisions/[slug]` (decision trees with ClaimReview JSON-LD)
- `/partnerships` and `/partnerships/[slug]` (with ClaimReview JSON-LD)
- `/lookbook`
- `/shots`
- `/awards` (only the index; no award sub-pages)
- `/about`, `/methodology`

Walkthroughs, decisions, and partnerships pages emit `ClaimReview` JSON-LD — the site's primary AEO/GEO differentiator. Missing from sitemaps means these structured-data pages get no crawl-budget priority signal.

**P1-4: `console.error`, `console.warn`, and `console.log` calls in 36 production server-component paths**

CLAUDE.md explicitly states "Don't add console.log or console.error in production code paths — use Sentry." The policy is violated in 36 locations in non-admin `app/` routes and `lib/` files. Key examples:

- `app/page.tsx:79-80` — `console.error('[homepage] listRecentlyResolvedCorrections failed', e)` — fires on the homepage for every visitor if the DB query fails.
- `app/dossiers/[slug]/page.tsx:43` — `console.warn(e)` bare (no context label) on query failure.
- `app/sound/adr-studios/[slug]/page.tsx:28` — `console.warn(e)` bare.
- `app/api/search/nl/route.ts:78` — `console.error('theme embed failed...')` in the search API.
- Multiple sound, VFX, music, partnership, gear-rental sub-pages.

These produce Vercel function log noise and in some edge cases may leak query errors or schema details into structured log aggregators. Sentry is in the stack (`@sentry/nextjs`) and should receive these instead.

**P1-5: `/account` page has no `robots: noindex` and no meta description**

`app/account/page.tsx` sets `metadata: { title: 'Account' }` — no description, no `robots` directive. The page correctly redirects unauthenticated users (auth gating via `redirect('/signin?callbackUrl=/account')`) but Google can still crawl the sign-in redirect target chain and index the 307 redirect. Bookmarks page correctly sets `robots: { index: false, follow: false }`. Account should match.

**P1-6: `crew/[slug]` pages with zero biography yield no `<meta name="description">`**

When `person.biography` is `null` or shorter than 80 characters (the threshold for `isIndexable`), `generateMetadata` returns `description: person.biography ?? undefined`. Crew pages that pass the indexability gate via `filmography.length >= 8` (eight or more credits) but have `biography = null` will be indexed by Google with no description tag. Google synthesizes a snippet in that case, which is typically weaker than an authored one. This affects a significant portion of the ~12k crew profiles.

**P1-7: `MediaGallery` serves TMDb backdrop images with `alt=""`**

`components/productions/MediaGallery.tsx` renders a horizontal strip of TMDb backdrop images (up to 8 per film) with `alt=""`. These are full-size content images (rendered at `w-72` / 288px wide, `aspect-[16/9]`), not decorative thumbnails. An empty `alt` on a content image with meaningful visual content fails WCAG 2.2 SC 1.1.1 (Non-text Content). The images carry no surrounding caption in the component. Using `alt={\`Backdrop from ${productionTitle}${scene ? ': ' + scene : ''}\`}` would be a minimal fix.

---

## P2 — Polish

**P2-1: `about/page.tsx` meta description is 115 characters — below the 120-char recommended floor**

The description "How CineCanon sources its data, what is hand-curated, what comes from TMDb, and how to read the technical metadata." is 115 characters. The QA spec floor is 120. A modest expansion to include "confidence grades" or a mention of the citation system would bring it into range without approaching the 160-char ceiling.

**P2-2: Root layout `description` is 161 characters — one character over the 160-char ceiling**

The default description in `app/layout.tsx` — "Cited, confidence-graded technical data on every film — cameras, lenses, lighting, color, sound, music, stunts, and VFX — for working camera-department pros." — is 161 characters. Google truncates around 158–160 on desktop. This is a one-character trim fix.

**P2-3: Film page titles can exceed 60 characters for long titles**

The film metadata template produces `${title} (${year}) — Cameras, Lenses & Crew | CineCanon`. For a title like "The Adventures of Priscilla, Queen of the Desert (1994)" the full title tag reaches 95 characters before Google truncation kicks in at around 60. The title template (`app/films/[slug]/page.tsx:83`) does not cap the film title portion. Adding `truncateForMeta(title, 35)` for the title itself — or using a shorter suffix — would prevent SERP truncation on long-named films.

**P2-4: `/api/v1` discovery doc omits the `/api/v1/crew/[slug]` endpoint**

`app/api/v1/route.ts` lists `production` and `search_suggest` endpoints plus three AEO endpoints, but does not mention `/api/v1/crew/{slug}` — which exists (`app/api/v1/crew/[slug]/route.ts`), backs the crew OG image route, and is a genuinely useful public endpoint. This is a documentation gap that reduces API discoverability for third-party consumers and AI crawlers reading `llms.txt`.

**P2-5: Nine tool pages lack JSON-LD structured data**

All nine `/tools/*` pages (`aces`, `anamorphic-vs-spherical`, `cdl`, `coverage`, `frame-lines`, `hdr-target-picker`, `loadout`, `scoring-session-cost`, `stunt-rig-picker`) have no `<JsonLd>` block. Tool pages are the kind of utility content that AI engines (Perplexity, ChatGPT) love to surface in direct-answer contexts. A minimal `SoftwareApplication` or `HowTo` schema block with `name`, `description`, and `applicationCategory: "Utility"` would make them structured-data-eligible.

**P2-6: `/films/[slug]/badge/route.ts` embed snippet has a typo — `https://cinecanon` instead of `https://cinecanon.com`**

The JSDoc embed example at `apps/web/app/films/[slug]/badge/route.ts:12` reads `<iframe src="https://cinecanon/films/<slug>/badge"` — missing `.com`. This is in a code comment, not rendered HTML, but any developer copying the embed snippet will get a broken URL.

---

## Appendix — URL × Status Table

This table covers routes confirmed to exist in the codebase. Live HTTP status codes are not available from this environment; entries marked `200 (code)` are confirmed by route file presence and `notFound()` guards; `SSR` indicates server-rendered with DB dependency.

| URL | Status | Notes |
|---|---|---|
| `/` | 200 (code) | ISR, revalidate=3600 |
| `/robots.txt` | 200 (code) | Next.js `robots.ts` route |
| `/sitemap.xml` | 200 (code) | Sitemap index → 5 child sitemaps |
| `/sitemap-core.xml` | 200 (code) | Static + format slugs; 4 Phase 4 tools missing |
| `/sitemap-films.xml` | 200 (code) | DB-driven; dedup added |
| `/sitemap-crew.xml` | 200 (code) | DB-driven; limit=50000 |
| `/sitemap-gear.xml` | 200 (code) | DB-driven; manufacturers + series + items |
| `/sitemap-vfx.xml` | 200 (code) | DB-driven; VFX houses only |
| `/llms.txt` | 200 (code) | DB-driven; lists walkthroughs/dossiers/decisions not in sitemap |
| `/digest.xml` | 200 (code) | Atom 1.0; revalidate=3600 |
| `/api/v1` | 200 (code) | Crew endpoint undocumented |
| `/api/v1/productions/[slug]` | 200/404 (code) | CC-BY, edge-cached |
| `/api/v1/crew/[slug]` | 200/404 (code) | Undocumented in discovery doc |
| `/api/v1/aeo/claims` | 200 (code) | SSR |
| `/api/v1/aeo/digest.xml` | 200 (code) | Atom feed of high-confidence claims |
| `/films` | 200 (code) | ISR, DB-driven |
| `/films/[slug]` | 200/404 (code) | ISR revalidate=86400; ClaimReview + Movie JSON-LD |
| `/films/[slug]/opengraph-image` | 200 (code) | Edge runtime; fetches /api/v1 |
| `/films/[slug]/badge` | 200/404 (code) | Embed route; embed snippet has URL typo in JSDoc |
| `/films/[slug]/scenes/[sceneSlug]` | 200/404 (code) | CreativeWork JSON-LD |
| `/films/[slug]/loadout` | 200/404 (code) | Print-optimized loadout sheet |
| `/crew` | 200 (code) | SSR |
| `/crew/[slug]` | 200/404 (code) | force-dynamic; Person + BreadcrumbList JSON-LD; missing desc when no bio |
| `/crew/[slug]/opengraph-image` | 200 (code) | Edge runtime; fetches /api/v1/crew |
| `/gear` | 200 (code) | SSR |
| `/gear/[manufacturer]/[series]/[item]` | 200/404 (code) | Product JSON-LD |
| `/gear/compare` | 200 (code) | SSR |
| `/gear/rentals` | 200 (code) | SSR; console.warn on DB error |
| `/vfx` | 200 (code) | SSR |
| `/vfx/[slug]` | 200/404 (code) | Organization JSON-LD |
| `/vfx/volumes/[slug]` | 200/404 (code) | SSR; console.warn on table missing |
| `/vfx/title-houses/[slug]` | 200/404 (code) | SSR; console.warn on table missing |
| `/stunts` | 200 (code) | SSR |
| `/stunts/coordinators` | 200 (code) | Previously 404; now exists |
| `/stunts/companies` | 200 (code) | Previously 404; now exists |
| `/stunts/sequences/[productionSlug]/[sequenceSlug]` | 200/404 (code) | Article + ClaimReview JSON-LD |
| `/sound` | 200 (code) | SSR; DepartmentIndex → PageHero (h1 present) |
| `/sound/mixers` | 200 (code) | Previously 404; now exists |
| `/sound/designers` | 200 (code) | Previously 404; now exists |
| `/sound/foley` | 200 (code) | Uses `prose prose-invert` — typography plugin missing |
| `/sound/post` | 200 (code) | Uses `prose prose-invert` — typography plugin missing |
| `/sound/effects` | 200 (code) | Uses `prose prose-invert` — typography plugin missing |
| `/music` | 200 (code) | SSR |
| `/music/scoring-stages` | 200 (code) | SSR; console.warn on query fail |
| `/editing` | 200 (code) | SSR; DepartmentIndex (h1 via PageHero) |
| `/editing/walkthroughs` | 200 (code) | console.warn if listWalkthroughs fails |
| `/production-design` | 200 (code) | SSR |
| `/costume-hair-makeup` | 200 (code) | SSR |
| `/awards` | 200 (code) | SSR; not in any sitemap |
| `/awards/cinematography` | 200 (code) | Previously 404; now exists |
| `/dossiers` | 200 (code) | Previously 404; now exists; not in sitemap |
| `/dossiers/[slug]` | 200/404 (code) | console.warn; not in sitemap |
| `/walkthroughs` | 200 (code) | Previously 404; now exists; not in sitemap |
| `/walkthroughs/[slug]` | 200/404 (code) | ClaimReview JSON-LD; not in sitemap |
| `/decisions` | 200 (code) | SSR; not in sitemap |
| `/decisions/[slug]` | 200/404 (code) | TechArticle + ClaimReview JSON-LD; not in sitemap |
| `/partnerships` | 200 (code) | SSR; console.warn on fail; not in sitemap |
| `/partnerships/[slug]` | 200/404 (code) | ClaimReview JSON-LD; not in sitemap |
| `/tools` | 200 (code) | Lists all 9 tools; no JSON-LD |
| `/tools/scoring-session-cost` | 200 (code) | Phase 4; not in sitemap; no JSON-LD |
| `/tools/stunt-rig-picker` | 200 (code) | Phase 4; not in sitemap; no JSON-LD |
| `/tools/hdr-target-picker` | 200 (code) | Phase 4; not in sitemap; no JSON-LD |
| `/tools/anamorphic-vs-spherical` | 200 (code) | Phase 4; not in sitemap; no JSON-LD |
| `/tools/frame-lines` | 200 (code) | In sitemap; no JSON-LD |
| `/tools/aces` | 200 (code) | In sitemap; no JSON-LD |
| `/tools/cdl` | 200 (code) | In sitemap; no JSON-LD |
| `/tools/coverage` | 200 (code) | In sitemap; no JSON-LD |
| `/tools/loadout` | 200 (code) | In sitemap; no JSON-LD |
| `/ask` | 200 (code) | In sitemap; SSR + client components |
| `/lookbook` | 200 (code) | "upload coming soon" user-visible text; not in sitemap |
| `/shots` | 200 (code) | Not in sitemap |
| `/references` | 200 (code) | Not in sitemap |
| `/locations` | 200 (code) | Not in sitemap |
| `/decades` | 200 (code) | Not in sitemap |
| `/format` | 200 (code) | In sitemap-core |
| `/format/[slug]` | 200/404 (code) | In sitemap-core |
| `/about` | 200 (code) | Description 115 chars (below 120 floor); prose-zinc class no-ops |
| `/methodology` | 200 (code) | prose prose-invert prose-zinc — typography plugin missing |
| `/bookmarks` | 200 (code) | robots: noindex correctly set |
| `/account` | 200→redirect (code) | No noindex; no description; auth redirect via server redirect |
| `/signin` | 200 (code) | NextAuth |
| `/api/health` | 200 (code) | Health check |
| `/api/search/suggest` | 200 (code) | Documented in /api/v1 |
| `/api/search/semantic` | 200 (code) | Not in /api/v1 doc |

---

## What I'd Fix First

The single highest-leverage fix is **installing `@tailwindcss/typography` and registering it in `tailwind.config.ts`** (P1-1). The `/methodology` page is the site's citation-credibility showcase — it's the page AI engines and skeptical professionals navigate to before trusting any claim. That page is currently applying `prose`, `prose-invert`, `prose-zinc`, and `not-prose` class names that emit zero CSS, meaning heading hierarchy, list indentation, and blockquote styling are all unstyled or wrong. The fix is a one-line addition to `tailwind.config.ts` (`plugins: [require('@tailwindcss/typography')]`) and a `pnpm add -D @tailwindcss/typography`. After that, the two-part sitemap gap (P1-2 and P1-3) should be addressed: add the four Phase 4 tool slugs to `sitemap-core.xml` and either create a new `sitemap-editorial.xml` (covering walkthroughs, decisions, dossiers, partnerships) or expand `sitemap-core.xml` to list their index URLs and register it in the sitemap index. These editorial pages carry the site's highest-value AEO content — `ClaimReview` structured data — and omitting them from sitemaps denies crawlers the crawl-budget signal those pages need.
