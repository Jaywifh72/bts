import type { Bookmark, BookmarkKind, BookmarkStore } from './types';

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

export class LocalStorageBookmarkStore implements BookmarkStore {
  async list() { return read(); }
  async has(kind: BookmarkKind, slug: string) {
    return read().some((b) => b.kind === kind && b.slug === slug);
  }
  async add(b: Omit<Bookmark, 'addedAt'>) {
    const items = read();
    if (items.some((e) => e.kind === b.kind && e.slug === b.slug)) return;
    items.unshift({ ...b, addedAt: new Date().toISOString() });
    write(items);
  }
  async remove(kind: BookmarkKind, slug: string) {
    write(read().filter((b) => !(b.kind === kind && b.slug === slug)));
  }
  async toggle(b: Omit<Bookmark, 'addedAt'>) {
    if (await this.has(b.kind, b.slug)) { await this.remove(b.kind, b.slug); return false; }
    await this.add(b); return true;
  }
}
