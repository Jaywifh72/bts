/**
 * T5-3 — minimal client-side bookmark store backed by localStorage.
 *
 * Schema: an array of `{ kind, slug, title, addedAt }` records.
 * Kinds: 'film' | 'crew' | 'gear-item' | 'gear-series' | 'vfx-house'.
 *
 * No auth required. No server-side persistence. Survives browser
 * refreshes; lost on localStorage clear / private browsing.
 *
 * SAFE FOR SSR: every function checks for `typeof window` first and
 * returns sensible defaults on the server.
 */

const STORAGE_KEY = 'cinecanon:bookmarks:v1';

export type BookmarkKind = 'film' | 'crew' | 'gear-item' | 'gear-series' | 'vfx-house';

export type Bookmark = {
  kind: BookmarkKind;
  slug: string;
  title: string;
  /** Optional context label, e.g. "2024" or "Director of Photography". */
  subtitle?: string;
  /** Absolute path to the entity, ready to use as href. */
  href: string;
  /** ISO timestamp when bookmarked. */
  addedAt: string;
};

function read(): Bookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Bookmark[];
  } catch {
    return [];
  }
}

function write(items: Bookmark[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Notify open tabs so the heart icon stays in sync between them.
    window.dispatchEvent(new CustomEvent('cinecanon:bookmarks-changed'));
  } catch {
    // quota error etc. — silent
  }
}

export function getBookmarks(): Bookmark[] {
  return read();
}

export function isBookmarked(kind: BookmarkKind, slug: string): boolean {
  return read().some((b) => b.kind === kind && b.slug === slug);
}

export function addBookmark(b: Omit<Bookmark, 'addedAt'>): void {
  const items = read();
  if (items.some((existing) => existing.kind === b.kind && existing.slug === b.slug)) return;
  items.unshift({ ...b, addedAt: new Date().toISOString() });
  write(items);
}

export function removeBookmark(kind: BookmarkKind, slug: string): void {
  const items = read().filter((b) => !(b.kind === kind && b.slug === slug));
  write(items);
}

export function toggleBookmark(b: Omit<Bookmark, 'addedAt'>): boolean {
  if (isBookmarked(b.kind, b.slug)) {
    removeBookmark(b.kind, b.slug);
    return false;
  }
  addBookmark(b);
  return true;
}
