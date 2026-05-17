/**
 * Backwards-compat sync facade over the bookmark store. New code should
 * use `useBookmarkStore()` (added in Task 11). These wrappers stay
 * localStorage-only — they don't see server-persisted bookmarks. Once
 * all call sites switch to the hook, this file can be deleted.
 */
export type { Bookmark, BookmarkKind } from './bookmarks/types';
import type { Bookmark, BookmarkKind } from './bookmarks/types';

const STORAGE_KEY = 'cinecanon:bookmarks:v1';

function read(): Bookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
  } catch { return []; }
}

function write(items: Bookmark[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cinecanon:bookmarks-changed'));
  } catch { /* quota */ }
}

export function getBookmarks(): Bookmark[] {
  return read();
}

export function isBookmarked(kind: BookmarkKind, slug: string): boolean {
  return read().some((b) => b.kind === kind && b.slug === slug);
}

export function addBookmark(b: Omit<Bookmark, 'addedAt'>): void {
  const items = read();
  if (items.some((e) => e.kind === b.kind && e.slug === b.slug)) return;
  items.unshift({ ...b, addedAt: new Date().toISOString() });
  write(items);
}

export function removeBookmark(kind: BookmarkKind, slug: string): void {
  write(read().filter((b) => !(b.kind === kind && b.slug === slug)));
}

export function toggleBookmark(b: Omit<Bookmark, 'addedAt'>): boolean {
  if (isBookmarked(b.kind, b.slug)) { removeBookmark(b.kind, b.slug); return false; }
  addBookmark(b); return true;
}
