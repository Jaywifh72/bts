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
> **Last updated:** 2026-05-05 (after T7-1 / T2-4 / T2-7 / T3-2 / T6-1 /
> T4-4 / T8-1 / T8-2 / T9-6 / T8-4 / T4-5 / T2-6 / T3-5 / T7-4 / T6-5
> shipped — 44 of 47 items now complete; new migrations 0018
> `production_awards` and 0019 `corrections`; per-page OG cards live).

The next high-leverage unchecked items, in dependency order:

1. **T4-2** — deeper lens specs (coverage circle, image circle, breathing,
   close focus, housing model). Schema additions + curated data; competes
   directly with Cinelenses on depth. Hold for a curatorial pass — needs
   real numbers per equipment_item.

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
- [x] **T2-4:** Regional release dates from TMDb. New migration 0016 adds
      a `release_dates` JSONB column on `productions` (shape:
      `[{ country, date, type, certification? }]`). New TMDb client method
      `fetchMovieReleaseDates`, new CLI `pnpm tsx packages/scraper/src/cli.ts
      tmdb:release-dates [--limit N] [--refresh]`. New
      `<ReleaseDates>` component on the film page collapses TMDb's
      multi-row-per-country payload to one row per country (theatrical
      preferred over premiere/limited/digital), shows ISO code +
      `Intl.DisplayNames` country name + date + certification, sorted
      ascending. Self-hides when null/empty.
- [x] **T2-5:** Wikidata cross-link: store `wikidata_id` on productions
      and people (schema already has the column for both). The `tmdb:persons`
      enrich job pulls it from TMDb's external_ids endpoint when present.
      Surfaced as a link on the crew detail page next to IMDb and TMDb.
- [x] **T2-6:** Awards section on production pages. Migration 0018 adds
      `production_awards` (production_id FK CASCADE, award_org enum,
      category text, year, is_winner, optional recipient_person_id FK
      ON DELETE SET NULL, source_url, UNIQUE on the natural key).
      `<AwardsList>` renders winners-first with WON/NOM tag, org name,
      category, year, and a link to the recipient when set.
      Hand-seeded ~18 cinematography Oscars/BAFTAs/ASC across the
      curated films (Oppenheimer, Dune 1+2, 1917, BR2049, Revenant,
      Mad Max, Killers, Poor Things, The Brutalist, Dunkirk, Skyfall,
      Children of Men, Gravity). Wikidata Query Service ingest pipeline
      deferred — schema is shaped to accept it later (source_url
      column ready for the wikidata URI).
- [x] **T2-7:** Curated key-frames gallery. New migration 0017 adds a
      `production_keyframes` table (FK CASCADE on production, optional
      FK to scene with SET NULL). New admin page `/admin/keyframes` with
      add-form (production dropdown, image URL, caption, sort order) and
      grid of existing frames grouped by production with Delete buttons.
      `<KeyFramesGallery>` shows curated stills as a 3-up grid on the
      film page; self-hides when none. Plain `<img>` (not next/image) so
      curators can paste arbitrary external URLs without configuring an
      allowlist.
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
- [x] **T3-2:** Career stats panel above the filmography. Four cards:
      Credits (with "across N productions" hint when distinct), Active
      span (year range + decade count), Most-used aspect ratio (mode
      across distinct productions, with "X of Y productions" hint),
      Top collaborator (linked to their crew page). Computed entirely
      from the existing `getPersonFilmography` and
      `getCollaboratorsForPerson` queries — no new SQL. Cards self-hide
      if their underlying stat is missing (e.g. unknown release years).
- [x] **T3-3:** "Known for" highlight section above the filmography
      table — top 4 productions by vote_average where vote_count >= 50
      so obscure outliers don't drown out broadly-loved films. Each
      card: poster, year, role, ★ rating.
- [x] **T3-4:** Surface `crew_assignments.notes` when present in the
      Filmography table ("Director of Photography — additional
      photography only").
- [x] **T3-5:** Awards section on crew pages. Same `production_awards`
      table from T2-6 — `getAwardsForPerson(slug)` joins back through
      `recipient_person_id` and surfaces the linked production. Inline
      list section (compact, "WON/NOM Org · Category · Year → Film")
      rendered between Career stats and Known for. Verified on Roger
      Deakins (3 won, 4 total) and Christopher Nolan (Best Director
      WON 2024).

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
- [x] **T4-4:** Shot-on-this-format pages. New
      `apps/web/lib/formats.ts` taxonomy with 9 canonical formats (IMAX
      65mm, Panavision 65mm, ALEXA 65, ALEXA Mini LF, ALEXA LF, 35mm
      anamorphic, 35mm spherical, Super 16mm, VistaVision) — each with
      ILIKE patterns that fold the free-text acquisition_format
      variants. New query `listProductionsByFormatPatterns`. New routes
      `/format` (index) and `/format/[slug]` (filtered grid). FormatBadge
      now linkifies the acquisition_format to the canonical page when a
      taxonomy entry matches (e.g. Oppenheimer's IMAX 65mm badge links
      to `/format/imax-65mm`).
- [x] **T4-5:** Rental house entities seeded into `equipment_manufacturers`
      with `kind='rental_house'` (using the existing column rather than a
      new schema). Added Panavision Rentals, Otto Nemenz International,
      Keslow Camera, Nelson Cameras, Cinelease — joining the
      pre-existing ARRI Rental row. `/gear` now surfaces every rental
      house regardless of whether it has catalogued series yet
      (manufacturers still hide zero-series entries — that's just
      unfinished data; for rental houses the entity itself matters even
      without inventory).

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

- [x] **T6-1:** Inline source citations per claim. New
      `getProductionCitations` query unions every cited source across
      production / scene / crew_assignment / equipment_usage attribution
      tables, dedupes by source_id (keeping the highest-confidence
      rating), and assigns a stable numeric index. New
      `<CitationMarker>` renders inline `[N]` markers next to each
      cited equipment-usage row in the SceneList; markers are anchor
      links to a numbered `<SourcesList>` bibliography rendered at the
      bottom of the page (replaces the old `<details>` source-citation
      block at the top — that's now a "{N} sources ↓" jump link).
- [x] **T6-2:** `lastmod` in `app/sitemap.ts` now per-production from
      `productions.updated_at` (new `listProductionLastmods` query).
- [x] **T6-3:** `Movie.aggregateRating` JSON-LD using TMDb vote_average +
      vote_count. Also added `genre` and ISO-8601 `duration` fields.
- [x] **T6-4:** `BreadcrumbList` JSON-LD on film detail pages.
- [x] **T6-5:** Per-page Open Graph images shipped as `opengraph-image.tsx`
      route segments under `/films/[slug]`, `/crew/[slug]`, and `/`. Edge
      runtime sidesteps the @vercel/og Node-bundle Windows-path bug
      (which constructs `'./file:' + win32-path` and chokes in
      `new URL()`); edge has a different bundle that doesn't hit that
      branch. Trade-off: edge can't import the postgres-js client, so the
      cards fetch from `/api/v1/productions/<slug>` (existing) and a
      newly-added `/api/v1/crew/<slug>`. Fonts loaded via the canonical
      Vercel pattern: Inter resolved from Google Fonts CSS with a legacy
      Chrome UA so Google serves WOFF (satori-compatible). JSX kept
      flat — single-text-child per div — so satori's "multi-child
      containers must declare display:flex" rule is trivially
      satisfied. Verified: all three endpoints return valid 1200×630 PNGs.

## Tier 7 — Admin / editorial workflow

- [x] **T7-1:** Bulk approve / reject / reset in `/admin/videos`.
      Per-row checkbox + select-all-on-page header, sticky bulk-action bar
      that surfaces once at least one row is selected. Single confirm()
      prompt per action; backed by `bulkUpdateVideoStatus` /
      `bulkRejectVideos` (single-statement UPDATE keyed by `id IN (...)`,
      returns touched production slugs so the action revalidates each
      `/films/<slug>` plus `/admin/videos`).
- [ ] **T7-2:** Inline scene/equipment_usage editor on the production
      admin page. Right now the only way to add curated data is to edit
      seed files.
- [ ] **T7-3:** Editor identity on edits. Tie `crew_assignments.notes`
      and similar to a logged-in editor (from cookie).
- [x] **T7-4:** Public correction-queue inbox. Migration 0019 adds a
      `corrections` table (production_id FK SET NULL, page_url, message,
      email, status enum [open/triaged/resolved/dismissed], triage_notes).
      `<CorrectionForm>` replaces the T1-4 mailto: link on the film
      page — collapses behind a "Suggest a correction →" button so it
      doesn't add visual weight; expands inline with textarea + optional
      email; `useFormState` returns success or validation error inline.
      New admin page `/admin/corrections` lists rows by status with
      Triage / Resolved / Dismiss / Reopen buttons. Open-count badge on
      the admin layout's "Corrections" nav link auto-updates.

## Tier 8 — Mobile / accessibility / polish

- [x] **T8-1:** Mobile responsive audit at 375px. TopNav now wraps
      links to a second row when too wide; main padding shrinks from
      `px-6` to `px-4` below `sm`. Spot-checked home, /films, /films/
      [slug], /admin/videos at 375px — no horizontal overflow.
- [x] **T8-2:** A11y pass:
        - Skip-to-content link in root layout (visually hidden, slides
          in on Tab) targeting `<main id="main-content" tabIndex={-1}>`.
        - `prefers-reduced-motion` rule in globals.css disables CSS
          animations, transitions, and smooth scroll for affected users.
        - `:focus-visible` amber outline already present (kept).
        - `role="search"` + `aria-label` added on FilmsFilters and
          VideoReviewFilters.
        - `aria-label="Primary"` on TopNav, descriptive labels on the
          ★ bookmarks link.
- [x] **T8-3:** Print stylesheet — implemented as `print:` Tailwind
      utilities on the loadout page (T9-1). Light theme on paper.
- [x] **T8-4:** High-contrast support via `@media (prefers-contrast:
      more)` in globals.css. Pure-black background, white body text,
      muted text (zinc-400/500/600) elevated to near-white, all dark
      borders forced to white, glassmorphic `bg-zinc-900/*` panels
      collapsed to solid black, focus ring thickened from 2px → 4px.
      No JS — opts in automatically based on OS-level high-contrast
      setting.

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
- [x] **T9-6:** Atom feed at `/digest.xml` (Cache-Control 1h with SWR
      24h). Lists the 5 most-recently-verified curated productions —
      `last_verified_at` is the natural "we touched this" signal. Feed
      autodiscovery `<link rel="alternate" type="application/atom+xml">`
      in the root `<head>`; footer "Follow" column with a "Weekly digest
      (RSS)" link. Mailer integration deferred — same content can wrap
      a Buttondown/Mailchimp campaign whenever that lands.

---

## Status legend

- `[ ]` — not started
- `[~]` — in progress (current branch)
- `[x]` — shipped to master

Mark items as you ship them. When the user says "continue enhancing based
on the plan", read this file, find the next unchecked item in dependency
order, and execute.
