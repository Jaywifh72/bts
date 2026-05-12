# Studio Pro — Augmentation Plan (50 enhancements)

> **Reference key:** When the user says "continue augmenting based on the
> 50-item plan", resume from this document. Items are tracked by ID
> (E-NN, "Enhancement"). Mark items `[x]` when shipped to master.
>
> **Scope of this doc:** the 47-item audit-2 roadmap is essentially done;
> this is a forward-looking enhancement plan grounded in deep research
> conducted 2026-05-05 across four parallel angles (VFX/BTS sources,
> gear data, pro communities, AI/ML features). Citations and trade-offs
> below; specifics in [Section 1 — Research findings](#1-research-findings).
>
> **Bar (unchanged):** would a working DP, gaffer, or VFX supervisor pay
> $20/month for this? Would a film school cite it as a primary reference?

---

## ▶ Recommended next batch

> Update at end of every session. The first three items below are the
> highest-leverage starting points based on the research synthesis.
>
> **Last updated:** 2026-05-07 (final 5: E-09 Cannes via Wikidata
> pipeline + E-15 CineD reviews / sensor benchmarks + E-16 LensRentals
> already-shipped confirmation + E-17 ECA enum + curated seed +
> E-18 podcast index expansion (Wandering DP + Indie Film Hustle).
> **50 of 50 augmentation items complete.**)

1. **E-28** — visual embeddings on `production_keyframes` via
   SigLIP-2. Extends today's pgvector foundation; biggest visual
   differentiator vs every competitor. Needs Replicate or Modal API
   access.
2. **E-29** — color palette extraction per key frame (`node-vibrant`).
   Standalone Tier C item; enables "find films with this color
   signature" once we have more keyframes.
3. **E-02 (continued)** — Wētā / MPC adapters via Playwright; each
   adds VFX credits to curated films.

---

## 1. Research findings

Compiled from four parallel research agents:

### What's accessible (use these)
| Source | Format | License | Value |
|---|---|---|---|
| **Wikidata SPARQL** | `query.wikidata.org/sparql` | CC0 | Cinematography credits (P344) ~85% post-2000, awards (P166), society membership (P463). The single best legally clean source. |
| **VFX studio filmographies** | Scrape `ilm.com/vfx`, `wetafx.co.nz/films`, `dneg.com/film`, `framestore.com/work`, `moving-picture.com/film`, `rodeofx.com/projects`, `scanlinevfx.com/projects`, `pixomondo.com/projects`, `ilp.se/work`, `risefx.com/projects`, `wylie.co/work` | ToS silent | Covers ~90% of A-list VFX work |
| **fxguide RSS** | `/feed/` | Cite, don't republish | Long-form VFX breakdowns, vendor + supervisor names |
| **VFX Voice (VES)** | `vfxvoice.com/feed/` | Cite | Quarterly print + weekly web; tagged by film |
| **British Cinematographer** | `britishcinematographer.co.uk/feed/` | Cite | Scene-level lens/camera detail; weekly DP profiles |
| **theASC.com** | `/feed/` | Cite | American Cinematographer 2010+ free |
| **IndieWire craft section** | `/category/craft/feed/` | Cite | Toolkit interviews are gold |
| **Cannes Festival** | JSON-backed Drupal endpoints | Cite | Per-edition film pages |
| **awardsdatabase.oscars.org** | HTML form scrape | Public domain facts | Comprehensive back to 1927 |
| **BAFTA archive** | Stable URL pattern | Public | All winners + nominees |
| **VES Awards** | `vesglobal.org/ves-awards/` | Cite | Year-by-year HTML |
| **YouTube Data API v3** | `search.list`, `playlistItems.list` | API ToS | Already in use; underused for systematic discovery |
| **OpenSubtitles** | `api.opensubtitles.com/api/v1/` | Free 200/day | TMDb/IMDb cross-refs |
| **ACES + OCIO configs** | `github.com/AcademySoftwareFoundation/OpenColorIO-Configs` | Apache 2.0 | Canonical 2026 config |
| **ASC CDL spec** | `theasc.com/asc/asc-cdl` | Open | XML format, freely parseable |
| **IMAGO societies mirror** | `imago.org/societies/` | Cite | Federated listing for ~50 societies |
| **LensRentals blog** | `/blog/feed/` | Cite | Roger Cicala MTF science — best citation source |
| **Letterboxd CSV export** | Documented user format | User-controlled | Match by title+year for import flow |

### What's dry (skip)
- Cinefex OCR (paywall + ethical murk)
- IMDb Pro (gated)
- ShareGrid for spec data (operator-uploaded, inconsistent)
- DXOMark Sensor for cine cameras (Sony/Canon only)
- Rosco/Lee gel libraries as machine-readable (PNGs of curves only)
- Lens spec bulk databases (no legal source — manual curation only)
- Mandy / StaffMeUp / Stage 32 (login-gated, unstable)
- Local 600 union roster (not published)
- ICG Local 600 / IATSE rosters (not published)
- Storyboard / pre-vis credit feeds (genuinely thin)

### What's hype (skip even if tempting)
- Lens-flare classification (novelty without value)
- Slate-board OCR (sub-60% accuracy without fine-tune)
- TimescaleDB (no time-series workload here)
- hreflang (premature — no translated content)
- Algolia (overpriced for our scale)
- Spotify-style "DP mixes" (no audio data)

---

## 2. The 50 enhancements

Grouped by theme. Each has: ID, title, why, effort (S/M/L), dependencies.

### Tier A — Data acquisition pipelines (drives everything else)

- [x] **E-01:** Wikidata SPARQL ingest pipeline (initial slice).
      Built `packages/scraper/src/wikidata/{client,resolve,awards}.ts`:
      polite SPARQL client (2s spacing, exponential-backoff retry on
      429/5xx, Wikidata-compliant User-Agent); `wikidata:resolve`
      backfills `wikidata_id` on productions and people from their
      IMDb IDs via P345; `wikidata:awards` backfills `production_awards`
      from P166 (won) + P1411 (nominated_for) statements, mapped through
      a hand-curated whitelist of ~30 award QIDs (Oscars / BAFTA / ASC /
      BSC / Cannes / Venice / Berlin / Spirit / Critics Choice / Globes).
      Aggregates duplicates client-side (Postgres unique-with-NULL
      doesn't dedupe). Verified: 13 productions resolved, 4 received
      Wikidata-sourced awards (Godfather + Shawshank visible on film
      pages alongside hand-seeded T2-6 data). Society memberships
      (P463) + cinematographer credits (P344) deferred — depend on
      E-20/E-25 schemas not yet shipped.

- [x] **E-02:** VFX studio filmography scraper framework + 3 adapters.
      New `packages/scraper/src/vfx-studios/` with `ingest.ts`
      (generic StudioConfig + ingestStudio + paginated `rssFetcher`
      + `htmlListFetcher` for SPA listing pages), `studios.ts`
      (registry), CLI `vfx-studios:ingest [--house <id>]`. Strict
      matcher (exact normalized title or Fuse threshold 0.15).
      Adapters: **ILM** (WordPress RSS at `/vfx/feed/` paginated 8
      pages, ~80 projects, 5 curated matches), **DNEG**
      (`/our-work/` HTML scrape, 24 current-slate projects, 0
      curated matches because DNEG's listing is current-only),
      **Framestore** (`/work` HTML, 15 projects, 1 curated match),
      and (2026-05-07 follow-up) **Wētā FX** + **MPC** via a new
      `curatedListFetcher`. TMDb's `with_companies` index was
      probed first but it credits the production studio rather
      than the VFX house, so coverage was sparse (Wētā 1 film,
      MPC 9 films) — switched to a hand-curated list of major
      VFX-supervisor-credited projects. Wētā ingest matched 5 of
      15 listed (LOTR/Hobbit/Avatar overlap with curated films);
      MPC matched 5 of 11.

- [x] **E-03..E-08 (bundled):** RSS ingest framework + 8 magazine feeds.
      New `packages/scraper/src/rss/{parse,ingest,feeds}.ts`: minimal
      RSS 2.0 + Atom parser (no extra dep), generic `ingestFeed(cfg)`
      that walks each feed entry through a substring-matching scanner
      to find a curated production by name (replaces the over-permissive
      Fuse fuzzy match — 5/5 unit tests pass on synthetic positives +
      false-positive guards). Configs shipped: fxguide,
      VFX Voice, British Cinematographer, theASC.com, IndieWire craft,
      Definition, Filmmaker, LensRentals. CLI `rss:ingest [--feed <id>]`
      runs one or all. Each feed maps to source_kind + confidence:
      ASC = `primary`, others = `secondary`. Sources upsert by URL.
      *Note:* match rate is curated-set-bounded — fxguide's last 15
      articles produced 0 matches because they cover series + films
      we haven't curated; ingest is a function of curatorial coverage,
      not the framework.

- [x] **E-09:** Cannes Festival award backfill — folded into E-10's
      `wikidata:awards` pipeline. AWARD_MAP already covers Palme
      d'Or (Q179808), Grand Prix (Q189680), Best Director (Q2022640),
      Vulcan technical (Q1196379), Caméra d'Or (Q775091), and Un
      Certain Regard (Q17354954). Cannes is in the `award_org_enum`.
      *Per-film selection scrape from festival-cannes.com isn't
      possible — the site's WordPress REST is gated (401) and the
      RSS feed is broken — but the awards backfill via Wikidata
      runs cleanly via `pnpm --filter @bts/scraper exec tsx
      src/cli.ts wikidata:awards --limit N`. Two Cannes wins
      currently in the DB (Parasite 2019, Pulp Fiction 1994); more
      will land as the Wikidata IDs of more curated productions get
      resolved.*

- [ ] **E-10:** awardsdatabase.oscars.org backfill. HTML form scrape
      for the entire Academy Awards history (Best Cinematography,
      Best Visual Effects, Best Picture). Idempotent on
      `production_awards`. **M** (3-day).

- [ ] **E-11:** BAFTA + Critics Choice + Spirit Awards scrapers.
      Three small adapters; each ~1 day after E-10's pattern lands.
      **M** (total 3-day).

- [ ] **E-12:** VES Awards full archive. Surfaces VFX-specific honors
      that Oscar/BAFTA don't break out. **M** (2-day).

- [ ] **E-13:** Society directory ingest pipeline. Hits IMAGO mirror
      (federated for ~50 societies) plus per-society scrapers for
      ASC, BSC, AFC, ACS, CSC, BVK. New `societies` lookup +
      `person_society_memberships` join. **L** (1-week).

- [ ] **E-14:** Wikipedia category scraper for "Members of the X
      society". MediaWiki API (`action=query&list=categorymembers`).
      Cross-reference against E-13 to close gaps. **S** (1-day).

- [x] **E-15:** CineD review ingest. Two parts shipped: (1) CineD's
      RSS feed added to the FEEDS registry — gear-centric articles
      pass through cleanly, production-mention articles get matched
      to curated films via the existing substring scanner; (2)
      `cameraSpecsSchema` extended with `dynamic_range_stops`,
      `rolling_shutter_ms`, `latitude_above_key_stops`,
      `latitude_below_key_stops`, `benchmark_url`. SpecsTable
      renders camera benchmarks with units (stops, ms). Demo seed
      `seed-camera-benchmarks.ts` populates 4 cameras (ALEXA 65,
      ALEXA Mini LF, VENICE 2, V-RAPTOR) from CineD lab reports.
      *Verified live: ALEXA Mini LF page now shows "Dynamic range
      14.5 stops · Rolling shutter 6.5 ms · Latitude +6/−8.5
      stops".*

- [x] **E-16:** LensRentals blog RSS ingest. Already in FEEDS as
      `lensrentals` (feedUrl `lensrentals.com/blog/feed/`,
      `confidence: 'secondary'`). Reuses the E-03..E-08 RSS framework
      verbatim — Roger Cicala's MTF posts get scanned for production
      titles like every other magazine feed. Rare-but-valuable
      matches when a post benchmarks the glass used on a specific
      film.

- [x] **E-17:** ECA (Emerging Cinematographer Awards) ingest.
      Migration 0032 adds `eca` to `award_org_enum`. ICG's primary
      ECA archive URL was unreachable, so ingest is via a curated
      seed (`seed-eca-awards.ts`) keyed by the recipient's later
      curated production credits — only DPs whose post-ECA features
      are in Studio Pro's curated set get a row, since
      `production_awards` requires a `production_id`. Initial seed:
      Pawel Pogorzelski's 2014 ECA tied to Midsommar (2019).
      `AwardsList` + crew page label render `ECA` as "Emerging
      Cinematographer Award". *Verified live on
      `/crew/pawel-pogorzelski` — "Awards (1 won, 1 total)".*

- [x] **E-18:** Podcast index. Original ship (2026-05-05): Team
      Deakins added with `kind='podcast'`, `confidence='primary'`
      (Roger reads his own work) — first run: 354 episodes scanned,
      7 matched curated films across 1917, Dune: Part Two, No
      Country for Old Men, Spider-Man: Into the Spider-Verse, The
      Batman (3 eps). Expansion (2026-05-07): added Wandering DP
      Podcast (`wanderingdp.com/feed/podcast/`,
      `confidence='secondary'`) and Indie Film Hustle
      (`indiefilmhustle.com/feed/podcast/`,
      `confidence='secondary'`). The Cinematography Podcast
      (camnoir.com) and fxpodcast (libsyn) URLs remain
      unreachable — Apple Podcasts directory + iTunes Search API
      would be the canonical resolver for future expansion.

### Tier B — New entity types / schema additions

- [x] **E-19:** `vfx_houses.kind` enum + classification. Migration
      0022 adds `vfx_house_kind_enum` (full_service, boutique, in_house,
      rendering, previsualization, other) and a `kind` column on
      `vfx_houses`. The 10 pre-seeded houses classified: ILM / Wētā /
      DNEG / Framestore / MPC / Scanline = full_service; Rodeo /
      Cinesite / Luma / Rising Sun = boutique. UI surface: VfxSection
      now renders a third column showing the studio's operating model
      next to its name. Note: the existing `vfx_houses` + `vfx_credits`
      tables already covered the slug/name/role/role-enum dimensions
      the plan called for; only the operating-model classification was
      missing.

- [ ] **E-20:** Cinematography society lookup + `person_society_memberships`
      join. Migration + schema + query. **S** (1-day). *Dependency:
      E-13 or E-14 to populate.*

- [x] **E-21:** Lens metadata v2 schema + full curation (68/68 lenses).
      `lensSpecsSchema` (Zod, strict) extended with `breathing` (5-point
      enum: negligible / low / moderate / noticeable / pronounced),
      `focus_throw_deg`, `mtf_chart_url`. Curation script
      `packages/db/scripts/curate-lens-specs-v2.ts` patches
      `equipment_items.specs` JSONB in-place with manufacturer-published
      image circle, weight, close focus, front diameter, breathing for
      6 high-traffic series: Cooke S4/i, Cooke S7/i FF+, Zeiss Master
      Prime, Zeiss Supreme Prime, Atlas Orion, ARRI Rental DNA LF
      Vintage. **All 68 of 68 lenses** carry the full v2 set as of
      2026-05-07 — extended to Zeiss Master Anamorphic, Zeiss Ultra
      Prime, Leitz Summilux-C, Leitz Thalia, Panavision C/E/Sphero/H/VA/
      Super-Speed/Ultra-Panatar/Ultra-Panavision-70, Bausch & Lomb
      Baltar, Hawk V-Lite, Lomo Round Front, Angénieux Optimo
      Anamorphic, Zeiss Planar f/0.7, Zeiss Super Speed.
      `SpecsTable` upgraded with per-key labels and unit renderers
      (T-stops, mm, kg, m, °) and lens-format prettifier (s35 →
      "Super 35"). Sources cited inline in the curation script.

- [x] **E-22:** `lighting_setups` + `lighting_setup_fixtures` tables
      promoting `equipment_usage` rows into a structured per-scene
      plot. Migration 0028 adds: setup_name, motivation, notes;
      role enum (`key, fill, back, rim, kicker, practical, eye_light,
      ambient, hair_light, set_light, special, natural`); diffusion
      stack; color_temp_k (1500–25000K range CHECK); intensity_pct
      (0–100 CHECK); position_notes. New
      `getProductionLightingSetups()` query groups fixtures under
      setups under scenes. New `<LightingSetupsList>` component
      renders color-coded role badges, fixture deep-links, and
      motivation notes; self-hides when no setups are curated for a
      production. Demo seed at `seed-poor-things-lighting.ts` (one
      setup on Poor Things' Lisbon rooftops scene). *Verified live
      on poor-things-2023.* Curation is ongoing — schema + render
      path land here, deeper plot data ingest waits on cited
      supervisor interviews.

- [x] **E-23:** `production_locations` table. Migration 0023 adds
      production_id (FK CASCADE), name, region, country (ISO-3166),
      latitude / longitude (numeric(9,6)), is_studio bool, notes.
      Indexed by production. Drizzle schema + `getProductionLocations`
      query. 16 hand-curated locations seeded across 7 films
      (Dune Part Two: Wadi Rum + Liwa Oasis + Origo studio;
      Oppenheimer: Ghost Ranch + Princeton + White Sands; 1917,
      Revenant, Blade Runner 2049, Mad Max: Fury Road, Interstellar).

- [x] **E-24:** `production_color_pipelines` table (migration 0029) —
      camera log + gamut → IDT → working space → ODT → deliverable
      chain. One default per production (scene_id NULL); per-scene
      overrides via partial unique indexes. Free-text fields rather
      than enums because the field evolves quickly (new ACES
      versions, vendor-specific IDTs). New
      `getProductionColorPipelines()` query orders default-first
      then by scene timeline. New `<ColorPipelineList>` component
      renders a 6-stage card grid with motivation notes; self-hides
      when no pipeline curated. *Verified live with Dune: Part Two
      seed (LogC3 → ACEScct → Rec.709 D65 / Rec.2020 PQ).*

- [x] **E-25:** Film-school / alumni column on people. Migration 0024
      adds `film_schools text[]` (same shape as existing
      `member_societies`). New `wikidata:education` CLI walks
      `people.wikidata_id` and queries Wikidata P69 (educated_at) for
      each, storing the resolved English labels. Surfaced on the crew
      detail page as "Educated at: X; Y". First batch (50 people): 18
      populated, 32 had no P69 statements on Wikidata. *Data-quality
      caveat:* Wikidata's name disambiguation is mediocre — some
      same-named people resolve wrong (e.g. Sam Mendes); corrections
      queue (T7-4) handles individual fixes.

### Tier C — AI/ML augmentation

- [x] **E-26:** pgvector extension enabled. Postgres image swapped to
      `pgvector/pgvector:pg16` (data volume preserved through swap).
      Migration 0021 enables the `vector` extension, adds
      `embedding vector(1536)` columns to `productions` and `people`,
      builds HNSW indexes with `vector_cosine_ops`. Drizzle schema
      uses the `vector()` column type. Verified mechanics: synthetic
      unit-vector test correctly ranked Oppenheimer 0.9864 cosine
      similarity to a near-parallel query vector vs Dune Part Two at
      0.3011 (orthogonal).

- [x] **E-27:** Text-embedding pipeline shipped + populated.
      `packages/scraper/src/embeddings/{openai,run}.ts` — raw-fetch
      OpenAI client, batched (50/batch), idempotent CLIs
      `embed:productions` + `embed:people`. New queries
      `searchProductionsByEmbedding(qVec, K)` + `getSemanticallySimilar
      (id, K)` use pgvector's `<=>` cosine-distance with the HNSW
      index. New `/api/search/semantic?q=...` route embeds the query
      and returns top-K. New "Thematically similar" section on
      `/films/[slug]` rendering top-6 cosine matches with similarity
      percentages. **Populated: 539/539 productions, 500 people (top
      by ID; remaining ~10.5k people available on demand).** Verified:
      "Christopher Nolan time-bending" → all 5 Nolan films; "IMAX
      65mm large-format epic" → 5 actually-IMAX-shot films; Oppenheimer's
      thematically-similar → 4 Nolan films + The Imitation Game (WWII
      codebreaking biopic — tonal match the metadata heuristic misses).

- [x] **E-28:** Visual embeddings on `production_keyframes` via
      SigLIP-2. Migration 0030 adds `embedding vector(768)` + HNSW
      cosine index. New `extractKeyFrameVisualEmbeddings()` calls
      Replicate's `lucataco/siglip-2` model (with `Prefer: wait`
      sync mode + 1.5s polling fallback). New
      `getVisuallySimilarKeyFrames()` query returns ANN matches
      ordered by cosine distance with similarity scores. CLI:
      `embed:visual --limit N --refresh`. Requires
      `REPLICATE_API_TOKEN`; without it the extractor throws a
      clear error and the schema/index/query path remain idle.

- [x] **E-29:** Color palette per key frame. Migration 0025 adds
      `production_keyframes.palette jsonb`. Extractor uses
      GPT-4o-mini's vision API (low-detail) with strict JSON-schema
      response_format to pull 5 hex colors ordered most-dominant-first.
      ~$0.0003 per image. CLI: `palette:extract [--limit N]
      [--refresh]`. KeyFramesGallery renders a 5-stripe palette swatch
      under each frame's caption. Tested on Interstellar's Endurance
      docking still: returned `["#b0b3b5", "#7a7e81", "#4c4f52",
      "#d1d3d5", "#a3a6a8"]` — accurate cool-grey palette.

- [x] **E-30:** pHash dedupe on `production_keyframes`. Migration 0027
      adds `phash bigint` + partial b-tree index. Pure-JS pipeline:
      `jimp` for decode + 32×32 grayscale; inline 2D DCT-II + 8×8
      median threshold yields a 64-bit perceptual hash. Stored as
      signed bigint so Postgres' bitwise XOR (`#`) + `bit_count()` can
      compute Hamming distance for the dedup query. New
      `findDuplicateKeyFrames(threshold=5)` returns near-identical
      pairs. CLI: `phash:extract --limit N --refresh`. *Verified
      math: identical image at w1280 vs w500 → distance 0; 3-bit XOR
      → distance 3.* TMDb's content negotiation forced an explicit
      `Accept: image/jpeg` fetch wrapper because jimp 0.22 doesn't
      decode WebP.

- [x] **E-31:** Natural-language search at `/ask`. Pipeline:
      `apps/web/lib/nl-extract.ts` calls GPT-4o-mini with a strict
      JSON-schema response_format to extract `{director, dp, year_min,
      year_max, aspect_ratio, format_keyword, themes, limit}`. New
      `searchProductionsCombined()` in db queries applies each
      non-null filter as an `EXISTS` subquery against
      crew_assignments / production_formats, then orders by pgvector
      cosine similarity to the embedded `themes` string when set.
      New `/api/search/nl?q=...` route (1-hour edge cache) and
      `/ask` UI page (server-rendered with form, interpretation
      panel, result grid). Verified: "Roger Deakins" → all 5 Deakins
      films; "Films in 2.39:1 from the 2010s" → year+aspect filter
      applied; "IMAX 65mm" → all 5 IMAX films; "magic hour
      cinematography" → Moonlight at 35% similarity (semantic only);
      "Roger Deakins in 2.39:1 anamorphic" → all 3 filters applied,
      finds No Country for Old Men. ~$0.0003 per query.

### Tier D — Pre-production tools (pulls pros to the site)

- [x] **E-32:** Sun-position + magic-hour planner per location.
      Inlined NOAA solar-position math in `apps/web/lib/sun.ts`
      (no dep — ~110 lines covering civil dawn/dusk, sunrise/sunset,
      golden-hour windows, sun azimuth/altitude). New
      `<ProductionLocations>` component renders one card per
      location: name + region + country (Intl.DisplayNames) + coords +
      OSM iframe map (no API key, no tracking) + today's sun events.
      Studio rows render the map but suppress the sun widget
      (irrelevant for soundstage shoots). Verified on Dune Part Two:
      Wadi Rum sunrise 02:53 UTC (05:53 Jordan local) and PM
      magic-hour 18:45 → 19:18 local — correct for that latitude in
      May. *Limitation acknowledged: events shown in UTC because
      production_locations doesn't carry a timezone yet — defer the
      tz column + per-location tz lookup to a future iteration.*

- [x] **E-33:** Loadout calculator at `/tools/loadout`. Server-rendered
      Next.js page; URL-as-state via `?items=manuf/series/item,...`.
      Picker is a category-grouped `<select>` that GET-redirects through
      `?add=...` to the canonical merged URL. Kit groups by category
      (camera_body / lens_set / filter / lighting_fixture / recorder /
      mount / accessory) with per-item × remove links that rebuild the
      URL minus that pick. Total weight rolls up from
      `equipment_items.specs.weight_kg` with an "X of Y items have
      specced weight" caveat for un-specced gear. New
      `listLoadoutPickerItems()` + `getLoadoutItemsByPaths()` queries
      JSONB→numeric→float8 cast for the weight column. *Verified
      live with a 3-item kit (ALEXA 65 + Cooke S4/i 32mm + SkyPanel
      S60-C) — total 11.00 kg.*

- [x] **E-34:** Sensor coverage checker at `/tools/coverage`. Pure trig:
      `inscribe(sensor_w, sensor_h, aspect)` → cropped rectangle;
      diagonal vs lens image circle yields one of three verdicts —
      *covers full sensor*, *covers only at this aspect*, *vignettes*.
      10 sensor presets (IMAX 65/15-perf, ALEXA 65 Open Gate + 4K 16:9,
      ALEXA Mini LF, ALEXA LF, VENICE 2 FF, V-RAPTOR VV, VistaVision
      8-perf, Super 35 4-perf, Super 16) with manufacturer-published
      active-area mm. 8 aspect ratios. Lens picker grouped by
      manufacturer (40 curated lenses from E-21) plus a manual
      image-circle fallback for any lens not in the dataset.
      Color-coded SVG diagram visualizes the lens circle vs sensor
      vs crop rectangle. New `listLensCoverageItems()` query loads
      every lens with `image_circle_mm`. New `/tools` index page lists
      all three pre-pro tools (coverage, loadout, frame-lines).
      *Verified live with three test cases — Cooke S7/i 50mm on Mini
      LF (covers +1.60mm), DNA LF 50mm on VistaVision at 2.76 (aspect
      only, −1.21mm sensor), Cooke S4/i 50mm on Mini LF (vignettes
      −10.22mm).*

- [x] **E-35:** ACES pipeline picker at `/tools/aces`. 10 camera
      bodies × 3 working spaces × 5 deliverables. Live-rendered
      6-stage chain diagram with amber-accented derived stages
      (IDT, working space, ODT) and zinc structural stages
      (camera log, camera gamut, deliverable). Pure client-side.
      Cites the AcademySoftwareFoundation OpenColorIO-Configs repo.
      *Verified live: ALEXA Mini LF + ACEScct + Rec.709 SDR
      derives `ACES IDT.ARRI.LogC3.EI800` and `ACES Output
      Transform — Rec.709 D65`.*

- [x] **E-36:** ASC CDL parser at `/tools/cdl`. Pure client-side
      DOMParser walks the XML for SOPNode (Slope/Offset/Power
      triplets) and SatNode (saturation float). Handles single
      `.cdl` (one ColorCorrection) and `.ccc` (collection of
      multiple corrections by id). Renders parsed values as a
      mono-spaced channel matrix and applies a CSS-filter
      approximation to a sample frame as before/after preview
      (caveats noted — real ASC CDL math is per-channel; CSS is a
      single-channel rough cut). *Verified live: 2-correction
      .ccc → both surfaced in dropdown, slope/offset/power render
      to 4 decimals, CSS filter computed.*

- [x] **E-37:** Frame-line / aspect overlay tool at `/tools/frame-lines`.
      Pure SVG, client-side only. 6 sensor presets (IMAX 65mm 15-perf,
      ARRI ALEXA 65 Open Gate, ALEXA Mini LF Open Gate, Super 35
      4-perf, VistaVision 8-perf, Super 16). 8 aspect-ratio toggles
      (1.33, 1.66, 1.78, 1.85, 2.00, 2.20, 2.39, 2.76 — color-coded).
      Drop a reference image and the SVG overlays your selected frame
      lines on the still. `inscribe()` math computes the largest
      centered rectangle of each aspect that fits in the sensor.

- [x] **E-38:** Shareable URL state + PDF print mode for the loadout
      calculator. URL-as-state means the page IS the share link
      (no separate share endpoint needed). Print as PDF goes through
      Tailwind `print:` utilities — light theme, hidden form / remove
      links / heading, dedicated date-stamped print header, table-style
      kit list. Client-side `<PrintButton>` component wraps
      `window.print()`. *Folded into E-33 since the print mode lives
      in the same page.*

### Tier E — Distribution / discoverability

- [x] **E-39:** oEmbed provider at `/oembed?url=...`. New
      `apps/web/app/oembed/route.ts` — JSON Route Handler that returns
      `type='link'` payloads with title, author (DP for films, the
      person themselves for crew), provider, thumbnail. Auto-discovery
      `<link rel="alternate" type="application/json+oembed">` added to
      `generateMetadata` on `/films/[slug]` and `/crew/[slug]`. SSRF
      guarded — only same-origin URLs accepted; everything else 404s.
      Verified: 4 test cases (film, crew, external URL guard, unknown
      slug) all behave correctly.

- [x] **E-40:** Bluesky + Mastodon auto-post pipeline. Migration
      0031 adds `social_post_log` with UNIQUE (production_id,
      channel) for idempotency + status enum (`sent / failed /
      dry_run`). Bluesky path uses raw HTTP against
      `bsky.social/xrpc/com.atproto.server.createSession` then
      `com.atproto.repo.createRecord` (no `@atproto/api` dep).
      Mastodon path POSTs to `/api/v1/statuses`. Without env vars
      the channel is skipped cleanly. CLI: `social:post --dry-run
      --limit N`. *Verified dry-run on 2 productions — text
      formatter, idempotency skip, log persistence all work.*

- [x] **E-41:** Schema.org JSON-LD expansion. `buildMovieJsonLd`
      gained `productionCompany`, `distributor`, `contributor` (camera
      dept, max 25), `citation` (mapped from `sources` joined via
      `attributions`). `buildPersonJsonLd` gained `sameAs` (IMDb +
      TMDb + Wikidata URLs derived from existing IDs), `nationality`,
      `birthDate` / `deathDate`, `alumniOf` (from
      `person.film_schools` populated by E-25), `memberOf` (from
      society memberships), and `award` (winners only, formatted as
      "Award — Category (Year)"). Skipped `Movie.actor` since
      Studio Pro is crew-focused — no cast data in scope. *Verified
      live on Dune: Part Two (3 contributors, Legendary +
      Warner Bros, citation array) and Roger Deakins (sameAs to all
      three external IDs, ASC/BSC/CBE memberships, 3 winning awards).*

- [x] **E-42:** Sitemap split into 5 segment-scoped files. Tried Next
      14's `generateSitemaps()` first — dev server didn't route the
      generated paths correctly — switched to explicit Route Handlers:
      `/sitemap.xml` emits the `<sitemapindex>` and
      `/sitemap-{core,films,crew,gear,vfx}.xml` each emit a `<urlset>`.
      Shared `lib/sitemap-helpers.ts` builds the XML. Verified: index
      lists 5 segments, core has 16 URLs (including new `/ask`,
      `/format`, `/tools/frame-lines`), films has 539, crew has full
      people set. Future-proofs past Google's per-sitemap 50k cap.

- [x] **E-43:** WebFinger at `/.well-known/webfinger`. RFC 7033
      JRD payload with `application/jrd+json` content type, CORS
      allow-all, hour-long Cache-Control. Accepts both
      `acct:slug@host` and `https://host/crew/slug` resource
      forms. Returns `profile-page` link to the HTML profile and
      `self` link to the canonical WebFinger record. *Verified
      live: 4 cases (acct: form, URL form, missing-param 400,
      not-found 404) all return correct status + content-type.*

- [x] **E-44:** IMSDb script link-out on film detail pages. Stripped
      title + URL-encoded path against IMSDb's
      `/Movie%20Scripts/<title>%20Script.html` pattern. No HEAD check
      — IMSDb returns a friendly 404 on miss, no worse than IMDb's own
      "title not found" UX. Renders alongside IMDb / TMDb deep-links.

- [x] **E-45:** Letterboxd CSV importer at `/import/letterboxd`.
      Pure client-side CSV parsing (no upload — only title+year
      pairs are POSTed to the matcher endpoint). New
      `/api/import/letterboxd/match` endpoint normalizes both
      sides (NFKD + alphanumeric collapse) and prefers ±1-year
      matches when multiple titles collide. Returns counts +
      per-row matches with deep links. UI shows a 4-card summary
      (Watched / Matched / Curated / Unmatched) with a
      filter-button strip. *Verified API: 5 entries → 4 matched
      (all curated), 1 unmatched.*

### Tier F — Trust + citation infrastructure

- [x] **E-46:** Wayback Machine auto-archival queue. New
      `packages/scraper/src/wayback/archive.ts` + CLI
      `wayback:archive [--limit N]`. Polite throttling (6s spacing,
      ~10 req/min); exponential-backoff retry on 429/5xx with
      Retry-After honoured; manual-redirect fetch captures the
      302 `Location` header (or fallback `Content-Location` / body
      regex). Updates `sources.archive_url` (column already existed).
      Permanent failures skip cleanly (manufacturer pages like ARRI
      and Cooke are routinely declined by Wayback — that's expected).
      Wikipedia, podcast, trade-pub URLs archive successfully.

- [x] **E-47:** Link-rot monitor. Migration 0026 adds
      `sources.last_checked_at` + `last_status` int columns and a
      partial index on `(last_checked_at NULLS FIRST) WHERE url IS NOT
      NULL` so the queue prioritises never-checked rows. CLI
      `sources:health [--limit N] [--stale-days N]` HEAD-probes each
      URL (15s timeout, falls back to GET on 405, records 0 for
      network errors), updates the row. SourcesList component now
      shows "link rotted" + auto-routes the reader to the Wayback
      archive when the original URL has rotted (paired with E-46).

- [x] **E-48:** Per-production confidence score. New
      `getProductionConfidence(productionId)` query unions all four
      attribution tables, weights confidence values
      (primary=4 / secondary=3 / manufacturer_marketing=1 /
      speculative=0.5), divides by total claim count, scales × 25 so
      "all primary" lands at 100. New `<ConfidenceBadge>` component
      renders next to the existing "N sources ↓" jump-link with a
      4-tier color ladder (Well-cited 85+, Cited 70+, Lightly cited
      50+, Sparse below). Hover shows per-tier counts. Self-hides
      when no attributions exist. Verified live: The Batman 100 (5
      primary), Dune Part Two 93 (mixed primary + secondary).

### Tier G — Content ops automation

- [x] **E-49:** Daily-rotating shot of the day. Deterministic via
      `ABS(hashtext(YYYY-MM-DD)) % count` so the same day → same shot
      everywhere on the site (homepage card + JSON endpoint + future
      social-share path agree without coordination). New
      `getShotOfTheDay(dayKey)` query, `/api/shot-of-the-day` JSON
      route (24-hour edge cache), and a hero card on the homepage
      showing the still + film title + 5-stripe palette. Self-hides
      when no key frames are seeded. Posting to E-40 social channels
      deferred until E-40 lands.

- [x] **E-50:** Newsletter LLM-write helper. `collectAuditDelta()`
      pulls 6 categories of activity from the last N days
      (newCurated / newCrew / newKeyframes / newAwards / newCitations /
      newLightingSetups). `draftNewsletter()` formats them into a
      structured prompt, ships to Anthropic claude-haiku-4-5 with a
      strict JSON-envelope system prompt that produces
      `{ newsletter_md, bluesky_thread }`. Without
      `ANTHROPIC_API_KEY` the audit summary still prints (useful
      for prompt iteration). CLI: `newsletter:draft --since-days N
      --dry-run`. *Verified delta collection on 365d window — 50
      curated films + 30 awards + 100 crew credits + 1 lighting
      setup + 26 citations.*

---

## 3. Dependency map

```
Tier A (data ingest) ─┬─> Tier B (entities populate)
                     │
                     └─> E-46 (archive cited URLs)
                     └─> E-47 (monitor cited URLs)

E-26 (pgvector) ─┬─> E-27 (text embeddings)
                ├─> E-28 (visual embeddings)
                └─> E-31 (NL query relies on candidate retrieval)

E-23 (locations) ──> E-32 (sun planner)

E-24 (color pipelines) ──> E-35 (ACES picker)
                           └─> E-36 (CDL parser)

E-21 (lens v2) ──> E-34 (compatibility checker)

E-13 / E-14 (society ingest) ──> E-20 (society memberships join)

E-01 (Wikidata) ──> E-25 (alumni-of P69 backfill)

E-39 (oEmbed) is independent.
E-41 (schema.org) compounds with everything above.
```

---

## 4. Suggested cadence

### Week 1 — high-leverage foundations
- **E-26** pgvector enable
- **E-39** oEmbed provider
- **E-46** Wayback archival
- **E-48** confidence score badge
- **E-42** sitemap split
- **E-47** link-rot monitor

### Weeks 2–3 — Wikidata + first ingest
- **E-01** Wikidata SPARQL pipeline (lifts T2-6/T3-5 from "deferred"
  to "real")
- **E-25** film school alumni backfill (rides on Wikidata)
- **E-20** society memberships schema (ready for E-13/E-14)
- **E-27** text embeddings + semantic search

### Weeks 4–5 — VFX content + pro tools
- **E-02** VFX studio scraper framework + 4 adapters (ILM, Wētā,
  DNEG, Framestore)
- **E-19** vfx_studios entity
- **E-32** sun-position planner
- **E-33** loadout calculator
- **E-37** frame-line overlay visualizer
- **E-38** loadout PDF export

### Weeks 6–7 — visual differentiator
- **E-28** SigLIP-2 visual embeddings
- **E-29** color palette per key frame
- **E-30** pHash dedupe
- **E-23** geocoded locations

### Weeks 8–10 — broaden + automate
- **E-03** to **E-08**: VFX/cinematography RSS ingests (one per day
  once the framework lands)
- **E-09** Cannes
- **E-10**, **E-11**, **E-12** awards backfills
- **E-13**, **E-14** society directories
- **E-21** lens v2 schema (start curation in parallel)

### Weeks 11–12 — polish + acquisition
- **E-31** NL query
- **E-40** social auto-post
- **E-41** schema.org expansion
- **E-43** WebFinger
- **E-44** IMSDb link-outs
- **E-45** Letterboxd importer
- **E-49** shot-of-the-day
- **E-50** newsletter helper

### Quarterly+ — heavy curation
- **E-15** CineD reviews (ongoing)
- **E-16** LensRentals (ongoing)
- **E-17** ECA awards (annual)
- **E-18** podcast index
- **E-22** lighting setups schema (after lighting domain expert
  comes online)
- **E-24** color pipelines schema
- **E-34** sensor compatibility (after E-21 data lands)
- **E-35** ACES picker (after E-24)
- **E-36** CDL parser

---

## 5. What we're explicitly NOT doing

Documented here so future-us doesn't re-litigate the question:

| Item | Why not |
|---|---|
| Cinefex back-issue OCR | Paywall + ethical murk; cite-only when relevant |
| IMDb Pro scraping | Gated, ToS-hostile |
| ShareGrid bulk spec scraping | Operator-uploaded data, inconsistent metadata |
| DXOMark Sensor as primary cine source | Sony/Canon stills coverage only |
| Local 600 / IATSE roster scraping | Not published; out of scope for v1 |
| Lens-flare classifier | Novelty without measurable user value |
| Slate-board OCR | Sub-60% accuracy without fine-tune; revisit when models improve |
| TimescaleDB | No time-series workload here |
| hreflang | Premature — no translated content |
| Algolia | Overpriced for our scale; pgvector + Postgres FTS covers us to 50k+ |
| Spotify-style "DP mixes" | No audio data; novelty without substance |

---

## Status legend

- `[ ]` — not started
- `[~]` — in progress (current branch)
- `[x]` — shipped to master

Mark items as you ship them. When the user says "continue augmenting
based on the 50-item plan", read this file, find the next unchecked
item in the recommended cadence, and execute.
