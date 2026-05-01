# Video Discovery Design

**Goal:** Automatically discover and surface "how it was made" videos (VFX breakdowns, making-of docs, DP interviews, behind-the-scenes featurettes, etc.) for every production in the database, sourced from YouTube and Vimeo via their APIs, with confidence-scored auto-categorisation.

**Architecture:** API-driven discovery pipeline. For each production, multiple targeted search queries run against YouTube Data API v3 and the Vimeo API. Results are scored by relevance and categorised from title keywords and channel identity. High-confidence results are published immediately; borderline results are held as `pending` for optional manual review. Discovery runs as a weekly scheduled job alongside the VFX text-scraping pipeline.

**Tech Stack:** YouTube Data API v3, Vimeo API, Drizzle ORM + PostgreSQL (existing), node-cron (existing, shared with VFX scraper), Next.js App Router (UI)

---

## Data Model

### New file: `packages/db/src/schema/videos.ts`

#### `production_videos`

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| production_id | bigint FK → productions.id CASCADE | |
| source | videoSourceEnum NOT NULL | `youtube \| vimeo` |
| external_id | text NOT NULL | YouTube video ID or Vimeo video ID |
| url | text NOT NULL | Canonical watch URL |
| title | text NOT NULL | As returned by the API |
| channel_name | text | |
| channel_id | text | For future channel-level queries |
| thumbnail_url | text | |
| duration_seconds | integer | |
| view_count | integer | Snapshotted at discovery time |
| published_at | date | When the video was published on the platform |
| category | videoCategoryEnum NOT NULL | Auto-assigned; see below |
| confidence_score | numeric(4,3) NOT NULL | 0.000–1.000 |
| status | videoStatusEnum NOT NULL | `published \| pending \| rejected`; default `pending` |
| category_locked | boolean NOT NULL | Default `false`; set `true` when category is manually overridden — prevents re-discovery from overwriting |
| notes | text | For manual reviewer notes on `pending` rows |
| created_at / updated_at | timestamptz | |

**Unique constraint** on `(production_id, source, external_id)` — prevents duplicates when the same video surfaces across multiple search queries.

**Index** on `(production_id, status, category)` — supports the UI query (published videos for a production, optionally filtered by category).

### New enums (added to `enums.ts`)

**`videoSourceEnum`**: `youtube | vimeo`

**`videoStatusEnum`**: `published | pending | rejected`

**`videoCategoryEnum`**: `vfx_breakdown | compositing | making_of | behind_the_scenes | director_interview | dp_interview | production_design | stunts | sound | music | other`

### Changes to existing files

**`enums.ts`:** Add the three enums above.

**`schema/index.ts`:** Export `production_videos` and new enums.

### Migrations

Run `drizzle-kit generate` → `drizzle-kit migrate`.

---

## Discovery Pipeline

### Package location

Extends `packages/scraper` (introduced in the VFX text-scraping spec) with a new module:

```
packages/scraper/src/discovery/
  youtube.ts       # YouTube Data API v3: search + video detail fetch
  vimeo.ts         # Vimeo API: search + video detail fetch
  channels.ts      # Seeded authority channel list (YouTube channel IDs + Vimeo user IDs)
  score.ts         # Confidence scoring algorithm
  categorise.ts    # Category assignment from title + channel heuristics
  upsert.ts        # Scored + categorised results → Postgres
  run.ts           # Orchestrates: search → deduplicate → score → categorise → upsert
```

### API notes

**YouTube Data API v3** (`youtube.ts`): Uses the `search.list` endpoint with `type=video` and `q=<query string>`. Quoted-phrase search is supported. Requires a standard API key; default quota is 10,000 units/day — each search costs 100 units, so 6 queries × N productions must fit within quota. For the current ~40-production dataset this is ~240 units/run, well within limits.

**Vimeo API** (`vimeo.ts`): Uses the `/videos` endpoint with `query=<keywords>`. Vimeo does not support quoted-phrase search — query strings are issued as plain keyword searches (quotes stripped). Rate limits on the free `VIMEO_ACCESS_TOKEN` tier are 1,000 API calls/day and 60 calls/minute. A standard authenticated token (free Vimeo account) is sufficient; no paid plan required. `vimeo.ts` must respect the 60 calls/minute limit with inter-request delays.

### Query strategies

For each production, all six queries run against both YouTube and Vimeo. Results are pooled and deduplicated by `external_id` before scoring.

| Query template | Primary target category |
|---|---|
| `"[title] [year] vfx breakdown"` | `vfx_breakdown` |
| `"[title] [year] visual effects"` | `vfx_breakdown`, `compositing` |
| `"[title] [year] making of"` | `making_of` |
| `"[title] [year] behind the scenes"` | `behind_the_scenes` |
| `"[title] [year] cinematography"` | `dp_interview` |
| `"[title] [year] production design"` | `production_design` |

Each query fetches the top 10 results. After deduplication, a production typically yields 20–50 candidates.

### Confidence scoring (`score.ts`)

Weighted sum producing a score in [0.0, 1.0]:

| Signal | Weight | Detail |
|---|---|---|
| Film title present in video title | 0.30 | Exact substring match scores full; fuzzy (fuse.js, threshold 0.3) scores 0.15 |
| Release year present in video title or description | 0.10 | Guards against same-title films from different years |
| Channel on authority list | 0.25 | See `channels.ts`; exact channel ID match |
| Keyword match in video title | 0.20 | Matches against a keyword list per category (e.g. "breakdown", "vfx", "making of") |
| Duration between 90 seconds and 30 minutes | 0.10 | Filters out trailers (<90s) and full documentaries (>30min) |
| View count ≥ 10,000 | 0.05 | Weak relevance signal |

**Thresholds:**
- ≥ 0.65 → `status: published` — stored and visible in the app immediately
- 0.40–0.64 → `status: pending` — stored but not shown; available for optional manual review
- < 0.40 → discarded, not stored

### Category assignment (`categorise.ts`)

Category is assigned after scoring, in priority order:

1. **Channel identity** — if the channel is a known VFX house (ILM, Weta, DNEG, MPC, Framestore, Rodeo FX, etc.), assign `vfx_breakdown` regardless of title
2. **Title keyword matching** — scan video title against per-category keyword lists:
   - `vfx_breakdown`: "vfx", "visual effects", "breakdown", "cgi", "compositing"
   - `making_of`: "making of", "making-of", "the making"
   - `behind_the_scenes`: "behind the scenes", "bts", "on set", "onset"
   - `dp_interview`: "cinematography", "director of photography", "dp", "cameraman", "lenses"
   - `director_interview`: "director", "directed by"
   - `production_design`: "production design", "set design", "art department"
   - `stunts`: "stunts", "stunt"
   - `sound`: "sound design", "score", "audio"
   - `music`: "soundtrack", "composer", "musical score"
   - `compositing`: "compositing", "nuke", "colour grade", "color grade"
3. **Fallback** → `other`

### Authority channel list (`channels.ts`)

Seeded list of trusted YouTube channel IDs and Vimeo user IDs. Initial set:

**VFX houses:** ILM, Weta Digital, DNEG, MPC Film, Framestore, Rodeo FX, Scanline VFX, Rising Sun Pictures, Luma Pictures

**Generalist/editorial:** Corridor Crew, Corridor Digital, befores&afters, The Art of VFX

**Studios (official channels):** Warner Bros, Universal Pictures, Paramount, Sony Pictures, Disney, A24, Apple TV+, Netflix Film

Extensible without code changes — add entries to `channels.ts` and re-run discovery.

### Upsert behaviour (`upsert.ts`)

On conflict `(production_id, source, external_id)`:
- `status` is only upgraded (pending → published), never downgraded — a manually rejected video stays rejected even if re-discovered
- `view_count`, `thumbnail_url`, and `title` are refreshed to the latest API values
- `confidence_score` is updated to the latest score
- `category` is not changed when `category_locked = true` (set by a reviewer who manually corrected the auto-assigned category)

### CLI commands

Run via `pnpm --filter @bts/scraper <command>`:

| Command | Description |
|---|---|
| `discover:videos` | Run discovery for all productions |
| `discover:videos --slug <slug>` | Run for a single production |
| `discover:videos --pending` | Re-score all existing `pending` rows (useful after tuning weights) |

### Scheduler

Discovery runs weekly alongside the VFX text scrape. The existing `scheduler.ts` `run` command is extended to call `discover:videos` after `import:vfx`. The `SCRAPER_CRON` env var controls the schedule for all jobs.

### API credentials

Two new env vars required:
- `YOUTUBE_API_KEY` — YouTube Data API v3 key (Google Cloud Console)
- `VIMEO_ACCESS_TOKEN` — Vimeo API access token (Vimeo Developer portal)

Both added to `.env.example` and the Docker Compose `scraper` service environment block.

---

## Web UI

### Modified: film detail page (`apps/web/app/films/[slug]/page.tsx`)

`getProductionWithFullDetail` is extended to also fetch `published` videos for the production, ordered by `category` then `view_count DESC`.

### New component: `VideoGallery` (`apps/web/components/productions/VideoGallery.tsx`)

Sits below the VFX Credits section on the film detail page. Hidden entirely if the production has no `published` videos.

**Layout (Option A — category tabs + thumbnail grid):**

1. **Section header** — "Videos" with "Production" label, consistent with existing `SectionHeader` component
2. **Category filter tabs** — "All (N)" + one tab per category that has at least one video, with counts. Active tab highlighted in amber. Client component for tab state.
3. **3-column thumbnail grid** — each card:
   - 16:9 thumbnail image (from `thumbnail_url`), falls back to a placeholder
   - Video title (truncated to 2 lines)
   - Category badge
   - Channel name + duration + view count in muted text
   - Entire card is an `<a>` linking to `url` with `target="_blank" rel="noopener noreferrer"`

### New query function

`getProductionVideos(db, productionId)` — returns all `published` videos for a production, sorted by `category`, then `view_count DESC`. Added to `packages/db/src/queries/`.

---

## Out of Scope

- In-app video embedding (iframe/player) — all videos open externally
- Manual video submission by users
- Video search across productions ("find all films with Corridor Crew breakdowns") — future feature
- Vimeo showcase or playlist support — individual videos only
- Automatic re-scoring on a different cadence from the weekly run
