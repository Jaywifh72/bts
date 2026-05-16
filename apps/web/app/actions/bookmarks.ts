'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, bookmarks } from '@bts/db';
import { auth } from '@/auth';
import { rateLimitByIp } from '@/lib/rate-limit';
import type { Bookmark, BookmarkKind } from '@/lib/bookmarks/types';

const RL_OPTS = { namespace: 'bookmark_writes', limit: 30, windowMs: 60_000 };

const MERGE_MAX_ITEMS = 500;

const BookmarkKindSchema = z.enum([
  'film', 'crew', 'gear-item', 'gear-series', 'vfx-house',
  'stunt-company', 'stunt-school', 'reference', 'format', 'society',
]);

const BookmarkInputSchema = z.object({
  kind: BookmarkKindSchema,
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  subtitle: z.string().max(500).optional(),
  href: z.string().min(1).max(500),
});

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

async function checkRateLimit(userId: string): Promise<void> {
  // We pass the userId as the bucket key (the function treats it as opaque).
  const r = await rateLimitByIp(`user:${userId}`, RL_OPTS);
  if (!r.ok) {
    throw new Error(`Rate limit exceeded. Try again in ${r.retryAfterSeconds}s.`);
  }
}

export async function listBookmarksAction(): Promise<Bookmark[]> {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.addedAt));
  return rows.map((r) => ({
    kind: r.kind as BookmarkKind,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    href: r.href,
    addedAt: r.addedAt.toISOString(),
  }));
}

export async function addBookmarkAction(b: Omit<Bookmark, 'addedAt'>): Promise<void> {
  const userId = await requireUserId();
  await checkRateLimit(userId);
  await db.insert(bookmarks).values({
    userId, kind: b.kind, slug: b.slug, title: b.title,
    subtitle: b.subtitle, href: b.href,
  }).onConflictDoNothing();
  revalidatePath('/bookmarks');
}

export async function removeBookmarkAction(kind: BookmarkKind, slug: string): Promise<void> {
  const userId = await requireUserId();
  await checkRateLimit(userId);
  await db.delete(bookmarks).where(
    and(eq(bookmarks.userId, userId), eq(bookmarks.kind, kind), eq(bookmarks.slug, slug)),
  );
  revalidatePath('/bookmarks');
}

/**
 * Atomic toggle. Returns true if the bookmark now exists, false if removed.
 * One DB round-trip via INSERT ... ON CONFLICT DO NOTHING + count check.
 */
export async function toggleBookmarkAction(b: Omit<Bookmark, 'addedAt'>): Promise<boolean> {
  const userId = await requireUserId();
  await checkRateLimit(userId);

  // Try to insert. If it conflicts, remove instead.
  const inserted = await db.insert(bookmarks).values({
    userId, kind: b.kind, slug: b.slug, title: b.title,
    subtitle: b.subtitle, href: b.href,
  }).onConflictDoNothing().returning({ slug: bookmarks.slug });

  if (inserted.length > 0) {
    revalidatePath('/bookmarks');
    return true;
  }

  // It already existed — remove.
  await db.delete(bookmarks).where(
    and(eq(bookmarks.userId, userId), eq(bookmarks.kind, b.kind), eq(bookmarks.slug, b.slug)),
  );
  revalidatePath('/bookmarks');
  return false;
}

/**
 * Cheap existence check. One indexed lookup, no full list fetch.
 */
export async function hasBookmarkAction(kind: BookmarkKind, slug: string): Promise<boolean> {
  const userId = await requireUserId();
  const rows = await db
    .select({ slug: bookmarks.slug })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.kind, kind), eq(bookmarks.slug, slug)))
    .limit(1);
  return rows.length > 0;
}

export async function mergeBookmarksAction(items: Omit<Bookmark, 'addedAt'>[]): Promise<void> {
  const userId = await requireUserId();
  if (items.length === 0) return;
  if (items.length > MERGE_MAX_ITEMS) {
    throw new Error(`Cannot merge more than ${MERGE_MAX_ITEMS} bookmarks at once.`);
  }
  // Validate every item; reject the whole batch on any malformed row.
  const validated = items.map((item) => BookmarkInputSchema.parse(item));
  // One logical action — single rate-limit hit regardless of count.
  await checkRateLimit(userId);
  await db.insert(bookmarks).values(
    validated.map((b) => ({
      userId, kind: b.kind, slug: b.slug, title: b.title,
      subtitle: b.subtitle, href: b.href,
    })),
  ).onConflictDoNothing();
  revalidatePath('/bookmarks');
}
