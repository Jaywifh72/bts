'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, desc } from 'drizzle-orm';
import { db, bookmarks } from '@bts/db';
import { auth } from '@/auth';
import { rateLimitByIp } from '@/lib/rate-limit';
import type { Bookmark, BookmarkKind } from '@/lib/bookmarks/types';

const RL_OPTS = { namespace: 'bookmark_writes', limit: 30, windowMs: 60_000 };

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

export async function mergeBookmarksAction(items: Omit<Bookmark, 'addedAt'>[]): Promise<void> {
  const userId = await requireUserId();
  if (items.length === 0) return;
  // One logical action — single rate-limit hit regardless of count.
  await checkRateLimit(userId);
  await db.insert(bookmarks).values(
    items.map((b) => ({
      userId, kind: b.kind, slug: b.slug, title: b.title,
      subtitle: b.subtitle, href: b.href,
    })),
  ).onConflictDoNothing();
  revalidatePath('/bookmarks');
}
