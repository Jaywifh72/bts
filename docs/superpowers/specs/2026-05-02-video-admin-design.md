# Video Admin Review UI — Design

**Date:** 2026-05-02
**Status:** Approved
**Scope:** Sub-feature of Web App (sub-project 2)

## Problem

The video discovery scraper produced 465 pending videos scored 0.40–0.64. Currently invisible — there is no UI to review them. Manual approval would 5–10× the published-video count.

## Goal

A protected `/admin/videos` page that lets a single operator triage pending videos: approve, reject, or recategorize, with one click each.

## Decisions

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Authentication | **Single shared token via `ADMIN_TOKEN` env var, checked in middleware** | Full auth is sub-project 6. This is single-user, non-prod gating that ships in 30 minutes and can be replaced cleanly. |
| 2 | Mutation transport | **Next.js Server Actions** | Codebase already uses RSC; no API surface needed; type-safe end-to-end. |
| 3 | Status transitions | `pending → published \| rejected`; `published → pending \| rejected`; `rejected → pending \| published`. All transitions allowed. | Operator may change their mind. The discovery scraper already respects sticky `published` and `rejected` (won't downgrade). |
| 4 | On reject | Set `status=rejected` AND `category_locked=true` | Prevents the next scraper run from re-suggesting the same video in a different category. |
| 5 | On recategorize | Set new category AND `category_locked=true` | Locks the operator's choice against future automatic re-categorization. |
| 6 | Filtering | By production (dropdown), by status (default: pending), by category | Operator workflow is "show me Dune pending vfx_breakdown candidates". |
| 7 | Sort | `confidence_score DESC, created_at DESC` | Highest-confidence first. |
| 8 | Pagination | 50 per page, `?page=N` | 465 pending → 10 pages, manageable. |
| 9 | Read patterns | Read via existing `getProductionVideos`-style query, new `listVideosForReview()` query function in `@bts/db` | Keeps query layer centralized. |
| 10 | Audit trail | Out of scope for v1 | `updated_at` timestamp captures last change; full audit log when the editorial sub-project ships. |

## Architecture

```
apps/web/
├── middleware.ts                          ← gate /admin/* on ADMIN_TOKEN cookie
├── app/admin/
│   ├── layout.tsx                         ← admin nav, "logged in as admin" indicator
│   ├── login/page.tsx                     ← form: paste token, set cookie
│   └── videos/
│       ├── page.tsx                       ← server component: list + filters
│       └── actions.ts                     ← server actions: approve, reject, recategorize
└── components/admin/
    ├── VideoReviewTable.tsx               ← client component for interactive rows
    └── VideoReviewFilters.tsx             ← production + status + category dropdowns

packages/db/src/queries/videos.ts          ← add listVideosForReview, updateVideoStatus,
                                            updateVideoCategory
```

## Auth flow

1. User navigates to `/admin/videos` → middleware checks `admin_token` cookie
2. If missing/invalid → redirect to `/admin/login`
3. Login page: text input + submit; on submit, server action sets HttpOnly cookie if value matches `ADMIN_TOKEN` env var, else returns error
4. Logout: same form action with `clear=true` flag

## Server actions

```typescript
// app/admin/videos/actions.ts
'use server';

export async function approveVideo(id: number) { ... }
export async function rejectVideo(id: number) { ... }    // sets category_locked=true
export async function setVideoCategory(id: number, category: VideoCategory) { ... } // sets category_locked=true
```

Each action revalidates `/admin/videos` and the relevant `/films/[slug]` page.

## Out of scope

- Bulk operations (multi-select approve)
- Audit log of who changed what (single-user)
- Image moderation / NSFW detection
- Notes / comments on videos (the `notes` column exists; UI deferred)
- Mobile-optimized UI

## Test plan

1. **Query layer:** `listVideosForReview` with filters returns expected rows in expected order
2. **Server actions:** approve/reject/recategorize each updates the right columns and locks category appropriately
3. **Middleware:** unauthenticated request to `/admin/videos` redirects to `/admin/login`
4. **Manual smoke:** log in, filter by Dune, approve 3 videos, verify they appear on `/films/dune-part-two-2024`
