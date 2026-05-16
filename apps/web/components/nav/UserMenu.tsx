'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import type { Session } from 'next-auth';

export function UserMenu({ session }: { session: Session | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session?.user) {
    return (
      <Link
        href="/signin"
        className="text-sm text-zinc-300 hover:text-amber-400"
      >
        Sign in
      </Link>
    );
  }

  const initial = (session.user.name ?? session.user.email ?? '?')[0]!.toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-50 ring-1 ring-zinc-700 hover:ring-amber-400"
      >
        {session.user.image ? (
          <Image src={session.user.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-800 bg-zinc-900 py-1 shadow-lg"
        >
          <Link href="/account" role="menuitem" className="block px-3 py-2 text-sm text-zinc-50 hover:bg-zinc-800">
            Account
          </Link>
          <Link href="/bookmarks" role="menuitem" className="block px-3 py-2 text-sm text-zinc-50 hover:bg-zinc-800">
            My bookmarks
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="block w-full px-3 py-2 text-left text-sm text-amber-400 hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
