import type { Bookmark, BookmarkKind, BookmarkStore } from './types';
import {
  listBookmarksAction,
  addBookmarkAction,
  removeBookmarkAction,
} from '@/app/actions/bookmarks';

export class ServerBookmarkStore implements BookmarkStore {
  async list() { return listBookmarksAction(); }
  async has(kind: BookmarkKind, slug: string) {
    return (await listBookmarksAction()).some((b) => b.kind === kind && b.slug === slug);
  }
  async add(b: Omit<Bookmark, 'addedAt'>) { await addBookmarkAction(b); }
  async remove(kind: BookmarkKind, slug: string) { await removeBookmarkAction(kind, slug); }
  async toggle(b: Omit<Bookmark, 'addedAt'>) {
    if (await this.has(b.kind, b.slug)) { await this.remove(b.kind, b.slug); return false; }
    await this.add(b); return true;
  }
}
