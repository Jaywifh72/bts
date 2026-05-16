'use client';
import { signOut } from 'next-auth/react';

export function SignOutLink() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-sm text-amber-400 hover:text-amber-300"
    >
      Sign out
    </button>
  );
}
