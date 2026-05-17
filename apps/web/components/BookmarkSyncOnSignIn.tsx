'use client';

import { useEffect } from 'react';
import { mergeBookmarksAction } from '@/app/actions/bookmarks';
import type { Bookmark } from '@/lib/bookmarks/types';

const STORAGE_KEY = 'cinecanon:bookmarks:v1';

/**
 * While logged-in, drain localStorage bookmarks into the server set,
 * then clear localStorage. Safe to re-run: server-side insert uses
 * onConflictDoNothing, and post-drain localStorage is empty.
 */
export function BookmarkSyncOnSignIn({ isLoggedIn }: { isLoggedIn: boolean }) {
  useEffect(() => {
    if (!isLoggedIn || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const local: Bookmark[] = JSON.parse(raw);
      if (!Array.isArray(local) || local.length === 0) return;
      void mergeBookmarksAction(
        local.map(({ addedAt: _addedAt, ...rest }) => rest),
      ).then(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('cinecanon:bookmarks-changed'));
      });
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  return null;
}
