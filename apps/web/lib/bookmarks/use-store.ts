'use client';
import { useMemo } from 'react';
import { LocalStorageBookmarkStore } from './local-store';
import { ServerBookmarkStore } from './server-store';
import type { BookmarkStore } from './types';

export function useBookmarkStore(isLoggedIn: boolean): BookmarkStore {
  return useMemo<BookmarkStore>(
    () => (isLoggedIn ? new ServerBookmarkStore() : new LocalStorageBookmarkStore()),
    [isLoggedIn],
  );
}
