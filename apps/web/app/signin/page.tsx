import type { Metadata } from 'next';
import { SignInButtons } from './SignInButtons';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to CineCanon to save references and build lookbooks.',
};

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'That email is already linked to a different sign-in method. Use the original provider.',
  AccessDenied: 'Access denied. Try again or use a different account.',
  Configuration: 'Sign-in is temporarily unavailable. Please try again later.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl = '/', error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again.') : null;

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/40 p-8">
      <h1 className="font-serif text-3xl text-zinc-50">Sign in to CineCanon</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Save references, build lookbooks, sync across devices.
      </p>
      {errorMessage && (
        <p className="mt-4 text-sm text-amber-400" role="alert">
          {errorMessage}
        </p>
      )}
      <SignInButtons callbackUrl={callbackUrl} />
      <p className="mt-6 text-xs text-zinc-500">
        By continuing you agree to our terms. We only store your email, name, and avatar.
      </p>
    </div>
  );
}
