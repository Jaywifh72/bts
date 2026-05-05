# Studio Pro — Audit 2 Roadmap

> **Reference key:** When the user says "continue enhancing based on the plan",
> resume from this document. Items are tracked by ID (e.g. T1-1) so partial
> progress is unambiguous. Mark items `[x]` when shipped to master.
>
> **Bar:** Would a working DP, gaffer, or VFX supervisor pay $20/month for this?
> Would a film school cite it as a primary reference? Would a journalist link
> to it as an authority on a production's technical setup?
>
> **Source:** Second-pass audit conducted 2026-05-04 against site at
> http://localhost:3000 with 539 productions, 11,452 people, 15,797 crew
> assignments. Competitive landscape researched: ShotOnWhat, ShotDeck,
> Cinelenses, CineD, befores & afters, ASC Magazine, IMDb, Letterboxd.

---

## ▶ Recommended next batch

> **Update this section at the end of every session.** It's the entrypoint
> for "continue enhancing based on the plan" — a fresh session should read
> this first to know where to pick up, then work through the items in order.
> Skip an item only if a hard dependency isn't met yet (call it out).
>
> **Last updated:** 2026-05-05 (after Tier 2-3 / 3-3 / 3-4 / 4-1 / 5-5 / 9-4
> shipped — 29 of 47 items now complete).

The next high-leverage unchecked items, in dependency order:

1. **T7-1** — bulk approve / reject in `/admin/videos`. With ~460 pending
   videos still waiting for review, this is the highest ROI per LOC.
2. **T2-4** — TMDb release dates by region (`/movie/{id}/release_dates`).
   Small ingest job; no schema change needed (store on productions).
3. **T2-7** — curated key-frames gallery (3-4 production stills per curated
   film). Needs a `production_keyframes` table + admin UI to upload URLs.
4. **T3-2** — "Career stats" panel on every crew page (total credits,
   decades active, most-used aspect ratio, top collaborator). Pure query +
   UI; no new schema.
5. **T6-1** — inline source citations per claim ("Camera: ALEXA 65 [src:
   ASC Mar 2024]") rather than only the global sources block at the top.
6. **T4-2** — deeper lens specs (coverage circle, image circle, breathing,
   close focus, housing model). Schema additions + curated data; competes
   directly with Cinelenses on depth.
7. **T4-4** — "Shot on this format" pages (`/format/imax-1.43`,
   `/format/65mm-large-format`). Pure query + new pages; no schema change.
8. **T8-1 + T8-2** — mobile responsive audit + accessibility pass
   (skip-to-content, focus-visible, ARIA on filter dropdowns,
   prefers-reduced-motion). Cross-cutting; one focused session.
9. **T9-6** — newsletter / weekly digest (5 new productions added with
   curated data). Could be just an RSS feed first; mailer integration
   later.

Big-but-deferred items (each warrants its own focused session):

- **T2-6 / T3-5** — Wikidata-sourced awards. Needs a `production_awards`
  schema and a Wikidata Query Service client. Powerful but its own day.
- **T6-5** — per-page OG images. Still blocked by the `@vercel/og`
  Windows bug; fix is to vendor the font binary or build on Linux CI.
- **T7-2 / T7-3 / T7-4** — admin scene editor + editor identity +
  correction queue. The full editorial workflow needs auth (sub-project 6).

---

## Defensive niche we should own

Studio Pro's defensible position is the *intersection* of three things no
single competitor combines:

1. **Scene-level granularity** (ShotDeck has it visually but locked behind
   a paywall and lacks the structured-data graph; ShotOnWhat is
   production-level only)
2. **Cited claims with confidence ratings** (no competitor surfaces
   `primary | secondary | manufacturer_marketing | speculative` on every
   technical claim)
3. **Free + open + modern UI** (ShotOnWhat is free but dated; ShotDeck is
   paid; CineD is lens-only)

Plus the navigable graph between gear ↔ scenes ↔ people ↔ productions ↔
VFX houses, which no competitor offers.

---

## Tier 1 — Trust & data integrity (blockers for any "is this site
authoritative" claim)

- [x] **T1-1:** Patch `packages/db/src/seed/data/productions.ts` with the
      correct `tmdb_id` for the 22 curated films we just repaired in the
      DB. Without this, a clean re-seed re-introduces the corruption.
- [x] **T1-2:** Harden `tmdb:enrich` so it refuses to silently rewrite a
      row's title to a wildly different film. Token-set similarity < 0.4
      now skips the row unless `--force` is passed.
- [x] **T1-3:** `last_verified_at` column on productions (migration 0014).
      Backfilled to NOW() for curated rows, NULL for imported. Bumped
      only by human review (NOT by tmdb:enrich). Surfaced as
      "Verified N days ago" under the External-links row.
- [x] **T1-4:** "Suggest a correction →" link on film detail pages.
      `mailto:` with prefilled subject and body. Replace with a form
      when the correction queue (T7-4) ships.

## Tier 2 — Production page depth (the page that matters most)

- [x] **T2-1:** Quick-scan tech panel at top of `/films/[slug]`: Director,
      DP, Editor, Composer, Production Design, Costume, primary camera (most-
      frequent across scenes), primary lens, primary aspect ratio + format,
      photography window, locations. Hides itself when none of the rows
      have data.
- [x] **T2-2:** Display `principal_photography_start` / `_end` and
      shooting locations (deduped from scenes). Inside TechPanel.
- [x] **T2-3:** Schema (migration 0015): post_houses + production_post_houses
      with kind enum (di_lab/color/sound_mix/finishing/mastering/other) and
      role enum. Seeded 13 industry-standard houses (Company 3, FotoKem,
      EFILM, Picture Shop, Goldcrest, Harbor, Molinare, Technicolor,
      Skywalker Sound, Formosa Group, Sony Post, IMAX DMR, Dolby Labs).
      "Lab & finishing" section on film detail page when populated.
      Drizzle schema + listPostHouses / getProductionPostHouses queries.
      No competitor models this surface.
- [ ] **T2-4:** Surface release dates by region from TMDb's
      `/movie/{id}/release_dates` endpoint.
- [x] **T2-5:** Wikidata cross-link: store `wikidata_id` on productions
      and people (schema already has the column for both). The `tmdb:persons`
      enrich job pulls it from TMDb's external_ids endpoint when present.
      Surfaced as a link on the crew detail page next to IMDb and TMDb.
- [ ] **T2-6:** Awards section on production pages — Cinematography
      Oscar nominee/winner is the single biggest "this film mattered"
      signal. Source: Wikidata Query Service.
- [ ] **T2-7:** Curated "key frames" gallery (3-4 production stills per
      curated film). Manual seeding; small differentiator vs ShotDeck.
- [x] **T2-8:** "Similar films" section at the bottom of /films/[slug].
      Heuristic score: 5 × director matches + 3 × DP matches + 1 per
      genre overlap + 1 if same decade. Each result tagged with reason
      ("same director" / "same cinematographer" / "similar genre").

## Tier 3 — Crew page depth

- [x] **T3-1:** Bring in TMDb person biographies via
      `/person/{id}?append_to_response=external_ids`. CLI: `pnpm tsx
      packages/scraper/src/cli.ts tmdb:persons`. Captures bio, birthday,
      deathday, place_of_birth (used as country fallback), also_known_as
      (merged into aliases), imdb_id, wikidata_id, profile_path. Idempotent
      (`COALESCE` everywhere); pass `--refresh` to re-pull.
- [ ] **T3-2:** "Career stats" panel on every crew page: total credits,
      decades active, most-used aspect ratio, most-used DP/director
      collaborator (depends on T1-3 metadata).
- [x] **T3-3:** "Known for" highlight section above the filmography
      table — top 4 productions by vote_average where vote_count >= 50
      so obscure outliers don't drown out broadly-loved films. Each
      card: poster, year, role, ★ rating.
- [x] **T3-4:** Surface `crew_assignments.notes` when present in the
      Filmography table ("Director of Photography — additional
      photography only").
- [ ] **T3-5:** Awards section on crew pages (depends on T2-6 wikidata
      pipeline).

## Tier 4 — Gear page depth

- [x] **T4-1:** Manufacturer brand identity. Logos require licensing per
      brand so we use brand-color tiles + monogram (ARRI = red, Cooke =
      gold, Panavision = blue, RED = red, Zeiss = blue, IMAX = teal,
      Vantage = red). Wired into ManufacturerCard. Pros recognize the
      palette; this is enough visual identity to make brands distinguishable
      in a grid. Real logos can replace the tiles per-brand later.
- [ ] **T4-2:** Lens depth comparable to Cinelenses. Add coverage
      circle, image circle, breathing characteristics, close focus
      distance, housing model to lens specs.
- [x] **T4-3:** Camera-vs-camera and lens-vs-lens comparison tool.
      `/gear/compare?items=slug1,slug2,slug3` (up to 4). Side-by-side
      spec table with stable spec order + filmography overlap section
      ranked by how many of the compared items appear together.
- [ ] **T4-4:** "Shot on this format" pages —
      `/format/imax-1.43`, `/format/65mm-large-format`, etc.
- [ ] **T4-5:** Rental house entities (Panavision Rentals, Otto Nemenz,
      Keslow, Nelson, Camerimage). New schema or adopt
      `equipment_manufacturers` with kind='rental_house' (already exists).

## Tier 5 — Search & discovery

- [x] **T5-1:** Search autocomplete in the TopNav input. Debounced 200ms,
      arrow-key navigation, Esc closes, "See all" footer link. Backed
      by new `/api/search/suggest` route with 30s edge cache.
- [x] **T5-2:** `?studio=<slug>` filter on /films plumbed through
      listProductions / countProductions; preserved in pagination links.
- [x] **T5-3:** Saved bookmarks via `localStorage`. ★ button on film and
      crew detail pages; new `/bookmarks` page lists them grouped by
      kind. Star link in TopNav.
- [x] **T5-4:** Keyboard shortcuts: `g h`/`g f`/`g c`/`g g`/`g v`/`g b`
      to jump to home/films/crew/gear/vfx/bookmarks, `?` toggles a help
      overlay (Esc closes). Mounted once in the root layout. j/k card
      nav not yet implemented (lower priority).
- [x] **T5-5:** "Recently updated" feed on the homepage — 4 most-recent
      curated productions by `last_verified_at`. Compact-variant
      ProductionCard layout below the Featured row.

## Tier 6 — Trust & SEO

- [ ] **T6-1:** Inline source citations per claim ("Camera: ALEXA 65
      [src: ASC Mar 2024]") rather than only the global sources block.
- [x] **T6-2:** `lastmod` in `app/sitemap.ts` now per-production from
      `productions.updated_at` (new `listProductionLastmods` query).
- [x] **T6-3:** `Movie.aggregateRating` JSON-LD using TMDb vote_average +
      vote_count. Also added `genre` and ISO-8601 `duration` fields.
- [x] **T6-4:** `BreadcrumbList` JSON-LD on film detail pages.
- [ ] **T6-5:** Per-page Open Graph image (still blocked by `@vercel/og`
      Windows bug — fix is to vendor the font binary into the project so
      the buggy default-font loader is never invoked, OR build on Linux
      via a CI step).

## Tier 7 — Admin / editorial workflow

- [ ] **T7-1:** Bulk approve / reject in `/admin/videos`. Multi-select
      checkbox column + a single confirm.
- [ ] **T7-2:** Inline scene/equipment_usage editor on the production
      admin page. Right now the only way to add curated data is to edit
      seed files.
- [ ] **T7-3:** Editor identity on edits. Tie `crew_assignments.notes`
      and similar to a logged-in editor (from cookie).
- [ ] **T7-4:** Public correction-queue inbox surface for user reports.

## Tier 8 — Mobile / accessibility / polish

- [ ] **T8-1:** Mobile responsive audit — every page at 375px. Headers,
      tables, filter bars all need attention.
- [ ] **T8-2:** Skip-to-content link, prefers-reduced-motion respect,
      focus-visible styles, ARIA on filter dropdowns.
- [x] **T8-3:** Print stylesheet — implemented as `print:` Tailwind
      utilities on the loadout page (T9-1). Light theme on paper.
- [ ] **T8-4:** High-contrast option (separate stylesheet keyed off
      `prefers-contrast`).

## Tier 9 — Competitive differentiators (own the niche)

- [x] **T9-1:** **Loadout sheet PDF export.** `/films/[slug]/loadout`
      renders a single-page printable HTML loadout (format, crew by
      department, equipment by category with scene counts, sources with
      confidence ratings). Print → Save as PDF in browser. No server
      PDF library; no @vercel/og font issues. Tailwind `print:` utilities
      flip to a light theme for paper. Linked from the film detail page
      under External links.
- [x] **T9-2:** **Lens comparison tool** — already shipped as part of
      T4-3. The same `/gear/compare` route handles cameras, lenses,
      lighting, filters.
- [x] **T9-3:** "Shot on Studio Pro" badge / embed widget. Served as a
      raw-HTML Route Handler at `/films/<slug>/badge` that bypasses the
      root layout. 5-minute edge cache. Self-contained inline CSS;
      X-Frame-Options=ALLOWALL so it can be embedded anywhere.
      Suggested iframe: 320×120.
- [x] **T9-4:** Public read-only API with CC-BY attribution. Two
      routes shipped: `/api/v1` (self-describing root index) and
      `/api/v1/productions/<slug>` (full payload: production, formats,
      studios, crew, scenes, sources, vfx, videos, post_houses).
      Snake_case keys, CORS=*, 5-min edge cache, OPTIONS preflight,
      attribution + license in `_meta`.
- [x] **T9-5:** `/llms.txt` Route Handler emits a markdown index
      following llmstxt.org conventions: site description, dynamic
      counts, index page links, key reference queries, tools, recent
      curated productions, and a "How citations work" explainer. 1-hour
      edge cache. Goal: ChatGPT/Perplexity/Gemini cite Studio Pro for
      technical film queries.
- [ ] **T9-6:** Newsletter / weekly digest — "5 new productions added
      this week with full crew and equipment data."

---

## Status legend

- `[ ]` — not started
- `[~]` — in progress (current branch)
- `[x]` — shipped to master

Mark items as you ship them. When the user says "continue enhancing based
on the plan", read this file, find the next unchecked item in dependency
order, and execute.
