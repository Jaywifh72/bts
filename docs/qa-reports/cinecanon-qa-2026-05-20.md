# CineCanon QA Sweep — 2026-05-20

**Scope:** Live production site `https://cinecanon.com` (canonical: `https://www.cinecanon.com`).
Crawled from the homepage 2 levels deep, all nav targets, every URL advertised in `llms.txt`, the sitemap index + 4 child sitemaps (random samples), and 10 film + 5 gear + 2 crew detail pages. Compared live routes against the Next.js app router at `C:/dev/bts/apps/web/app`.

---

## Summary

| Metric | Count |
|---|---|
| Distinct URLs probed | ~135 (homepage + 67 nav + 59 llms.txt + 10 films + 10 gear + assorted) |
| Sitemap URLs (declared) | 1,732 across 4 child sitemaps (553 films, 1,000 crew, 159 gear, 20 vfx) + 31 core |
| **P0 — Broken** | 5 |
| **P1 — Degraded** | 6 |
| **P2 — Polish** | 6 |

Overall health is high — every gear / film / crew detail page sampled returned 200 with valid JSON-LD (Movie / Person / BreadcrumbList / AggregateRating / FAQPage). The defects are concentrated in (a) index pages that llms.txt and internal navigation advertise but that don't exist as routes, and (b) SEO meta hygiene.

---

## P0 — Broken

| # | URL | Status | Detail |
|---|---|---|---|
| P0-1 | `https://www.cinecanon.com/dossiers` | **404** | Linked from `llms.txt` and homepage cross-links. Repo has only `apps/web/app/dossiers/[slug]/` — no `page.tsx` at the index. |
| P0-2 | `https://www.cinecanon.com/walkthroughs` | **404** | Linked from `llms.txt` and homepage cross-links. Repo has only `apps/web/app/walkthroughs/[slug]/` — no index. |
| P0-3 | `https://www.cinecanon.com/sound/mixers` | **404** | llms.txt advertises "Sound: mixers, designers, foley, post houses, scoring stages." No route exists; only `/sound/post`, `/sound/effects`, `/sound/foley`, `/sound/adr-studios`, `/sound/houses` resolve. |
| P0-4 | `https://www.cinecanon.com/sound/designers` | **404** | Same — advertised but no route. |
| P0-5 | `https://www.cinecanon.com/api/v1/aeo/digest` | **404** | llms.txt advertises this exact path. Working path is `/api/v1/aeo/digest.xml` (200). The llms.txt prose links the `.xml` variant but a second occurrence omits the extension. Verify all AI-agent docs/advertisements point at the working URL. |

Notes:
- Sitemap index, `sitemap-core.xml`, `sitemap-films.xml`, `sitemap-crew.xml`, `sitemap-gear.xml`, `sitemap-vfx.xml`, `robots.txt`, `llms.txt`, `digest.xml`, `opengraph-image` all return 200.
- Random sample of 20 film sitemap URLs and 10 gear sitemap URLs all 200.
- No 5xx observed.

---

## P1 — Degraded

| # | Area | Detail |
|---|---|---|
| P1-1 | Homepage accessibility / SEO | `https://www.cinecanon.com/` ships 11 `<img>` tags; **10 of them carry `alt=""`**. These are the film-poster cards in the curated grid — they are content images, not decoration. Set `alt` to the film title. (Same pattern on `/films/dune-part-two-2024`: 12 empty-alt images in the crew/credit grid.) |
| P1-2 | Homepage SEO | Homepage has **no `<link rel="canonical">`** and no `og:url`. Every film and crew detail page sampled does emit a canonical, so this is a layout-level gap on the root route. |
| P1-3 | Meta description length on film pages | 9 of 10 sampled film pages have meta descriptions longer than the 160-char Google-truncation threshold. Worst offenders: `apocalypse-now-1979` (343), `conclave-2024` (327), `the-brutalist-2024` (264), `anora-2024` (244), `dune-part-two-2024` (416 on `og:description`). The description is being pulled verbatim from the TMDb overview without truncation. |
| P1-4 | Sitemap duplicates | `sitemap-films.xml` contains at least 5 duplicate `<loc>` entries (`anora-2024`, `blade-runner-2049-2017`, `children-of-men-2006`, `gravity-2013`, `no-country-for-old-men-2007`). Duplicates don't break crawling but waste budget and look sloppy to GSC. |
| P1-5 | Cross-host redirect on every external entry point | `https://cinecanon.com/*` issues `307 Temporary Redirect` → `https://www.cinecanon.com/*`. Two consequences: (a) `307` should be `308 Permanent`/`301` for canonicalization, (b) `robots.txt`, `sitemap.xml`, and `llms.txt` all use apex URLs internally (`<loc>https://cinecanon.com/...</loc>`, `Sitemap: https://cinecanon.com/sitemap.xml`, `Host: https://cinecanon.com`), so every crawler hop incurs a redirect. Pick one canonical host and emit it consistently. |
| P1-6 | Advertised routes don't exist | Beyond the P0 list above: `/stunts/coordinators` (404), `/stunts/companies` (404), `/awards/cinematography` (404) — implied by llms.txt prose ("Stunts: coordinators, companies, performers, rigging entries" and "Awards: wins and nominations by craft"). Either ship the routes or rewrite llms.txt. |

---

## P2 — Polish

| # | Detail |
|---|---|
| P2-1 | `/api/v1` → 308 redirect to `/api/v1/`. `/films/` and several other URLs hit a trailing-slash normalization step. Pick a convention and stop redirecting. |
| P2-2 | Homepage `<title>` is 42 chars (good), description is 67 chars — under the 120-char minimum; would benefit from a fuller, keyword-rich rewrite. |
| P2-3 | Crew sitemap reports exactly **1,000** entries — round number suggests a hard pagination cap. llms.txt says the site indexes ~12,325 people (per `/crew` page heading). If true, ~11k crew detail pages are not in any sitemap. |
| P2-4 | `/admin` returns `307 → /signin?callbackUrl=/admin` — fine, but it's listed as an internal nav link on the homepage. Hide it from anonymous users to avoid a guaranteed redirect for every crawler hit. |
| P2-5 | RSC payload markers like `"$undefined"` appear in the streamed HTML of every dynamic page. These are React Server Component serialization tokens, not visible to users — flag is benign. Documented here so it isn't re-raised in a future sweep. |
| P2-6 | Inline-SVG `<title>` elements (e.g. `<title>5 primary · 2 secondary</title>` on the dune page) showed up in my grep but are valid SVG-accessibility labels, not duplicate document `<title>` tags. Benign. |

---

## Appendix — URL × Status table (probed during this sweep)

### Core navigation (all 200 unless noted)

```
200  /                                          200  /partnerships
200  /films                                     200  /decisions
200  /crew                                      200  /editing/walkthroughs
200  /awards                                    200  /music/cue-guides
200  /references                                200  /vfx/shot-breakdowns
200  /tools                                     200  /production-design/works
200  /ask                                       200  /costume-hair-makeup/costume-works
200  /bookmarks                                 200  /costume-hair-makeup/makeup-works
200  /signin                                    200  /locations
307→/signin?callbackUrl=/admin   /admin         200  /decades
200  /stunts                                    200  /format
200  /vfx                                       200  /shots
200  /gear                                      200  /for-dps … /for-makeup-artists  (12 routes, all 200)
200  /equipment/specs                           200  /about
200  /gear/rentals                              200  /methodology
200  /vfx/volumes                               200  /digest.xml
200  /vfx/title-houses                          200  /api/v1   (308 → /api/v1/, then 200)
200  /sound/post                                200  /lookbook
200  /sound/effects                             200  /search
200  /sound/foley                               404  /dossiers                       ← P0-1
200  /sound/adr-studios                         404  /walkthroughs                   ← P0-2
200  /sound/effects/libraries                   404  /sound/mixers                   ← P0-3
200  /sound/houses                              404  /sound/designers                ← P0-4
200  /editing                                   404  /stunts/coordinators            ← P1-6
200  /editing/editors                           404  /stunts/companies               ← P1-6
200  /music                                     404  /awards/cinematography          ← P1-6
200  /music/composers                           200  /stunts/people
200  /music/scoring-stages                      200  /stunts/sequences
200  /music/orchestras                          200  /vfx/supervisors
200  /music/supervisors
200  /production-design
200  /production-design/designers
200  /costume-hair-makeup
200  /costume-hair-makeup/designers
200  /costume-hair-makeup/effects-houses
200  /queries
```

### Film detail spot-check (10/10 = 200)

```
200  /films/oppenheimer-2023              200  /films/conclave-2024
200  /films/1917-2019                     200  /films/dune-part-two-2024
200  /films/all-quiet-on-the-western-front-2022   200  /films/the-brutalist-2024
200  /films/anora-2024                    200  /films/the-substance-2024
200  /films/apocalypse-now-1979           200  /films/arrival-2016
200  /films/interstellar-2014             200  /films/goat-2026  (2026 release)
200  /films/project-hail-mary-2026
```

### Gear detail random sample (10/10 = 200)

```
200  /gear/cooke/cooke-s7i-ff-plus/cooke-s7i-75mm-t2
200  /gear/zeiss/zeiss-super-speed
200  /gear/zeiss/zeiss-ultra-prime/zeiss-ultra-prime-25mm
200  /gear/atlas-lens/atlas-orion-anamorphic/atlas-orion-32mm
200  /gear/angenieux/angenieux-optimo-anamorphic/angenieux-optimo-anam-30-76
200  /gear/panavision/panavision-millennium-xl/panavision-millennium-xl2
200  /gear/zeiss/zeiss-master-anamorphic/zeiss-master-anamorphic-35mm
200  /gear/sony-cinema/sony-hdw-f900/sony-hdw-f900-body
200  /gear/zeiss/zeiss-master-prime/zeiss-master-prime-100mm
200  /gear/cooke/cooke-s4i/cooke-s4i-75mm-t2
```

### Film sitemap random sample (20/20 = 200, none listed individually)

### llms.txt URL audit (59 unique URLs)

```
404  /dossiers                  ← P0-1
404  /walkthroughs               ← P0-2
404  /api/v1/aeo/digest          ← P0-5
308  /api/v1/                    ← P2-1 (then 200)
308  /films/                     ← P2-1 (then 200)
(54 other URLs all 200)
```

### Asset spot-checks

```
200  /opengraph-image                                                          (157,814 B PNG)
200  /_next/image?url=…tmdb…/oN0o3owobFjePDc5vMdLRAd0jkd.jpg&w=3840&q=75      (6,690 B WebP)
0    https://image.tmdb.org/t/p/w1280/2ssWTSVklAEc98frZUQhgtGHx7s.jpg          ← curl returned 0 bytes / no status. TMDb hotlink from the homepage hero appears blocked or rate-limited from this probe environment. Browser users will hit TMDb's CDN directly — re-test from the browser to confirm. If reproducible, route this image through `/_next/image` like the rest.
```

### Metadata files

```
200  /robots.txt   (Host & Sitemap declared at apex — see P1-5)
200  /sitemap.xml  → 4 child sitemaps, all 200
200  /llms.txt
200  /digest.xml
```

---

## What I'd fix first

The single highest-leverage fix is **closing the gap between what `llms.txt` advertises and what the site actually serves** — the AI crawlers this site is explicitly courting are going to dereference every URL in `llms.txt`, and right now five of them 404. Ship the four missing index pages (`/dossiers`, `/walkthroughs`, `/sound/mixers`, `/sound/designers`) — even minimal stubs that render the existing detail-slug list would be enough — and either ship `/stunts/coordinators`, `/stunts/companies`, `/awards/cinematography` or rewrite the llms.txt prose to match reality. While you're in there, regenerate `robots.txt`, `sitemap.xml`, and `llms.txt` to use the canonical `https://www.cinecanon.com` host so crawlers stop eating a 307 on every metadata fetch, dedupe the 5 repeated entries in `sitemap-films.xml`, and replace empty `alt=""` on poster images with the film title. The film-page meta descriptions being 2–3× over the truncation limit is the next pass — they're being copied raw from TMDb and need a 155-char truncation in the route handler.
