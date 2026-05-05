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
- [ ] **T1-3:** Add `last_verified_at` timestamp column on productions and
      surface it on the detail page ("Data verified 14 days ago"). Pros
      need to know if equipment data is fresh.
- [ ] **T1-4:** Add a "Suggest a correction" link on every detail page
      that opens a `mailto:` or a structured form. Even just `mailto:` is
      better than nothing.

## Tier 2 — Production page depth (the page that matters most)

- [x] **T2-1:** Quick-scan tech panel at top of `/films/[slug]`: Director,
      DP, Editor, Composer, Production Design, Costume, primary camera (most-
      frequent across scenes), primary lens, primary aspect ratio + format,
      photography window, locations. Hides itself when none of the rows
      have data.
- [x] **T2-2:** Display `principal_photography_start` / `_end` and
      shooting locations (deduped from scenes). Inside TechPanel.
- [ ] **T2-3:** New schema: `post_houses` table + `production_post_houses`
      join (DI lab, color grading house, sound mix facility). Companies:
      Company 3, FotoKem, EFILM, Picture Shop, Goldcrest, Harbor, etc.
      No competitor models this — it would be a unique-to-us field.
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
- [ ] **T2-8:** "Similar films" section at the bottom of /films/[slug]
      computed from genres + format + DP + collection.

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
- [ ] **T3-3:** "Known for" highlight (3-4 highest-rated productions)
      surfaced visually at the top of the filmography table.
- [ ] **T3-4:** Surface `crew_assignments.notes` when present
      (e.g. "additional photography", "reshoots only").
- [ ] **T3-5:** Awards section on crew pages (depends on T2-6 wikidata
      pipeline).

## Tier 4 — Gear page depth

- [ ] **T4-1:** Manufacturer logos. Public-domain or fair-use
      brand marks for ARRI, Cooke, Panavision, Zeiss, Leitz, etc.
      Hosted in `/public/manufacturers/`.
- [ ] **T4-2:** Lens depth comparable to Cinelenses. Add coverage
      circle, image circle, breathing characteristics, close focus
      distance, housing model to lens specs.
- [ ] **T4-3:** Camera-vs-camera and lens-vs-lens comparison tool.
      `/gear/compare?items=arri-alexa-65,red-v-raptor` style. Side-by-side
      spec table + filmography overlap. **Unique differentiator.**
- [ ] **T4-4:** "Shot on this format" pages —
      `/format/imax-1.43`, `/format/65mm-large-format`, etc.
- [ ] **T4-5:** Rental house entities (Panavision Rentals, Otto Nemenz,
      Keslow, Nelson, Camerimage). New schema or adopt
      `equipment_manufacturers` with kind='rental_house' (already exists).

## Tier 5 — Search & discovery

- [ ] **T5-1:** Search autocomplete in the TopNav input. Debounced 200ms,
      hits a `/api/search/suggest` route, shows top 8 with category icons.
- [ ] **T5-2:** `?studio=<slug>` filter on /films (search already links
      to it; doesn't work yet).
- [ ] **T5-3:** Saved bookmarks via `localStorage`. No auth needed.
      Heart icon on each film/crew/gear card.
- [ ] **T5-4:** Keyboard shortcuts: `g f`/`g c`/`g g`/`g v` to jump,
      `?` for help overlay, `j`/`k` for card navigation in lists.
- [ ] **T5-5:** "Updated this week" feed on the homepage — signals the
      site is alive.

## Tier 6 — Trust & SEO

- [ ] **T6-1:** Inline source citations per claim ("Camera: ALEXA 65
      [src: ASC Mar 2024]") rather than only the global sources block.
- [ ] **T6-2:** `lastmod` in `app/sitemap.ts` from `productions.updated_at`
      rather than `now()`.
- [ ] **T6-3:** `Movie.aggregateRating` JSON-LD using TMDb vote_average.
- [ ] **T6-4:** `BreadcrumbList` JSON-LD on detail pages.
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
- [ ] **T8-3:** Print stylesheet — pros print loadout sheets to take on
      set.
- [ ] **T8-4:** High-contrast option (separate stylesheet keyed off
      `prefers-contrast`).

## Tier 9 — Competitive differentiators (own the niche)

- [ ] **T9-1:** **Loadout sheet PDF export.** Single-button "give me a
      printable PDF of every camera + lens used on Dune Part Two with
      credits and sources." This is the most pro-workflow-aligned
      feature we could ship. Stack: `@react-pdf/renderer` server-side.
- [ ] **T9-2:** **Lens comparison tool** (see T4-3). Pick 2-3 lenses,
      side-by-side specs + filmography overlap + DP overlap.
- [ ] **T9-3:** "Shot on Studio Pro" badge / embed widget. Free SEO.
      Rental houses and DPs link back. Embeddable
      `<iframe src="//studiopro/films/dune-part-two-2024/badge" />`.
- [ ] **T9-4:** Public read-only API with CC-BY attribution.
      `/api/v1/productions/<slug>` returns the full JSON. Wikipedia
      model — others can build on us, citing us.
- [ ] **T9-5:** `llms.txt` for AI search engine ingestion. Helps
      ChatGPT/Perplexity/Gemini cite Studio Pro instead of IMDb when
      answering technical film questions.
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
