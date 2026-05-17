import type { Metadata } from 'next';
import { safeAuth } from '@/lib/safe-auth';
import { BookmarksClient } from '@/components/bookmarks/BookmarksClient';

export const metadata: Metadata = {
  title: 'Bookmarks',
  robots: { index: false, follow: false },
};

export default async function BookmarksPage() {
  const session = await safeAuth();
  const isLoggedIn = !!session?.user;
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Saved</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-100">Bookmarks</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {isLoggedIn
            ? 'Synced to your account. Available on any device you sign in from.'
            : 'Saved client-side in your browser. Sign in to sync across devices.'}
        </p>
      </header>
      <BookmarksClient isLoggedIn={isLoggedIn} />
    </div>
  );
}
