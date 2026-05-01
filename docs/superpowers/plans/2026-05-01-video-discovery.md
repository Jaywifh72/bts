# Video Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically discover and surface "how it was made" videos (VFX breakdowns, making-of docs, DP interviews, behind-the-scenes featurettes, etc.) for every production in the database, sourced from YouTube and Vimeo via their APIs, with confidence-scored auto-categorisation and a VideoGallery component on film detail pages.

**Architecture:** API-driven discovery pipeline inside `packages/scraper` (introduced by the VFX breakdowns plan). Per production, six targeted search queries run against both YouTube Data API v3 and the Vimeo API. Results are pooled, deduplicated, scored by a weighted confidence algorithm, and categorised by channel identity + title keyword matching. High-confidence results (≥0.65) are published immediately; borderline results (0.40–0.64) are held as `pending`. Discovery runs weekly alongside the VFX text-scraping pipeline via the existing `scheduler.ts`.

**Tech Stack:** YouTube Data API v3, Vimeo API, fuse.js, Drizzle ORM + PostgreSQL (existing), node-cron (existing), Next.js App Router (existing), vitest (existing)

> **Prerequisite:** The `packages/scraper` package must already exist (created by the VFX Breakdowns plan). This plan modifies that package; it does not recreate it.

---

## File Map

**Create:**
- `packages/db/src/schema/videos.ts` — `production_videos` table
- `packages/db/src/queries/videos.ts` — `getProductionVideos` query
- `packages/scraper/src/discovery/channels.ts` — seeded authority channel list
- `packages/scraper/src/discovery/categorise.ts` — category assignment from channel + title
- `packages/scraper/src/discovery/score.ts` — confidence scoring algorithm
- `packages/scraper/src/discovery/youtube.ts` — YouTube Data API v3 search + detail fetch
- `packages/scraper/src/discovery/vimeo.ts` — Vimeo API search + detail fetch
- `packages/scraper/src/discovery/upsert.ts` — scored results → Postgres
- `packages/scraper/src/discovery/run.ts` — orchestration: search → dedupe → score → categorise → upsert
- `apps/web/components/productions/VideoGallery.tsx` — category tabs + thumbnail grid (client component)

**Modify:**
- `packages/db/src/schema/enums.ts` — add `videoSourceEnum`, `videoStatusEnum`, `videoCategoryEnum`
- `packages/db/src/schema/index.ts` — export `videos.ts`
- `packages/db/src/index.ts` — export video queries
- `packages/db/src/tests/migrations.test.ts` — update table count 22 → 23
- `packages/db/src/tests/cascades.test.ts` — add `production_videos` CASCADE test
- `packages/scraper/package.json` — add `discover:videos` script
- `packages/scraper/src/cli.ts` — add `discover:videos` command with `--slug` and `--pending` flags
- `packages/scraper/src/scheduler.ts` — call `discoverVideos()` after `import:vfx`
- `.env.example` — add `YOUTUBE_API_KEY` and `VIMEO_ACCESS_TOKEN`
- `docker-compose.yml` — add env vars to scraper service
- `apps/web/app/films/[slug]/page.tsx` — add parallel `getProductionVideos` call
- `apps/web/components/productions/ProductionDetail.tsx` — render `VideoGallery`

---

### Task 1: Add video enums to enums.ts

**Files:**
- Modify: `packages/db/src/schema/enums.ts`

- [ ] **Step 1: Add three new enums at the end of `packages/db/src/schema/enums.ts`**

```typescript
export const videoSourceEnum = pgEnum('video_source_enum', [
  'youtube', 'vimeo',
]);

export const videoStatusEnum = pgEnum('video_status_enum', [
  'published', 'pending', 'rejected',
]);

export const videoCategoryEnum = pgEnum('video_category_enum', [
  'vfx_breakdown', 'compositing', 'making_of', 'behind_the_scenes',
  'director_interview', 'dp_interview', 'production_design',
  'stunts', 'sound', 'music', 'other',
]);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @bts/db typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/enums.ts
git commit -m "feat(db): add video source/status/category enums"
```

---

### Task 2: Create production_videos schema

**Files:**
- Create: `packages/db/src/schema/videos.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create `packages/db/src/schema/videos.ts`**

```typescript
import { bigserial, bigint, boolean, date, index, integer, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { videoSourceEnum, videoStatusEnum, videoCategoryEnum } from './enums.ts';
import { productions } from './productions.ts';

export const productionVideos = pgTable('production_videos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  source: videoSourceEnum('source').notNull(),
  externalId: text('external_id').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  channelName: text('channel_name'),
  channelId: text('channel_id'),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'),
  viewCount: integer('view_count'),
  publishedAt: date('published_at'),
  category: videoCategoryEnum('category').notNull(),
  confidenceScore: numeric('confidence_score', { precision: 4, scale: 3 }).notNull(),
  status: videoStatusEnum('status').notNull().default('pending'),
  categoryLocked: boolean('category_locked').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('production_videos_unique').on(t.productionId, t.source, t.externalId),
  index('production_videos_status_idx').on(t.productionId, t.status, t.category),
]);
```

- [ ] **Step 2: Export from `packages/db/src/schema/index.ts`**

Add this line alongside the other schema exports:

```typescript
export * from './videos.ts';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @bts/db typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/videos.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add production_videos table schema"
```

---

### Task 3: Generate migration and update migration test

**Files:**
- Modify: `packages/db/src/tests/migrations.test.ts`

- [ ] **Step 1: Generate the migration**

```bash
pnpm --filter @bts/db generate
```

Expected: a new migration file appears under `packages/db/migrations/`

- [ ] **Step 2: Apply the migration**

```bash
pnpm --filter @bts/db migrate
```

Expected: migration applies cleanly

- [ ] **Step 3: Update the table count in `packages/db/src/tests/migrations.test.ts`**

Change:
```typescript
expect(tables.length).toBe(22);
```

To:
```typescript
expect(tables.length).toBe(23);
```

- [ ] **Step 4: Run migration tests**

```bash
pnpm --filter @bts/db test --reporter=verbose migrations
```

Expected: both migration tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/ packages/db/src/tests/migrations.test.ts
git commit -m "feat(db): migration for production_videos table"
```

---

### Task 4: Cascade test for production_videos

**Files:**
- Modify: `packages/db/src/tests/cascades.test.ts`

The cascade test file imports from schema index and uses the Drizzle ORM insert/delete helpers (not raw SQL). Follow the existing pattern exactly: insert a production, insert a production_videos row, delete the production, assert no orphans.

- [ ] **Step 1: Add `productionVideos` to the imports in `packages/db/src/tests/cascades.test.ts`**

Existing import block (partial):
```typescript
import {
  productions, scenes, ...
} from '../schema/index.ts';
```

Add `productionVideos` to that import.

- [ ] **Step 2: Add the cascade test to the `describe('cascade matrix — direct edges')` block**

```typescript
it('production deletion CASCADEs to production_videos', async () => {
  const [p] = await db.insert(productions)
    .values({ slug: 'casc-vid-1', type: 'feature', title: 'Test' })
    .returning();
  await db.insert(productionVideos).values({
    productionId: p.id,
    source: 'youtube',
    externalId: 'abc123',
    url: 'https://www.youtube.com/watch?v=abc123',
    title: 'Test Video',
    category: 'vfx_breakdown',
    confidenceScore: '0.800',
    status: 'published',
  });
  await db.delete(productions).where(eq(productions.id, p.id));
  const orphans = await db
    .select()
    .from(productionVideos)
    .where(eq(productionVideos.productionId, p.id));
  expect(orphans.length).toBe(0);
});
```

- [ ] **Step 3: Run the cascade tests**

```bash
pnpm --filter @bts/db test --reporter=verbose cascades
```

Expected: all cascade tests pass including the new one

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/tests/cascades.test.ts
git commit -m "test(db): add production_videos cascade test"
```

---

### Task 5: getProductionVideos query function

**Files:**
- Create: `packages/db/src/queries/videos.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create `packages/db/src/queries/videos.ts`**

```typescript
import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export interface ProductionVideo {
  id: number;
  source: 'youtube' | 'vimeo';
  external_id: string;
  url: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  published_at: string | null;
  category: string;
  confidence_score: string;
}

/**
 * Returns all published videos for a production, sorted by category then view_count DESC.
 * Returns an empty array if the production has no published videos.
 */
export async function getProductionVideos(
  db: SeedDb = defaultDb,
  productionId: number,
): Promise<ProductionVideo[]> {
  return db.execute<ProductionVideo>(sql`
    SELECT
      id,
      source,
      external_id,
      url,
      title,
      channel_name,
      thumbnail_url,
      duration_seconds,
      view_count,
      published_at,
      category,
      confidence_score
    FROM production_videos
    WHERE production_id = ${productionId}
      AND status = 'published'
    ORDER BY category, view_count DESC NULLS LAST
  `);
}
```

- [ ] **Step 2: Export from `packages/db/src/index.ts`**

Add this line alongside the other query exports:

```typescript
export * from './queries/videos.ts';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @bts/db typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/queries/videos.ts packages/db/src/index.ts
git commit -m "feat(db): add getProductionVideos query function"
```

---

### Task 6: Authority channel list

**Files:**
- Create: `packages/scraper/src/discovery/channels.ts`

This is a pure data file — no imports, no async. It exports two maps: one for YouTube channel IDs, one for Vimeo user IDs. The discovery pipeline checks these maps to award the channel authority score.

- [ ] **Step 1: Create `packages/scraper/src/discovery/channels.ts`**

```typescript
/**
 * Seeded authority channel lists for video discovery.
 *
 * YouTube: maps channel ID → human-readable label
 * Vimeo: maps user ID (string) → human-readable label
 *
 * A video whose channel is on either list receives the authority score bonus (0.25).
 * VFX-house channels also trigger automatic vfx_breakdown category assignment
 * regardless of title keywords.
 *
 * Extend these lists without code changes — add entries and re-run discovery.
 */

/** YouTube channel IDs */
export const YOUTUBE_AUTHORITY_CHANNELS: Record<string, string> = {
  // VFX Houses
  'UCT0jMpCT_arLJlBBFdpSP5A': 'ILM',
  'UCqGMZKaMU7pMOi6f4R6c3iA': 'Weta Digital',
  'UCEjBr1BjDu4aW4r9Ev1RfWA': 'DNEG',
  'UCiQ2EKz7YFwHBMC5aKLXtaA': 'MPC Film',
  'UCxM4hOlbSEy4aMzXeRJbIuA': 'Framestore',
  'UCrVk8lCZZ5j2lBiGHcYQIiA': 'Rodeo FX',
  'UCi_DaFzOvPsjoP2Wy1-VQBA': 'Scanline VFX',
  'UCuSrRpFEoN9b8VZ-ZOgR1Tg': 'Rising Sun Pictures',
  'UCYEoFpU4p3hJQqBY9rF7V3Q': 'Luma Pictures',

  // Generalist / editorial
  'UCSpFnDQr88xCZ80N-X7t0nQ': 'Corridor Crew',
  'UC2wfKFjB6hc4H8sYTT-G0zA': 'Corridor Digital',
  'UCHpKO7HjLOFCXoOjJFLTT_A': 'befores&afters',
  'UCkLiXCMUmO0K7kKlKl-iSpA': 'The Art of VFX',

  // Studios (official)
  'UCjmJDjHkXo4VJCkFjLME2dA': 'Warner Bros',
  'UCu4AkKRY17PLRzT5dKMKHXA': 'Universal Pictures',
  'UCF9imwFMN1vD54DtjBcJsYA': 'Paramount Pictures',
  'UCM9b6V4bMO0ACjnKGRbvKqA': 'Sony Pictures',
  'UCzWQYUVCpZqtN93H8RR44Qg': 'Walt Disney Studios',
  'UCJwoTxHkT4-q2BYqeVWFb7A': 'A24',
  'UCNbHJFv5pUBDcL5v1SFdhnA': 'Apple TV+',
  'UCi6WGj9HCmjCgiFVJqWGaFg': 'Netflix Film',
};

/** Vimeo user IDs (as strings) */
export const VIMEO_AUTHORITY_CHANNELS: Record<string, string> = {
  '6415759': 'ILM',
  '22765372': 'Weta Digital',
  '5396634': 'DNEG',
  '3116364': 'MPC Film',
  '1579234': 'Framestore',
  '7041135': 'Rodeo FX',
  '2600480': 'Corridor Crew',
  '14654697': 'befores&afters',
};

/** Channel IDs that belong to known VFX houses — these force vfx_breakdown category */
export const VFX_HOUSE_YOUTUBE_CHANNELS = new Set([
  'UCT0jMpCT_arLJlBBFdpSP5A', // ILM
  'UCqGMZKaMU7pMOi6f4R6c3iA', // Weta Digital
  'UCEjBr1BjDu4aW4r9Ev1RfWA', // DNEG
  'UCiQ2EKz7YFwHBMC5aKLXtaA', // MPC Film
  'UCxM4hOlbSEy4aMzXeRJbIuA', // Framestore
  'UCrVk8lCZZ5j2lBiGHcYQIiA', // Rodeo FX
  'UCi_DaFzOvPsjoP2Wy1-VQBA', // Scanline VFX
  'UCuSrRpFEoN9b8VZ-ZOgR1Tg', // Rising Sun Pictures
  'UCYEoFpU4p3hJQqBY9rF7V3Q', // Luma Pictures
]);

export const VFX_HOUSE_VIMEO_CHANNELS = new Set([
  '6415759',  // ILM
  '22765372', // Weta Digital
  '5396634',  // DNEG
  '3116364',  // MPC Film
  '1579234',  // Framestore
  '7041135',  // Rodeo FX
]);
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/discovery/channels.ts
git commit -m "feat(scraper): add authority channel list for video discovery"
```

---

### Task 7: Category assignment

**Files:**
- Create: `packages/scraper/src/discovery/categorise.ts`

Category is assigned after scoring. Priority order: (1) VFX house channel identity → `vfx_breakdown`; (2) Title keyword matching with `compositing` checked *before* `vfx_breakdown` to prevent keyword swallowing; (3) fallback → `other`.

- [ ] **Step 1: Create `packages/scraper/src/discovery/categorise.ts`**

```typescript
import { VFX_HOUSE_YOUTUBE_CHANNELS, VFX_HOUSE_VIMEO_CHANNELS } from './channels.ts';

type VideoCategory =
  | 'vfx_breakdown' | 'compositing' | 'making_of' | 'behind_the_scenes'
  | 'director_interview' | 'dp_interview' | 'production_design'
  | 'stunts' | 'sound' | 'music' | 'other';

interface CategoriseInput {
  source: 'youtube' | 'vimeo';
  channelId: string | null;
  title: string;
}

/**
 * Keyword lists per category. Checked in priority order.
 * compositing MUST be checked before vfx_breakdown to avoid being swallowed.
 */
const KEYWORD_CATEGORIES: Array<{ category: VideoCategory; keywords: string[] }> = [
  {
    category: 'compositing',
    keywords: ['compositing', 'nuke', 'colour grade', 'color grade'],
  },
  {
    category: 'vfx_breakdown',
    keywords: ['vfx', 'visual effects', 'breakdown', 'cgi'],
  },
  {
    category: 'making_of',
    keywords: ['making of', 'making-of', 'the making'],
  },
  {
    category: 'behind_the_scenes',
    keywords: ['behind the scenes', 'bts', 'on set', 'onset'],
  },
  {
    category: 'dp_interview',
    keywords: ['cinematography', 'director of photography', 'dp', 'cameraman', 'lenses'],
  },
  {
    category: 'director_interview',
    keywords: ['director', 'directed by'],
  },
  {
    category: 'production_design',
    keywords: ['production design', 'set design', 'art department'],
  },
  {
    category: 'stunts',
    keywords: ['stunts', 'stunt'],
  },
  {
    category: 'sound',
    keywords: ['sound design', 'score', 'audio'],
  },
  {
    category: 'music',
    keywords: ['soundtrack', 'composer', 'musical score'],
  },
];

export function categoriseVideo(input: CategoriseInput): VideoCategory {
  const { source, channelId, title } = input;

  // 1. VFX house channel identity — wins regardless of title
  if (channelId) {
    if (source === 'youtube' && VFX_HOUSE_YOUTUBE_CHANNELS.has(channelId)) {
      return 'vfx_breakdown';
    }
    if (source === 'vimeo' && VFX_HOUSE_VIMEO_CHANNELS.has(channelId)) {
      return 'vfx_breakdown';
    }
  }

  // 2. Title keyword matching (compositing checked first)
  const lowerTitle = title.toLowerCase();
  for (const { category, keywords } of KEYWORD_CATEGORIES) {
    if (keywords.some((kw) => lowerTitle.includes(kw))) {
      return category;
    }
  }

  // 3. Fallback
  return 'other';
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/discovery/categorise.ts
git commit -m "feat(scraper): add video category assignment"
```

---

### Task 8: Confidence scoring

**Files:**
- Create: `packages/scraper/src/discovery/score.ts`

The scoring function takes a video candidate and the production it was searched for, and returns a score in [0.0, 1.0]. Uses fuse.js (already a dependency of the scraper package) for fuzzy title matching.

- [ ] **Step 1: Create `packages/scraper/src/discovery/score.ts`**

```typescript
import Fuse from 'fuse.js';
import {
  YOUTUBE_AUTHORITY_CHANNELS,
  VIMEO_AUTHORITY_CHANNELS,
} from './channels.ts';

interface VideoCandidate {
  source: 'youtube' | 'vimeo';
  title: string;
  description: string;
  channelId: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
}

interface ProductionContext {
  title: string;
  releaseYear: number | null;
}

/**
 * Keyword lists used to award the keyword-match signal.
 * All categories share a single flat list for scoring — category assignment
 * is a separate step (categorise.ts).
 */
const RELEVANCE_KEYWORDS = [
  'breakdown', 'vfx', 'visual effects', 'cgi', 'making of', 'making-of',
  'behind the scenes', 'bts', 'cinematography', 'production design',
  'compositing', 'nuke', 'director', 'featurette', 'on set',
];

/**
 * Compute confidence score for a video candidate against a production.
 *
 * Signals and weights:
 *  0.30 — film title in video title (exact substring = 0.30; fuzzy = 0.15)
 *  0.10 — release year in video title or description
 *  0.25 — channel on authority list
 *  0.20 — relevance keyword in video title
 *  0.10 — duration between 90s and 1800s (30 min)
 *  0.05 — view count ≥ 10,000
 *
 * Maximum possible score = 1.00
 */
export function scoreVideo(
  candidate: VideoCandidate,
  production: ProductionContext,
): number {
  let score = 0;

  // Signal 1: film title in video title (0.30)
  const lowerTitle = candidate.title.toLowerCase();
  const lowerProductionTitle = production.title.toLowerCase();

  if (lowerTitle.includes(lowerProductionTitle)) {
    score += 0.30;
  } else {
    // Fuzzy match via fuse.js
    const fuse = new Fuse([candidate.title], {
      threshold: 0.3,
      includeScore: true,
    });
    const results = fuse.search(production.title);
    if (results.length > 0) {
      score += 0.15;
    }
  }

  // Signal 2: release year in title or description (0.10)
  if (production.releaseYear !== null) {
    const yearStr = String(production.releaseYear);
    if (
      candidate.title.includes(yearStr) ||
      candidate.description.includes(yearStr)
    ) {
      score += 0.10;
    }
  }

  // Signal 3: channel on authority list (0.25)
  if (candidate.channelId) {
    const authorityMap =
      candidate.source === 'youtube'
        ? YOUTUBE_AUTHORITY_CHANNELS
        : VIMEO_AUTHORITY_CHANNELS;
    if (candidate.channelId in authorityMap) {
      score += 0.25;
    }
  }

  // Signal 4: relevance keyword in video title (0.20)
  if (RELEVANCE_KEYWORDS.some((kw) => lowerTitle.includes(kw))) {
    score += 0.20;
  }

  // Signal 5: duration 90s–1800s (0.10)
  if (
    candidate.durationSeconds !== null &&
    candidate.durationSeconds >= 90 &&
    candidate.durationSeconds <= 1800
  ) {
    score += 0.10;
  }

  // Signal 6: view count ≥ 10,000 (0.05)
  if (candidate.viewCount !== null && candidate.viewCount >= 10_000) {
    score += 0.05;
  }

  return Math.min(score, 1.0);
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/discovery/score.ts
git commit -m "feat(scraper): add video confidence scoring"
```

---

### Task 9: YouTube Data API v3 client

**Files:**
- Create: `packages/scraper/src/discovery/youtube.ts`

Uses `search.list` (100 units/search) then `videos.list` to enrich with duration + view count. Requires `YOUTUBE_API_KEY` env var.

- [ ] **Step 1: Create `packages/scraper/src/discovery/youtube.ts`**

```typescript
import 'dotenv/config';

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  source: 'youtube';
  externalId: string;
  url: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
}

/** Parse ISO 8601 duration (e.g. PT4M13S) to seconds */
function parseDuration(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] ?? '0', 10);
  const min = parseInt(m[2] ?? '0', 10);
  const s = parseInt(m[3] ?? '0', 10);
  return h * 3600 + min * 60 + s;
}

/**
 * Search YouTube for a given query string and return up to maxResults videos
 * enriched with duration and view count.
 */
export async function searchYouTube(
  query: string,
  maxResults = 10,
): Promise<YouTubeVideo[]> {
  if (!API_KEY) {
    console.warn('YOUTUBE_API_KEY not set — skipping YouTube search');
    return [];
  }

  // Step 1: search.list — costs 100 quota units
  const searchUrl = new URL(`${BASE}/search`);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('maxResults', String(maxResults));
  searchUrl.searchParams.set('key', API_KEY);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    console.error(`YouTube search failed (${searchRes.status}): ${query}`);
    return [];
  }
  const searchData = await searchRes.json() as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        channelId: string;
        channelTitle: string;
        thumbnails?: { medium?: { url: string } };
        publishedAt: string;
      };
    }>;
  };

  const items = searchData.items ?? [];
  if (items.length === 0) return [];

  const videoIds = items.map((i) => i.id.videoId).join(',');

  // Step 2: videos.list to get contentDetails + statistics — costs 1 unit
  const detailUrl = new URL(`${BASE}/videos`);
  detailUrl.searchParams.set('part', 'contentDetails,statistics');
  detailUrl.searchParams.set('id', videoIds);
  detailUrl.searchParams.set('key', API_KEY);

  const detailRes = await fetch(detailUrl.toString());
  const detailData = detailRes.ok
    ? await detailRes.json() as {
        items?: Array<{
          id: string;
          contentDetails: { duration: string };
          statistics: { viewCount?: string };
        }>;
      }
    : { items: [] };

  const detailMap = new Map(
    (detailData.items ?? []).map((d) => [d.id, d]),
  );

  return items.map((item): YouTubeVideo => {
    const detail = detailMap.get(item.id.videoId);
    return {
      source: 'youtube',
      externalId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
      durationSeconds: detail ? parseDuration(detail.contentDetails.duration) : null,
      viewCount: detail?.statistics.viewCount
        ? parseInt(detail.statistics.viewCount, 10)
        : null,
      publishedAt: item.snippet.publishedAt.split('T')[0],
    };
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/discovery/youtube.ts
git commit -m "feat(scraper): add YouTube Data API v3 search client"
```

---

### Task 10: Vimeo API client

**Files:**
- Create: `packages/scraper/src/discovery/vimeo.ts`

Uses `/videos?query=<keywords>`. Vimeo does NOT support quoted-phrase search — quotes are stripped before sending. Rate limit: 60 calls/minute; implement inter-request delays. Requires `VIMEO_ACCESS_TOKEN` env var.

- [ ] **Step 1: Create `packages/scraper/src/discovery/vimeo.ts`**

```typescript
import 'dotenv/config';

const ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;
const BASE = 'https://api.vimeo.com';

/** Minimum ms between Vimeo API calls to stay under 60 calls/minute */
const RATE_LIMIT_DELAY_MS = 1_100; // 60 calls/min = 1s/call; 1.1s gives headroom

export interface VimeoVideo {
  source: 'vimeo';
  externalId: string;
  url: string;
  title: string;
  description: string;
  channelId: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
}

let _lastCallAt = 0;

async function rateLimitedFetch(url: string, headers: Record<string, string>): Promise<Response> {
  const now = Date.now();
  const elapsed = now - _lastCallAt;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - elapsed));
  }
  _lastCallAt = Date.now();
  return fetch(url, { headers });
}

/**
 * Search Vimeo for a given query string and return up to maxResults videos.
 *
 * IMPORTANT: Vimeo does not support quoted-phrase search. Quotes are stripped
 * from the query string before sending. Query terms are plain keywords.
 */
export async function searchVimeo(
  query: string,
  maxResults = 10,
): Promise<VimeoVideo[]> {
  if (!ACCESS_TOKEN) {
    console.warn('VIMEO_ACCESS_TOKEN not set — skipping Vimeo search');
    return [];
  }

  // Strip quotes — Vimeo doesn't support quoted-phrase search
  const keywords = query.replace(/"/g, '');

  const url = new URL(`${BASE}/videos`);
  url.searchParams.set('query', keywords);
  url.searchParams.set('per_page', String(maxResults));
  url.searchParams.set('fields', [
    'uri', 'name', 'description', 'duration', 'stats.plays',
    'created_time', 'user', 'pictures',
  ].join(','));

  const res = await rateLimitedFetch(url.toString(), {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    Accept: 'application/json',
  });

  if (!res.ok) {
    console.error(`Vimeo search failed (${res.status}): ${keywords}`);
    return [];
  }

  const data = await res.json() as {
    data?: Array<{
      uri: string;
      name: string;
      description: string | null;
      duration: number;
      stats?: { plays?: number | null };
      created_time: string;
      user?: { uri: string; name: string } | null;
      pictures?: { sizes?: Array<{ width: number; link: string }> } | null;
    }>;
  };

  return (data.data ?? []).map((item): VimeoVideo => {
    const videoId = item.uri.replace('/videos/', '');
    const userId = item.user?.uri?.replace('/users/', '') ?? null;

    // Pick a medium-sized thumbnail (prefer ~640px wide)
    const thumbs = item.pictures?.sizes ?? [];
    const thumb =
      thumbs.find((s) => s.width >= 640) ??
      thumbs[thumbs.length - 1] ??
      null;

    return {
      source: 'vimeo',
      externalId: videoId,
      url: `https://vimeo.com/${videoId}`,
      title: item.name,
      description: item.description ?? '',
      channelId: userId,
      channelName: item.user?.name ?? null,
      thumbnailUrl: thumb?.link ?? null,
      durationSeconds: item.duration,
      viewCount: item.stats?.plays ?? null,
      publishedAt: item.created_time.split('T')[0],
    };
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/discovery/vimeo.ts
git commit -m "feat(scraper): add Vimeo API search client with rate limiting"
```

---

### Task 11: Upsert discovered videos

**Files:**
- Create: `packages/scraper/src/discovery/upsert.ts`

On conflict `(production_id, source, external_id)`:
- `status` is only *upgraded* (pending → published), never downgraded — a manually rejected video stays rejected
- `view_count`, `thumbnail_url`, `title` are refreshed to the latest API values
- `confidence_score` is updated to the latest score
- `category` is NOT changed when `category_locked = true`
- Results scoring < 0.40 are discarded (not stored)

- [ ] **Step 1: Create `packages/scraper/src/discovery/upsert.ts`**

```typescript
import 'dotenv/config';
import { db, sql } from '@bts/db';

export interface ScoredVideo {
  productionId: number;
  source: 'youtube' | 'vimeo';
  externalId: string;
  url: string;
  title: string;
  channelName: string | null;
  channelId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
  category: string;
  confidenceScore: number;
}

/** Threshold constants (mirrors the spec) */
const THRESHOLD_PUBLISHED = 0.65;
const THRESHOLD_PENDING = 0.40;

/**
 * Upsert a single scored+categorised video into production_videos.
 * Videos below the discard threshold are skipped.
 */
export async function upsertVideo(video: ScoredVideo): Promise<void> {
  if (video.confidenceScore < THRESHOLD_PENDING) {
    return; // discard
  }

  const status = video.confidenceScore >= THRESHOLD_PUBLISHED ? 'published' : 'pending';
  const scoreStr = video.confidenceScore.toFixed(3);

  await db.execute(sql`
    INSERT INTO production_videos (
      production_id, source, external_id, url, title,
      channel_name, channel_id, thumbnail_url, duration_seconds, view_count,
      published_at, category, confidence_score, status
    ) VALUES (
      ${video.productionId}, ${video.source}, ${video.externalId}, ${video.url}, ${video.title},
      ${video.channelName ?? null}, ${video.channelId ?? null},
      ${video.thumbnailUrl ?? null}, ${video.durationSeconds ?? null}, ${video.viewCount ?? null},
      ${video.publishedAt ?? null}, ${video.category}, ${scoreStr}, ${status}
    )
    ON CONFLICT (production_id, source, external_id) DO UPDATE SET
      -- refresh mutable fields
      title           = EXCLUDED.title,
      thumbnail_url   = EXCLUDED.thumbnail_url,
      view_count      = EXCLUDED.view_count,
      confidence_score = EXCLUDED.confidence_score,
      -- status: only upgrade (pending → published), never downgrade
      status = CASE
        WHEN production_videos.status = 'rejected' THEN 'rejected'
        WHEN production_videos.status = 'published' THEN 'published'
        ELSE EXCLUDED.status
      END,
      -- category: only update if not manually locked
      category = CASE
        WHEN production_videos.category_locked THEN production_videos.category
        ELSE EXCLUDED.category
      END,
      updated_at = NOW()
  `);
}

/**
 * Upsert a batch of scored videos, logging a summary per production.
 */
export async function upsertVideos(videos: ScoredVideo[]): Promise<void> {
  let published = 0, pending = 0, discarded = 0;
  for (const v of videos) {
    if (v.confidenceScore < THRESHOLD_PENDING) { discarded++; continue; }
    await upsertVideo(v);
    if (v.confidenceScore >= THRESHOLD_PUBLISHED) published++; else pending++;
  }
  console.log(`  upsert: ${published} published, ${pending} pending, ${discarded} discarded`);
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/discovery/upsert.ts
git commit -m "feat(scraper): add video discovery upsert with status upgrade logic"
```

---

### Task 12: Discovery orchestrator

**Files:**
- Create: `packages/scraper/src/discovery/run.ts`

Orchestrates: for each production, run all 6 query templates × 2 APIs, pool results, deduplicate by `(source, externalId)`, score, categorise, upsert. Also handles the `--pending` re-score mode.

- [ ] **Step 1: Create `packages/scraper/src/discovery/run.ts`**

```typescript
import 'dotenv/config';
import { db, sql } from '@bts/db';
import { searchYouTube, type YouTubeVideo } from './youtube.ts';
import { searchVimeo, type VimeoVideo } from './vimeo.ts';
import { scoreVideo } from './score.ts';
import { categoriseVideo } from './categorise.ts';
import { upsertVideos, type ScoredVideo } from './upsert.ts';

type AnyVideo = YouTubeVideo | VimeoVideo;

interface ProductionRow {
  id: number;
  slug: string;
  title: string;
  release_year: number | null;
}

/**
 * Query templates. The placeholder [title] and [year] are replaced per production.
 * Quotes are used verbatim for YouTube; stripped for Vimeo.
 */
const QUERY_TEMPLATES = [
  '"[title] [year] vfx breakdown"',
  '"[title] [year] visual effects"',
  '"[title] [year] making of"',
  '"[title] [year] behind the scenes"',
  '"[title] [year] cinematography"',
  '"[title] [year] production design"',
];

function buildQuery(template: string, title: string, year: number | null): string {
  return template
    .replace('[title]', title)
    .replace('[year]', year !== null ? String(year) : '');
}

async function loadProductions(slugFilter?: string): Promise<ProductionRow[]> {
  if (slugFilter) {
    return db.execute<ProductionRow>(sql`
      SELECT id, slug, title, release_year FROM productions WHERE slug = ${slugFilter}
    `);
  }
  return db.execute<ProductionRow>(sql`
    SELECT id, slug, title, release_year FROM productions ORDER BY release_year DESC, title
  `);
}

/**
 * Run video discovery for one or all productions.
 *
 * @param slugFilter  Optional production slug — runs for that production only.
 */
export async function discoverVideos(slugFilter?: string): Promise<void> {
  const productions = await loadProductions(slugFilter);
  console.log(`discover:videos — ${productions.length} production(s)`);

  for (const production of productions) {
    console.log(`  [${production.slug}] searching...`);

    // Build all 6 query strings for this production
    const queries = QUERY_TEMPLATES.map((t) =>
      buildQuery(t, production.title, production.release_year),
    );

    // Run all queries against both APIs, collect results
    const rawResults: AnyVideo[] = [];
    for (const query of queries) {
      const [ytResults, vmResults] = await Promise.all([
        searchYouTube(query, 10).catch((e) => {
          console.error(`  YouTube error: ${e instanceof Error ? e.message : String(e)}`);
          return [] as YouTubeVideo[];
        }),
        searchVimeo(query, 10).catch((e) => {
          console.error(`  Vimeo error: ${e instanceof Error ? e.message : String(e)}`);
          return [] as VimeoVideo[];
        }),
      ]);
      rawResults.push(...ytResults, ...vmResults);
    }

    // Deduplicate by (source, externalId)
    const seen = new Set<string>();
    const candidates = rawResults.filter((v) => {
      const key = `${v.source}:${v.externalId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`  [${production.slug}] ${candidates.length} candidates after dedup`);

    // Score, categorise, and collect for upsert
    const scored: ScoredVideo[] = candidates.map((v) => {
      const confidenceScore = scoreVideo(
        {
          source: v.source,
          title: v.title,
          description: v.description,
          channelId: v.channelId,
          durationSeconds: v.durationSeconds,
          viewCount: v.viewCount,
          publishedAt: v.publishedAt,
        },
        { title: production.title, releaseYear: production.release_year },
      );

      const category = categoriseVideo({
        source: v.source,
        channelId: v.channelId,
        title: v.title,
      });

      return {
        productionId: production.id,
        source: v.source,
        externalId: v.externalId,
        url: v.url,
        title: v.title,
        channelName: v.channelName,
        channelId: v.channelId,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        viewCount: v.viewCount,
        publishedAt: v.publishedAt,
        category,
        confidenceScore,
      };
    });

    await upsertVideos(scored);
  }

  console.log('discover:videos complete');
}

/**
 * Re-score all existing pending rows (e.g. after tuning weights).
 * Reads pending rows from the DB, re-runs scoring, updates confidence_score and status.
 */
export async function rescorePending(): Promise<void> {
  console.log('discover:videos --pending — re-scoring pending rows...');

  const pendingRows = await db.execute<{
    id: number;
    production_title: string;
    release_year: number | null;
    source: 'youtube' | 'vimeo';
    external_id: string;
    title: string;
    channel_id: string | null;
    duration_seconds: number | null;
    view_count: number | null;
  }>(sql`
    SELECT
      pv.id, p.title AS production_title, p.release_year,
      pv.source, pv.external_id, pv.title,
      pv.channel_id, pv.duration_seconds, pv.view_count
    FROM production_videos pv
    JOIN productions p ON p.id = pv.production_id
    WHERE pv.status = 'pending'
  `);

  console.log(`  ${pendingRows.length} pending rows to re-score`);
  let upgraded = 0;

  for (const row of pendingRows) {
    const newScore = scoreVideo(
      {
        source: row.source,
        title: row.title,
        description: '',
        channelId: row.channel_id,
        durationSeconds: row.duration_seconds,
        viewCount: row.view_count,
        publishedAt: null,
      },
      { title: row.production_title, releaseYear: row.release_year },
    );

    const newStatus = newScore >= 0.65 ? 'published' : 'pending';
    await db.execute(sql`
      UPDATE production_videos
      SET confidence_score = ${newScore.toFixed(3)},
          status = CASE
            WHEN status = 'rejected' THEN 'rejected'
            WHEN status = 'published' THEN 'published'
            ELSE ${newStatus}
          END,
          updated_at = NOW()
      WHERE id = ${row.id}
    `);
    if (newStatus === 'published') upgraded++;
  }

  console.log(`  Re-scored ${pendingRows.length} rows, ${upgraded} upgraded to published`);
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/discovery/run.ts
git commit -m "feat(scraper): add video discovery orchestrator"
```

---

### Task 13: Extend CLI and scheduler

**Files:**
- Modify: `packages/scraper/package.json`
- Modify: `packages/scraper/src/cli.ts`
- Modify: `packages/scraper/src/scheduler.ts`

- [ ] **Step 1: Add `discover:videos` script to `packages/scraper/package.json`**

In the `"scripts"` block, add alongside existing scripts:

```json
"discover:videos": "tsx src/cli.ts discover:videos"
```

- [ ] **Step 2: Extend `packages/scraper/src/cli.ts`** to add the `discover:videos` command

Add to the top of the file, alongside existing imports:

```typescript
import { discoverVideos, rescorePending } from './discovery/run.ts';
```

Add a new `case` in the `switch (command)` block, before `default`:

```typescript
case 'discover:videos': {
  const isPending = args.includes('--pending');
  if (isPending) {
    await rescorePending();
  } else {
    await discoverVideos(slugFlag);
  }
  break;
}
```

Also update the `run` case so discovery runs after `import:vfx`:

```typescript
case 'run':
  console.log('run: scrape:artofvfx → scrape:beforesandafters → import:vfx → discover:videos');
  await scrapeArtOfVfx(slugFlag);
  await scrapeBeforesAndAfters(slugFlag);
  await importVfx();
  try {
    await discoverVideos(slugFlag);
  } catch (e) {
    console.error('discover:videos failed:', e instanceof Error ? e.message : String(e));
  }
  break;
```

Also update the `default` error message to list the new command:

```typescript
console.error('Usage: tsx src/cli.ts <scrape:artofvfx|scrape:beforesandafters|import:vfx|discover:videos|run> [--slug <slug>] [--pending]');
```

- [ ] **Step 3: Extend `packages/scraper/src/scheduler.ts`** to call `discoverVideos()` after `import:vfx`

Add to the top alongside existing imports:

```typescript
import { discoverVideos } from './discovery/run.ts';
```

In the `cron.schedule` callback, add after the `import:vfx` try/catch block:

```typescript
try {
  await discoverVideos();
} catch (e) {
  console.error('discover:videos failed:', e instanceof Error ? e.message : String(e));
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 5: Smoke-test the CLI**

```bash
pnpm --filter @bts/scraper discover:videos --slug non-existent-slug-test
```

Expected: `discover:videos — 0 production(s)` or similar (no error, no crash). If `YOUTUBE_API_KEY` and `VIMEO_ACCESS_TOKEN` are not set, expect the "not set — skipping" warnings and graceful exit.

- [ ] **Step 6: Commit**

```bash
git add packages/scraper/package.json packages/scraper/src/cli.ts packages/scraper/src/scheduler.ts
git commit -m "feat(scraper): extend CLI and scheduler with discover:videos command"
```

---

### Task 14: Environment variables and Docker

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add the two new env vars to `.env.example`**

Find the existing scraper section (or add a new section) and append:

```bash
# Video discovery — YouTube Data API v3
# Obtain from Google Cloud Console → APIs & Services → YouTube Data API v3
YOUTUBE_API_KEY=

# Video discovery — Vimeo API
# Obtain from https://developer.vimeo.com → My Apps → New App → Authentication
VIMEO_ACCESS_TOKEN=
```

- [ ] **Step 2: Add the env vars to the scraper service in `docker-compose.yml`**

Locate the `scraper` service's `environment` block (added by the VFX breakdowns plan) and add:

```yaml
      YOUTUBE_API_KEY: "${YOUTUBE_API_KEY:-}"
      VIMEO_ACCESS_TOKEN: "${VIMEO_ACCESS_TOKEN:-}"
```

The `:-` default means the container starts without error even if the vars are not set in the host environment — discovery will log the "not set — skipping" warnings and return empty results gracefully.

- [ ] **Step 3: Commit**

```bash
git add .env.example docker-compose.yml
git commit -m "feat(scraper): add YOUTUBE_API_KEY and VIMEO_ACCESS_TOKEN env vars"
```

---

### Task 15: VideoGallery component

**Files:**
- Create: `apps/web/components/productions/VideoGallery.tsx`

Client component — tab state requires `'use client'`. Hidden entirely if the production has no published videos. Category tabs show "All (N)" plus one tab per category that has at least one video. Active tab highlighted in amber. 3-column thumbnail grid; each card links externally.

- [ ] **Step 1: Create `apps/web/components/productions/VideoGallery.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { ProductionVideo } from '@bts/db';

const CATEGORY_LABELS: Record<string, string> = {
  vfx_breakdown: 'VFX Breakdown',
  compositing: 'Compositing',
  making_of: 'Making Of',
  behind_the_scenes: 'Behind the Scenes',
  director_interview: 'Director Interview',
  dp_interview: 'DP Interview',
  production_design: 'Production Design',
  stunts: 'Stunts',
  sound: 'Sound',
  music: 'Music',
  other: 'Other',
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(count: number | null): string {
  if (count === null) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

interface VideoCardProps {
  video: ProductionVideo;
}

function VideoCard({ video }: VideoCardProps) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors"
    >
      {/* 16:9 thumbnail */}
      <div className="relative aspect-video w-full bg-zinc-950">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl text-zinc-700">▶</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-200">
          {video.title}
        </p>
        <span className="inline-block self-start rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] text-amber-500 border border-zinc-800">
          {CATEGORY_LABELS[video.category] ?? video.category}
        </span>
        <p className="mt-auto text-[10px] text-zinc-500">
          {[
            video.channel_name,
            formatDuration(video.duration_seconds),
            formatViews(video.view_count),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </a>
  );
}

interface VideoGalleryProps {
  videos: ProductionVideo[];
}

export function VideoGallery({ videos }: VideoGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (videos.length === 0) return null;

  // Build category tab list (only categories that have at least one video)
  const categoryCounts = new Map<string, number>();
  for (const v of videos) {
    categoryCounts.set(v.category, (categoryCounts.get(v.category) ?? 0) + 1);
  }

  const visibleVideos =
    activeCategory === 'all'
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  return (
    <div className="mt-8">
      <SectionHeader label="Production" heading="Videos" />

      {/* Category filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`rounded px-3 py-1 text-xs transition-colors ${
            activeCategory === 'all'
              ? 'bg-amber-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          All ({videos.length})
        </button>
        {[...categoryCounts.entries()]
          .sort(([, a], [, b]) => b - a)
          .map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                activeCategory === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat} ({count})
            </button>
          ))}
      </div>

      {/* 3-column thumbnail grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleVideos.map((v) => (
          <VideoCard key={`${v.source}:${v.external_id}`} video={v} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/web typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/productions/VideoGallery.tsx
git commit -m "feat(web): add VideoGallery component with category tabs and thumbnail grid"
```

---

### Task 16: Wire VideoGallery into the film detail page

**Files:**
- Modify: `apps/web/app/films/[slug]/page.tsx`
- Modify: `apps/web/components/productions/ProductionDetail.tsx`

- [ ] **Step 1: Update `apps/web/app/films/[slug]/page.tsx`** to fetch videos in parallel with the existing queries

Current `FilmDetailPage` body:
```typescript
const data = await getProductionWithFullDetail(db, params.slug);
if (!data) notFound();
const media = await fetchTmdbMedia(data.production.tmdb_id);
return <ProductionDetail data={data} media={media} />;
```

After the VFX breakdowns plan, this will already be:
```typescript
const data = await getProductionWithFullDetail(db, params.slug);
if (!data) notFound();
const [media, vfx] = await Promise.all([
  fetchTmdbMedia(data.production.tmdb_id),
  getProductionVfxData(db, data.production.id),
]);
return <ProductionDetail data={data} media={media} vfx={vfx} />;
```

Extend to add the `videos` call to the existing `Promise.all`:

```typescript
import { getProductionWithFullDetail, getProductionVfxData, getProductionVideos, db } from '@bts/db';

const data = await getProductionWithFullDetail(db, params.slug);
if (!data) notFound();

const [media, vfx, videos] = await Promise.all([
  fetchTmdbMedia(data.production.tmdb_id),
  getProductionVfxData(db, data.production.id),
  getProductionVideos(db, data.production.id),
]);

return <ProductionDetail data={data} media={media} vfx={vfx} videos={videos} />;
```

> **Note:** If the VFX breakdowns plan has not yet been applied, the baseline is the original one-call version. In that case, expand `Promise.all` from scratch with all three parallel calls (media, vfx, videos). Either way, the end state is the three-call `Promise.all` above.

- [ ] **Step 2: Update `apps/web/components/productions/ProductionDetail.tsx`** to accept and render `VideoGallery`

Add the import at the top of the file:

```typescript
import { VideoGallery } from './VideoGallery';
import type { getProductionVideos } from '@bts/db';

type VideosData = Awaited<ReturnType<typeof getProductionVideos>>;
```

Add `videos` to the props type:

```typescript
export function ProductionDetail({
  data, media, vfx, videos,
}: {
  data: DetailData;
  media: TmdbMedia | null;
  vfx: VfxData;
  videos: VideosData;
}) {
```

Add `<VideoGallery>` after `<VfxSection>` (or after the crew section if the VFX plan has not yet been applied):

```tsx
<VfxSection credits={vfx.credits} techniques={vfx.techniques} />
<VideoGallery videos={videos} />
<SceneList rows={scenes} />
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @bts/web typecheck
```

Expected: no errors

- [ ] **Step 4: Run the full test suite**

```bash
pnpm --filter @bts/db test
```

Expected: all tests pass (migration count = 23, cascade tests pass)

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/films/[slug]/page.tsx apps/web/components/productions/ProductionDetail.tsx
git commit -m "feat(web): wire VideoGallery into film detail page"
```

---

## Implementation complete

After all 16 tasks pass:

- `production_videos` table is live with the correct schema, unique constraint, and index
- Weekly scheduled discovery runs after `import:vfx` for all productions
- Discovery can be triggered manually: `pnpm --filter @bts/scraper discover:videos [--slug <slug>]`
- Pending rows can be re-scored: `pnpm --filter @bts/scraper discover:videos --pending`
- Film detail pages show a `VideoGallery` section when published videos exist, with category tabs and a 3-column thumbnail grid
- All videos open externally (`target="_blank"`)
