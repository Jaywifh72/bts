'use client';

import { signIn } from 'next-auth/react';
import { GoogleGlyph } from '@/components/icons/GoogleGlyph';
import { GitHubGlyph } from '@/components/icons/GitHubGlyph';

export function SignInButtons({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl })}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-800"
      >
        <GoogleGlyph />
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => signIn('github', { callbackUrl })}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-800"
      >
        <GitHubGlyph />
        Continue with GitHub
      </button>
    </div>
  );
}
