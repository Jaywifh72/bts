import type { Bookmark, BookmarkKind, BookmarkStore } from './types';
import {
  listBookmarksAction,
  addBookmarkAction,
  removeBookmarkAction,
  hasBookmarkAction,
  toggleBookmarkAction,
} from '@/app/actions/bookmarks';

export class ServerBookmarkStore implements BookmarkStore {
  async list() { return listBookmarksAction(); }
  async has(kind: BookmarkKind, slug: string) { return hasBookmarkAction(kind, slug); }
  async add(b: Omit<Bookmark, 'addedAt'>) { await addBookmarkAction(b); }
  async remove(kind: BookmarkKind, slug: string) { await removeBookmarkAction(kind, slug); }
  async toggle(b: Omit<Bookmark, 'addedAt'>) { return toggleBookmarkAction(b); }
}
