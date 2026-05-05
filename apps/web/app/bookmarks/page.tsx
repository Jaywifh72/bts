import type { Metadata } from 'next';
import { BookmarksClient } from '@/components/bookmarks/BookmarksClient';

export const metadata: Metadata = {
  title: 'Bookmarks',
  // No useful index value; bookmarks are per-browser.
  robots: { index: false, follow: false },
};

export default function BookmarksPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Saved</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-100">Bookmarks</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Saved client-side in your browser. Survives reloads. Cleared if
          you wipe site data or switch browsers.
        </p>
      </header>
      <BookmarksClient />
    </div>
  );
}
