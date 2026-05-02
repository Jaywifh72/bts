# Video Admin Review UI — Implementation Plan

> Sub-feature of the web app. Adds `/admin/videos` for triaging the 465 pending videos produced by the discovery scraper.

**Goal:** Single-operator admin UI to approve / reject / recategorize discovered videos.

**Architecture:** Next.js Server Actions on top of new query functions in `@bts/db`. Cookie-based gate using a single `ADMIN_TOKEN` env var. Server-rendered list with client-side action buttons.

**Tech Stack:** Next.js 14 App Router, Server Actions, Drizzle, Tailwind. No new runtime dependencies.

---

## Task 1: DB query layer extensions

**Files:**
- Modify: `packages/db/src/queries/videos.ts`
- Test: `packages/db/src/tests/videos-admin.test.ts` (create)

**Step 1: Write failing test**

Create test file with three cases:
- `listVideosForReview()` with `status='pending'` returns rows ordered by confidence_score DESC, created_at DESC
- `listVideosForReview()` accepts optional `productionSlug` and `category` filters
- Returns at most `limit` rows starting at `offset`

**Step 2: Implement**

Add to `videos.ts`:
- Type `VideoForReview` = ProductionVideo + `production_id`, `production_title`, `production_slug`, `status`, `category_locked`
- Function `listVideosForReview(db, { status, productionSlug, category, limit, offset })` joins productions, applies filters
- Function `countVideosForReview(db, filters)` for pagination total
- Function `updateVideoStatus(db, id, newStatus)` — pure status update
- Function `updateVideoCategory(db, id, newCategory)` — sets category + category_locked=true
- Function `rejectVideo(db, id)` — sets status='rejected' AND category_locked=true

All mutations bump updated_at = NOW().

**Step 3: Run tests**

`pnpm --filter @bts/db test src/tests/videos-admin.test.ts` — expect PASS.

**Step 4: Commit**

`feat(db): add admin video review queries and mutations`

---

## Task 2: Auth middleware + login page

**Files:**
- Create: `apps/web/middleware.ts`
- Create: `apps/web/app/admin/login/page.tsx`
- Create: `apps/web/app/admin/login/actions.ts`
- Modify: `apps/web/.env.local` (document `ADMIN_TOKEN`)

**Step 1: Middleware**

```typescript
// apps/web/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.cookies.get('admin_token')?.value;
  if (!expected || provided !== expected) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/((?!login).*)'],
};
```

**Step 2: Login page (server component) + server action**

`actions.ts`:
```typescript
'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const next = String(formData.get('next') ?? '/admin/videos');
  if (token !== process.env.ADMIN_TOKEN) redirect('/admin/login?error=invalid');
  cookies().set('admin_token', token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
  });
  redirect(next);
}

export async function logout() {
  cookies().delete('admin_token');
  redirect('/admin/login');
}
```

`login/page.tsx`: simple form, password input named `token`, hidden `next` from `searchParams`, error banner if `?error=invalid`.

**Step 3: Manual smoke**

Start dev server, navigate to `/admin/videos`. Expect redirect to `/admin/login?next=/admin/videos`. Submit wrong token → error. Submit `ADMIN_TOKEN` value → redirected to `/admin/videos` (which will 404 until task 4).

**Step 4: Commit**

`feat(web): add admin auth middleware and login page`

---

## Task 3: Admin layout

**Files:**
- Create: `apps/web/app/admin/layout.tsx`

**Step 1: Implement**

Server component layout that:
- Shows a small header bar: "Admin" + page title + logout button (form posting to `logout` action)
- Uses same dark Tailwind palette as the public site
- Wraps `{children}` in a `max-w-screen-2xl mx-auto px-6 py-4` container

**Step 2: Commit**

`feat(web): add admin layout`

---

## Task 4: Admin videos page (server component)

**Files:**
- Create: `apps/web/app/admin/videos/page.tsx`
- Create: `apps/web/app/admin/videos/actions.ts`

**Step 1: Server actions**

```typescript
'use server';
import { db } from '@bts/db';
import { revalidatePath } from 'next/cache';
import { rejectVideo as rejectVideoQuery, updateVideoStatus, updateVideoCategory } from '@bts/db/queries/videos';

export async function approve(id: number) {
  await updateVideoStatus(db, id, 'published');
  revalidatePath('/admin/videos');
}

export async function reject(id: number) {
  await rejectVideoQuery(db, id);
  revalidatePath('/admin/videos');
}

export async function recategorize(id: number, category: VideoCategory) {
  await updateVideoCategory(db, id, category);
  revalidatePath('/admin/videos');
}
```

**Step 2: Page**

Server component that:
- Reads `searchParams`: `status` (default `pending`), `productionSlug`, `category`, `page` (default 1)
- Calls `listVideosForReview` with `limit=50, offset=(page-1)*50`
- Calls `countVideosForReview` for total
- Renders `<VideoReviewFilters />` (built in Task 5) with current filter values
- Renders `<VideoReviewTable videos={videos} />` (built in Task 5)
- Renders pagination links (prev / page X of Y / next)

**Step 3: Commit**

`feat(web): add /admin/videos page and server actions`

---

## Task 5: Filter and table components

**Files:**
- Create: `apps/web/components/admin/VideoReviewFilters.tsx` (server component, just a form)
- Create: `apps/web/components/admin/VideoReviewRow.tsx` (client component)
- Create: `apps/web/components/admin/VideoReviewTable.tsx` (server component, maps rows)

**Step 1: VideoReviewFilters (server component)**

Plain `<form method="get">` with:
- `<select name="status">` (pending / published / rejected / all)
- `<select name="productionSlug">` populated from a list of all productions that have videos
- `<select name="category">` (all category enum values + 'all')
- Submit button "Apply"
- Reset link clearing query params

To populate the production dropdown, the page passes `productionsWithVideos: { slug, title }[]` to this component (one extra DB query per page render, OK at this scale).

**Step 2: VideoReviewRow (client component)**

```typescript
'use client';
import { approve, reject, recategorize } from '../../app/admin/videos/actions';
```

For each video row, render:
- Thumbnail (96×54), clickable → opens external URL in new tab
- Title + channel name
- Source badge (YouTube / Vimeo)
- Confidence score (color-coded: green ≥0.65, amber ≥0.40, red <0.40)
- Current status badge
- Current category dropdown — onChange calls `recategorize(id, newValue)`
- Action buttons:
  - "Approve" (green) — calls `approve(id)`, only shown when status !== 'published'
  - "Reject" (red) — calls `reject(id)`, only shown when status !== 'rejected'
  - "Reset to pending" — only shown when status !== 'pending'

Use `useTransition()` for pending state; disable buttons during action.

**Step 3: VideoReviewTable (server component)**

Just maps `videos.map(v => <VideoReviewRow key={v.id} video={v} />)` inside a `<div>` with table-like Tailwind classes.

**Step 4: Smoke test**

Start dev server, log in, hit `/admin/videos`. Expect to see 50 pending videos sorted by confidence, with working filters and action buttons.

**Step 5: Commit**

`feat(web): add admin video review components`

---

## Task 6: Documentation + .env.example

**Files:**
- Modify: `.env.example` (add `ADMIN_TOKEN=change-me-in-prod` with note)
- Modify: `apps/web/README.md` (create if missing) explaining `/admin/videos`

**Step 1: Commit**

`docs: document ADMIN_TOKEN and /admin/videos`

---

## Verification (after all tasks)

1. `pnpm --filter @bts/db test` — all 31 tests + the new admin tests pass
2. Manual smoke:
   - Log in with wrong token → error
   - Log in with correct token → see /admin/videos
   - Filter by Dune → see Dune candidates only
   - Approve a video → it disappears from pending list AND appears on `/films/dune-part-two-2024`
   - Reject a video → it disappears from pending; verify in DB that `category_locked=true`
   - Recategorize a video → category updates; verify in DB that `category_locked=true`
   - Logout → cookie cleared, redirect to login
